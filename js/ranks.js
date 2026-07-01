// js/ranks.js
//
// Centralizes the "what is the player's title/rank right now" logic that
// used to be a duplicated CLASSES array hardcoded into both hero.html and
// quests.html, capped at 5 tiers with no progression past level 5
// (everyone above level 5 just saw "Coder Legend" forever — a real dead
// end for an active long-term player).

const Ranks = (function () {

  // Returns the rank name for a given level. For levels beyond the last
  // named tier in seed data, generates a procedural numbered tier
  // ("Coder Ascendant II", "III", ...) every 5 levels, so there is always
  // a next rank to reach no matter how high level climbs.
  function getRankForLevel(level) {
    const ranks = SEED_DATA.ranks;
    let matched = ranks[0];
    for (const r of ranks) {
      if (level >= r.minLevel) matched = r;
    }

    const lastTier = ranks[ranks.length - 1];
    if (level < lastTier.minLevel + 5) return matched.name;

    const tiersBeyond = Math.floor((level - lastTier.minLevel) / 5);
    const numeral = toRomanNumeral(tiersBeyond + 1);
    return lastTier.name + " " + numeral;
  }

  function toRomanNumeral(n) {
    const map = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let result = "";
    let remaining = n;
    for (const [value, symbol] of map) {
      while (remaining >= value) { result += symbol; remaining -= value; }
    }
    return result || "I";
  }

  // Checks milestone title conditions against current state, unlocking
  // any newly-qualified titles. Mirrors the achievement-checking pattern:
  // generic condition-reading rather than one bespoke function per title,
  // so adding a new milestone title is a data-only change.
  function checkMilestoneTitles(state) {
    const newlyUnlocked = [];
    if (!state.milestoneTitlesEarned) state.milestoneTitlesEarned = [];

    SEED_DATA.milestoneTitles.forEach(def => {
      if (state.milestoneTitlesEarned.includes(def.id)) return;

      let currentValue;
      if (def.condition.type === "level") currentValue = state.level;
      else if (def.condition.type === "achievementCount") currentValue = state.achievements.unlocked.length;
      else if (def.condition.type === "bossCount") currentValue = state.bosses.defeated.length;
      else return;

      if (currentValue >= def.condition.threshold) {
        state.milestoneTitlesEarned.push(def.id);
        newlyUnlocked.push(def);
      }
    });

    return newlyUnlocked;
  }

  // Returns every title the player currently holds — boss-defeat titles
  // and milestone titles combined — for display on the hero card.
  function getAllEarnedTitles(state) {
    const bossTitles = (state.bosses.titlesEarned || []).map(name => ({ name, source: "boss" }));
    const milestoneTitles = (state.milestoneTitlesEarned || [])
      .map(id => SEED_DATA.milestoneTitles.find(t => t.id === id))
      .filter(Boolean)
      .map(def => ({ name: def.name, source: "milestone" }));
    return [...bossTitles, ...milestoneTitles];
  }

  return { getRankForLevel, checkMilestoneTitles, getAllEarnedTitles };
})();

if (typeof window !== "undefined") window.Ranks = Ranks;
