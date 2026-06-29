// js/achievements.js
//
// Achievements are defined in seed-data.js as plain data: a dot-path into
// the state object (e.g. "attributes.intelligence.lifetimeXp") and a
// threshold. This module just reads that path generically and unlocks the
// achievement when the threshold is met. The reason this matters: adding
// "Win 10 boss fights" later means adding one object to seed-data.js,
// not writing a new checkXyzAchievement() function here.

const Achievements = (function () {

  function readPath(state, path) {
    return path.split(".").reduce((obj, key) => (obj == null ? undefined : obj[key]), state);
  }

  // Runs every COUNTER-type achievement definition against current state.
  // Event-type achievements (secret ones triggered by a specific moment,
  // not a running total) are checked separately via the explicit trigger
  // functions below, since "did this exact thing just happen" doesn't fit
  // the generic threshold-comparison model counters use.
  function checkAll(state) {
    const newlyUnlocked = [];

    SEED_DATA.achievements.forEach(def => {
      if (state.achievements.unlocked.includes(def.id)) return; // already have it
      if (def.type !== "counter") return; // event-type handled elsewhere

      const currentValue = readPath(state, def.stat) || 0;
      state.achievements.progress[def.id] = currentValue;

      if (currentValue >= def.threshold) {
        state.achievements.unlocked.push(def.id);
        newlyUnlocked.push(def);
      }
    });

    return newlyUnlocked;
  }

  // Generic helper for event-type achievements: unlocks by id if not
  // already unlocked, returns the def if it was newly unlocked (so the
  // caller can show a toast), or null if it was already unlocked.
  function unlockEvent(state, achievementId) {
    if (state.achievements.unlocked.includes(achievementId)) return null;
    const def = SEED_DATA.achievements.find(a => a.id === achievementId);
    if (!def) return null;
    state.achievements.unlocked.push(achievementId);
    return def;
  }

  // "Night Owl" — break the daily seal after midnight (00:00-04:59 local
  // time, treated as "still up way too late" rather than "early riser").
  // Called from index.html at the exact moment the shield breaks.
  function checkNightOwl(state) {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      return unlockEvent(state, "secret_night_owl");
    }
    return null;
  }

  // "The Comeback" — rebuild a streak to 7 after a penalty previously
  // reset it to 0. Requires tracking whether a penalty has ever fired,
  // which Streak.evaluateDailyStreak already marks via
  // state.streak (we additionally track a flag the first time a penalty
  // hits, so this can later detect the climb back up).
  function checkComeback(state) {
    if (state.streak >= 7 && state.achievements._hadPenaltyEver) {
      return unlockEvent(state, "secret_comeback");
    }
    return null;
  }

  function getUnlocked(state) {
    return state.achievements.unlocked.map(id => SEED_DATA.achievements.find(a => a.id === id)).filter(Boolean);
  }

  function getProgress(state, achievementId) {
    const def = SEED_DATA.achievements.find(a => a.id === achievementId);
    if (!def || def.type !== "counter") return null;
    const current = readPath(state, def.stat) || 0;
    return { current, threshold: def.threshold, pct: Math.min(100, Math.round((current / def.threshold) * 100)) };
  }

  // Returns the full roster annotated with unlock status, respecting the
  // `secret` flag — locked secret achievements come back with their
  // name/description redacted so the gallery screen can show "???"
  // instead of spoiling what triggers them.
  function getGallery(state) {
    return SEED_DATA.achievements.map(def => {
      const unlocked = state.achievements.unlocked.includes(def.id);
      const isHiddenSecret = def.secret && !unlocked;
      return {
        id: def.id,
        category: def.category,
        icon: isHiddenSecret ? "ti-help-circle" : def.icon,
        name: isHiddenSecret ? "???" : def.name,
        description: isHiddenSecret ? "Secret achievement — keep playing to discover it." : def.description,
        unlocked,
        secret: !!def.secret,
        progress: def.type === "counter" ? getProgress(state, def.id) : null
      };
    });
  }

  return { checkAll, unlockEvent, checkNightOwl, checkComeback, getUnlocked, getProgress, getGallery };
})();

if (typeof window !== "undefined") window.Achievements = Achievements;
