const GameState = (function () {
  const STORAGE_KEY = "rpg_state";
  const CORRUPT_BACKUP_PREFIX = STORAGE_KEY + "_corrupt_backup_";
  const ATTRIBUTE_SCHEMA_VERSION = 2;
  let subscribers = [];
  let volatileState = null;
  let persistenceUnavailable = false;
  let storageFailureReported = false;

  const LEGACY_ATTRIBUTE_MAP = {
    discipline: { target: "willpower", tag: "discipline" },
    creativity: { target: "intelligence", tag: "creativity" }
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function buildFreshState() {
    const fresh = deepClone(SEED_DATA.defaultState);
    const firstBoss = SEED_DATA.bosses[fresh.bosses.currentBossId];
    fresh.bosses.currentHp = firstBoss ? firstBoss.maxHp : 0;
    fresh.bosses.dominance = firstBoss ? firstBoss.startingDominance : 0;
    fresh.bosses.lastDominanceUpdatedAt = Date.now();
    fresh.bosses.encounterStartedAt = Date.now();
    return fresh;
  }

  function remapAttributeId(attributeId) {
    const mapping = LEGACY_ATTRIBUTE_MAP[attributeId];
    return mapping ? mapping.target : attributeId;
  }

  function migrateQuest(quest) {
    if (!quest || typeof quest !== "object") return;
    const mapping = LEGACY_ATTRIBUTE_MAP[quest.attribute];
    const tags = Array.isArray(quest.tags) ? quest.tags.slice() : [];

    if (mapping) {
      quest.attribute = mapping.target;
      tags.push(mapping.tag);
    }

    quest.tags = [...new Set(tags)];
  }

  function normalizeQuestTypes(state) {
    let activeMainSeen = false;
    (state.quests && Array.isArray(state.quests.active) ? state.quests.active : []).forEach(quest => {
      if (!quest || typeof quest !== "object") return;
      const isRoutine = quest.questType === "routine" || String(quest.id || "").startsWith("fixed_");
      const isMinimum = quest.questType === "minimum" || quest.isMinimumQuest === true;
      const wantsMain = quest.questType === "main" || quest.priority === "high";

      if (isRoutine) {
        quest.questType = "routine";
      } else if (isMinimum) {
        quest.questType = "minimum";
        quest.isMinimumQuest = true;
        if (quest.priority === "high") quest.priority = "normal";
      } else if (wantsMain && !activeMainSeen) {
        quest.questType = "main";
        quest.priority = "high";
        activeMainSeen = true;
      } else {
        quest.questType = "side";
        if (quest.priority === "high") quest.priority = "normal";
      }
    });

    let plannedMainSeen = false;
    const tomorrowGoals = state.planning && Array.isArray(state.planning.tomorrowGoals)
      ? state.planning.tomorrowGoals
      : [];
    tomorrowGoals.forEach(goal => {
      if (!goal || typeof goal !== "object") return;
      const wantsMain = goal.questType === "main" || goal.priority === "high";
      if (wantsMain && !plannedMainSeen) {
        goal.questType = "main";
        goal.priority = "high";
        plannedMainSeen = true;
      } else {
        goal.questType = "side";
        if (goal.priority === "high") goal.priority = "normal";
      }
    });
  }

  function mergeLegacyAttribute(state, sourceId, targetId) {
    const source = state.attributes[sourceId];
    if (!source) return;

    if (!state.attributes[targetId]) {
      state.attributes[targetId] = deepClone(SEED_DATA.defaultState.attributes[targetId]);
    }

    const target = state.attributes[targetId];
    target.xp = (Number(target.xp) || 0) + (Number(source.xp) || 0);
    target.lifetimeXp = (Number(target.lifetimeXp) || 0) + (Number(source.lifetimeXp) || 0);
    target.level = Leveling.progressWithinLevel(target.xp).level;
    delete state.attributes[sourceId];
  }

  function migrateFourAttributeModel(state) {
    if (!state.attributes) state.attributes = deepClone(SEED_DATA.defaultState.attributes);

    mergeLegacyAttribute(state, "discipline", "willpower");
    mergeLegacyAttribute(state, "creativity", "intelligence");

    if (state.quests && Array.isArray(state.quests.active)) {
      state.quests.active.forEach(migrateQuest);
    }

    if (state.planning) {
      state.planning.tomorrowTargetAttribute = remapAttributeId(state.planning.tomorrowTargetAttribute);
      state.planning._activeTargetAttribute = remapAttributeId(state.planning._activeTargetAttribute);

      Object.values(state.planning.dayReports || {}).forEach(report => {
        if (report) report.targetAttribute = remapAttributeId(report.targetAttribute);
      });
    }

    Object.values(state.dailyLog || {}).forEach(log => {
      if (!log || !log.attributeXp) return;
      const attributeXp = log.attributeXp;
      attributeXp.willpower = (attributeXp.willpower || 0) + (attributeXp.discipline || 0);
      attributeXp.intelligence = (attributeXp.intelligence || 0) + (attributeXp.creativity || 0);
      delete attributeXp.discipline;
      delete attributeXp.creativity;
    });

    if (!state.skills) state.skills = { unlocked: [], legacyUnlocked: [] };
    if (!Array.isArray(state.skills.unlocked)) state.skills.unlocked = [];
    if (!Array.isArray(state.skills.legacyUnlocked)) state.skills.legacyUnlocked = [];
    const legacySkillIds = state.skills.unlocked.filter(id => id.startsWith("disc_") || id.startsWith("cre_"));
    state.skills.legacyUnlocked = [...new Set([...state.skills.legacyUnlocked, ...legacySkillIds])];
    state.skills.unlocked = state.skills.unlocked.filter(id => !legacySkillIds.includes(id));
  }

  function migrateIfNeeded(state) {
    const currentVersion = Number(state.version) || 0;
    if (currentVersion < ATTRIBUTE_SCHEMA_VERSION) migrateFourAttributeModel(state);
    state.version = SEED_DATA.defaultState.version;
    if (!state.dailyLog) state.dailyLog = {};
    if (!state.dailyState || typeof state.dailyState !== "object" || Array.isArray(state.dailyState)) {
      state.dailyState = deepClone(SEED_DATA.defaultState.dailyState);
    }
    if (!state.dailyState.checkIns || typeof state.dailyState.checkIns !== "object" || Array.isArray(state.dailyState.checkIns)) {
      state.dailyState.checkIns = {};
    }
    if (!state.activeEffects || typeof state.activeEffects !== "object" || Array.isArray(state.activeEffects)) {
      state.activeEffects = deepClone(SEED_DATA.defaultState.activeEffects);
    }
    if (!Array.isArray(state.activeEffects.active)) state.activeEffects.active = [];
    if (!state.proofs || typeof state.proofs !== "object" || Array.isArray(state.proofs)) {
      state.proofs = deepClone(SEED_DATA.defaultState.proofs);
    }
    if (!Array.isArray(state.proofs.records)) state.proofs.records = [];
    if (!state.goals || typeof state.goals !== "object") state.goals = deepClone(SEED_DATA.defaultState.goals);
    if (!Array.isArray(state.goals.selected)) state.goals.selected = [];
    if (!state.goals.details || typeof state.goals.details !== "object" || Array.isArray(state.goals.details)) state.goals.details = {};
    if (typeof state.goals.onboardingComplete !== "boolean") state.goals.onboardingComplete = false;
    if (typeof state.goals.suggestionsAccepted !== "boolean") state.goals.suggestionsAccepted = false;
    if (typeof state.goals.lastSuggestionDate !== "string") state.goals.lastSuggestionDate = null;
    if (!state.planning) state.planning = deepClone(SEED_DATA.defaultState.planning);
    if (!state.planning.dayReports) state.planning.dayReports = {};
    if (state.planning.tomorrowTargetXp === undefined) state.planning.tomorrowTargetXp = null;
    if (state.planning.tomorrowTargetAttribute === undefined) state.planning.tomorrowTargetAttribute = null;
    normalizeQuestTypes(state);
    if (!state.shieldRitual) state.shieldRitual = deepClone(SEED_DATA.defaultState.shieldRitual);
    if (!state.bosses) state.bosses = deepClone(SEED_DATA.defaultState.bosses);
    if (!state.bosses.titlesEarned) state.bosses.titlesEarned = [];
    if (!state.bosses.damageHistory) state.bosses.damageHistory = {};
    if (!state.bosses.contracts || typeof state.bosses.contracts !== "object") state.bosses.contracts = {};
    if (!Array.isArray(state.bosses.missionHistory)) state.bosses.missionHistory = [];
    if (!state.bosses.weakPointStates || typeof state.bosses.weakPointStates !== "object") state.bosses.weakPointStates = {};
    if (state.bosses.activeMission === undefined) state.bosses.activeMission = null;
    if (state.bosses.encounterStatus !== "active" && state.bosses.encounterStatus !== "retreated") state.bosses.encounterStatus = "active";
    if (!Number.isInteger(state.bosses.encounterAttempt) || state.bosses.encounterAttempt < 1) state.bosses.encounterAttempt = 1;
    if (!Number.isFinite(Number(state.bosses.encounterStartedAt))) state.bosses.encounterStartedAt = Date.now();
    if (!Array.isArray(state.bosses.encounterLosses)) state.bosses.encounterLosses = [];
    if (state.bosses.encounterDefeatedAt === undefined) state.bosses.encounterDefeatedAt = null;
    if (state.bosses.retreatedAt === undefined) state.bosses.retreatedAt = null;
    if (state.bosses.rematchAvailableDate === undefined) state.bosses.rematchAvailableDate = null;
    const pendingDefeatExists = state.bosses.encounterLosses.some(loss => loss && loss.id === state.bosses.pendingDefeatNoticeId);
    if (!pendingDefeatExists) state.bosses.pendingDefeatNoticeId = null;
    if (state.bosses.activeMission) {
      const mission = state.bosses.activeMission;
      const isValidActiveMission = typeof mission === "object"
        && mission.status === "active"
        && typeof mission.id === "string"
        && typeof mission.bossId === "string"
        && typeof mission.weakPointId === "string"
        && Number.isFinite(Number(mission.deadlineAt));
      if (!isValidActiveMission) state.bosses.activeMission = null;
    }
    const unresolvedExpiredMission = state.bosses.missionHistory.find(mission => mission && mission.status === "expired" && !mission.failureReason);
    const savedPendingFailure = state.bosses.missionHistory.find(mission => mission && mission.id === state.bosses.pendingFailureReasonMissionId && mission.status === "expired" && !mission.failureReason);
    state.bosses.pendingFailureReasonMissionId = savedPendingFailure
      ? savedPendingFailure.id
      : (unresolvedExpiredMission ? unresolvedExpiredMission.id : null);

    // Preserve completed legacy Boss Contracts as broken weak points. The
    // old contract data remains untouched for compatibility and history.
    if (state.bosses.legacyContractsMigrated !== true) {
      Object.entries(state.bosses.contracts).forEach(([bossId, contracts]) => {
        if (!contracts || typeof contracts !== "object") return;
        Object.entries(contracts).forEach(([weakPointId, contract]) => {
          if (!contract || !contract.completed) return;
          if (!state.bosses.weakPointStates[bossId]) state.bosses.weakPointStates[bossId] = {};
          state.bosses.weakPointStates[bossId][weakPointId] = "broken";
        });
      });
      state.bosses.legacyContractsMigrated = true;
    }
    if (state.rewards && typeof state.rewards.totalXpSpent !== "number") state.rewards.totalXpSpent = 0;
    if (!state.milestoneTitlesEarned) state.milestoneTitlesEarned = [];
    if (!state.skills) state.skills = deepClone(SEED_DATA.defaultState.skills);
    if (!Array.isArray(state.skills.legacyUnlocked)) state.skills.legacyUnlocked = [];
    if (!state.prestige) state.prestige = deepClone(SEED_DATA.defaultState.prestige);
    if (typeof state.prestige.count !== "number") state.prestige.count = 0;
    if (typeof state.prestige.permanentXpBonus !== "number") state.prestige.permanentXpBonus = 0;

    // Self-heal a stale currentBossId: if it points to a boss that no
    // longer exists in the current SEED_DATA.bosses roster (e.g. content
    // was renamed/removed since this save was created), a null boss
    // lookup would otherwise silently show a misleading "campaign
    // complete" screen even though the player hasn't actually finished.
    // Resetting to the first boss in the campaign is the safer recovery.
    if (state.bosses.currentBossId && !SEED_DATA.bosses[state.bosses.currentBossId]) {
      const allBossIds = Object.keys(SEED_DATA.bosses);
      const pointedTo = new Set(allBossIds.map(id => SEED_DATA.bosses[id].nextBossId).filter(Boolean));
      const firstBossId = allBossIds.find(id => !pointedTo.has(id)) || allBossIds[0];

      // Walk the chain from the true start, skipping anything already in
      // state.bosses.defeated, so a player who'd already beaten several
      // bosses isn't unfairly forced to re-fight them after this heal.
      let healedId = firstBossId;
      const defeatedSet = new Set(state.bosses.defeated || []);
      while (defeatedSet.has(healedId) && SEED_DATA.bosses[healedId].nextBossId) {
        healedId = SEED_DATA.bosses[healedId].nextBossId;
      }

      state.bosses.currentBossId = healedId;
      state.bosses.currentHp = SEED_DATA.bosses[healedId].maxHp;
    }

    const currentBossDef = SEED_DATA.bosses[state.bosses.currentBossId] || null;
    const savedBossHp = Number(state.bosses.currentHp);
    if (!currentBossDef) {
      state.bosses.currentHp = 0;
    } else if (state.bosses.currentHp === null || !Number.isFinite(savedBossHp)) {
      state.bosses.currentHp = currentBossDef.maxHp;
    } else {
      state.bosses.currentHp = Math.max(0, Math.min(currentBossDef.maxHp, savedBossHp));
    }
    const savedDominance = Number(state.bosses.dominance);
    if (state.bosses.dominance === null || !Number.isFinite(savedDominance)) {
      state.bosses.dominance = currentBossDef ? currentBossDef.startingDominance : 0;
    } else {
      state.bosses.dominance = Math.max(0, Math.min(100, savedDominance));
    }
    if (state.bosses.lastDominanceUpdatedAt === null || !Number.isFinite(Number(state.bosses.lastDominanceUpdatedAt))) {
      // Existing saves begin tracking from migration time so installing
      // this feature never creates a retroactive inactivity penalty.
      state.bosses.lastDominanceUpdatedAt = Date.now();
    }

    return state;
  }

  function readRaw() {
    if (persistenceUnavailable && volatileState) return deepClone(volatileState);

    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      persistenceUnavailable = true;
      reportStorageFailure("read", e);
      return volatileState ? deepClone(volatileState) : null;
    }

    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("GameState: corrupted save detected, resetting.", e);
      preserveCorruptRaw(raw);
      return null;
    }
  }

  function reportStorageFailure(operation, error) {
    if (storageFailureReported) return;
    storageFailureReported = true;
    console.error(
      "GameState: localStorage " + operation + " failed; progress will remain available only for this session.",
      error
    );
  }

  function preserveCorruptRaw(raw) {
    try {
      const timestamp = Date.now();
      let key = CORRUPT_BACKUP_PREFIX + timestamp;
      let suffix = 1;

      while (localStorage.getItem(key) !== null) {
        key = CORRUPT_BACKUP_PREFIX + timestamp + "_" + suffix;
        suffix += 1;
      }

      localStorage.setItem(key, raw);
    } catch (e) {
      console.error("GameState: failed to preserve corrupted save backup.", e);
    }
  }

  function writeRaw(state) {
    const serialized = JSON.stringify(state);
    volatileState = JSON.parse(serialized);

    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      persistenceUnavailable = false;
      storageFailureReported = false;
      return true;
    } catch (e) {
      persistenceUnavailable = true;
      reportStorageFailure("write", e);
      return false;
    }
  }

  function notify(state) {
    subscribers.forEach(cb => {
      try { cb(state); } catch (e) { console.error("GameState subscriber threw:", e); }
    });
  }

  function get() {
    let state = readRaw();
    if (!state) {
      state = buildFreshState();
      writeRaw(state);
      return state;
    }
    const previousVersion = Number(state.version) || 0;
    state = migrateIfNeeded(state);
    if (previousVersion < SEED_DATA.defaultState.version) writeRaw(state);
    return state;
  }

  // partialUpdate may be a plain object (shallow-merged into the root) or
  // a function (state) => void that mutates the loaded state directly.
  // Function form is what every feature module (quests.js, bosses.js, etc.)
  // uses, since most updates are deep (state.attributes.willpower.xp += n)
  // and a shallow merge can't express that.
  function set(partialUpdate) {
    const state = get();

    if (typeof partialUpdate === "function") {
      partialUpdate(state);
    } else if (partialUpdate && typeof partialUpdate === "object") {
      Object.assign(state, partialUpdate);
    }

    writeRaw(state);
    notify(state);
    return state;
  }

  function reset() {
    const fresh = buildFreshState();
    writeRaw(fresh);
    notify(fresh);
    return fresh;
  }

  function validateImport(candidate) {
    if (!isPlainObject(candidate)) {
      return { ok: false, error: "Backup game data is invalid." };
    }

    const version = Number(candidate.version);
    const hasRequiredSections =
      Number.isFinite(version) && version > 0 &&
      isPlainObject(candidate.attributes) &&
      isPlainObject(candidate.quests) &&
      Array.isArray(candidate.quests.active) &&
      isPlainObject(candidate.bosses) &&
      isPlainObject(candidate.planning);

    if (!hasRequiredSections) {
      return { ok: false, error: "Backup game data is incomplete." };
    }

    try {
      const state = migrateIfNeeded(deepClone(candidate));
      return { ok: true, state };
    } catch (error) {
      console.error("GameState: backup validation failed.", error);
      return { ok: false, error: "Backup game data could not be read." };
    }
  }

  function exportState() {
    return deepClone(get());
  }

  function importState(candidate) {
    const validation = validateImport(candidate);
    if (!validation.ok) return validation;
    const previousState = deepClone(get());

    if (!writeRaw(validation.state)) {
      volatileState = previousState;
      return { ok: false, error: "Restored data could not be saved on this device." };
    }

    notify(validation.state);
    return { ok: true, state: deepClone(validation.state) };
  }

  function subscribe(callback) {
    subscribers.push(callback);
    return function unsubscribe() {
      subscribers = subscribers.filter(cb => cb !== callback);
    };
  }

  return { get, set, reset, subscribe, validateImport, exportState, importState };
})();

if (typeof window !== "undefined") window.GameState = GameState;
