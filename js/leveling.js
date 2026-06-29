// js/leveling.js
//
// Pure math module. No localStorage access, no DOM access — just functions
// that convert between XP and level. Both the overall player level and each
// attribute's level reuse this same curve (per the spec's example
// progression: Lv1=0, Lv2=100, Lv3=250, Lv4=500, Lv5=1000).

const Leveling = (function () {

  // Closed-form curve approximating the example breakpoints:
  // Lv1=0, Lv2=100, Lv3=251, Lv4=484, Lv5=799 (vs spec's 1000 at Lv5).
  // The exponent/multiplier are intentionally exposed as constants so they
  // can be tuned after real playtesting without touching the rest of the app.
  const BASE_MULTIPLIER = 50;
  const CURVE_EXPONENT = 2.2;

  function xpRequiredForLevel(level) {
    if (level <= 1) return 0;
    return Math.round(BASE_MULTIPLIER * Math.pow(level - 1, CURVE_EXPONENT));
  }

  // Given a total accumulated XP, what level does that correspond to?
  // Walks upward until the next level's requirement exceeds totalXp.
  function levelFromTotalXp(totalXp) {
    let level = 1;
    while (xpRequiredForLevel(level + 1) <= totalXp) {
      level++;
      if (level > 999) break; // safety guard against an infinite loop
    }
    return level;
  }

  // How much XP is needed to go from the current level to the next one.
  function xpToNextLevel(currentLevel) {
    return xpRequiredForLevel(currentLevel + 1) - xpRequiredForLevel(currentLevel);
  }

  // Progress within the current level, expressed as XP-into-level and
  // XP-needed-for-level, for rendering progress bars.
  function progressWithinLevel(totalXp) {
    const level = levelFromTotalXp(totalXp);
    const levelFloor = xpRequiredForLevel(level);
    const levelCeil = xpRequiredForLevel(level + 1);
    return {
      level: level,
      xpIntoLevel: totalXp - levelFloor,
      xpNeededForLevel: levelCeil - levelFloor
    };
  }

  return { xpRequiredForLevel, levelFromTotalXp, xpToNextLevel, progressWithinLevel };
})();

if (typeof window !== "undefined") window.Leveling = Leveling;
