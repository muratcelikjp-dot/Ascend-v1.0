const GameState = (function () {
  const STORAGE_KEY = "rpg_state";
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
    if (!state.bosses.titlesEarned) state.bosses.titlesEarned = [];
    if (!state.bosses.damageHistory) state.bosses.damageHistory = {};
    if (state.rewards && typeof state.rewards.totalXpSpent !== "number") state.rewards.totalXpSpent = 0;
    return state;
  }

  function readRaw() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("GameState: corrupted save detected, resetting.", e);
      return null;
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
