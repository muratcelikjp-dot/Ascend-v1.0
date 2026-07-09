const GameState = (function () {
  const STORAGE_KEY = "rpg_state";
  const CORRUPT_BACKUP_PREFIX = STORAGE_KEY + "_corrupt_backup_";
  let subscribers = [];

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function buildFreshState() {
    const fresh = deepClone(SEED_DATA.defaultState);
    const firstBoss = SEED_DATA.bosses[fresh.bosses.currentBossId];
    fresh.bosses.currentHp = firstBoss ? firstBoss.maxHp : 0;
    return fresh;
  }

  function migrateIfNeeded(state) {
    if (!state.version || state.version < SEED_DATA.defaultState.version) {
      state.version = SEED_DATA.defaultState.version;
    }
    if (!state.dailyLog) state.dailyLog = {};
    if (!state.planning) state.planning = deepClone(SEED_DATA.defaultState.planning);
    if (!state.planning.dayReports) state.planning.dayReports = {};
    if (state.planning.tomorrowTargetXp === undefined) state.planning.tomorrowTargetXp = null;
    if (state.planning.tomorrowTargetAttribute === undefined) state.planning.tomorrowTargetAttribute = null;
    if (!state.shieldRitual) state.shieldRitual = deepClone(SEED_DATA.defaultState.shieldRitual);
    if (state.shieldRitual.rewardGrantedDate === undefined) state.shieldRitual.rewardGrantedDate = null;
    if (!state.bosses.titlesEarned) state.bosses.titlesEarned = [];
    if (!state.bosses.damageHistory) state.bosses.damageHistory = {};
    if (state.rewards && typeof state.rewards.totalXpSpent !== "number") state.rewards.totalXpSpent = 0;
    if (!state.milestoneTitlesEarned) state.milestoneTitlesEarned = [];
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
    return migrateIfNeeded(state);
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
