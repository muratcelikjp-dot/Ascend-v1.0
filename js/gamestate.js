const GameState = (function () {
  const STORAGE_KEY = "rpg_state";
  const CORRUPT_BACKUP_PREFIX = STORAGE_KEY + "_corrupt_backup_";
  const ATTRIBUTE_SCHEMA_VERSION = 2;
  let subscribers = [];

  const LEGACY_ATTRIBUTE_MAP = {
    discipline: { target: "willpower", tag: "discipline" },
    creativity: { target: "intelligence", tag: "creativity" }
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function buildFreshState() {
    const fresh = deepClone(SEED_DATA.defaultState);
    const firstBoss = SEED_DATA.bosses[fresh.bosses.currentBossId];
    fresh.bosses.currentHp = firstBoss ? firstBoss.maxHp : 0;
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
    if (!state.planning) state.planning = deepClone(SEED_DATA.defaultState.planning);
    if (!state.planning.dayReports) state.planning.dayReports = {};
    if (state.planning.tomorrowTargetXp === undefined) state.planning.tomorrowTargetXp = null;
    if (state.planning.tomorrowTargetAttribute === undefined) state.planning.tomorrowTargetAttribute = null;
    if (!state.shieldRitual) state.shieldRitual = deepClone(SEED_DATA.defaultState.shieldRitual);
    if (!state.bosses.titlesEarned) state.bosses.titlesEarned = [];
    if (!state.bosses.damageHistory) state.bosses.damageHistory = {};
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

    return state;
  }

  function readRaw() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("GameState: corrupted save detected, resetting.", e);
      preserveCorruptRaw(raw);
      return null;
    }
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  function subscribe(callback) {
    subscribers.push(callback);
    return function unsubscribe() {
      subscribers = subscribers.filter(cb => cb !== callback);
    };
  }

  return { get, set, reset, subscribe };
})();

if (typeof window !== "undefined") window.GameState = GameState;
