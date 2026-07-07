// js/prestige.js
//
// Prestige is a deliberate, opt-in reset: the player trades their current
// level/xp for a permanent XP multiplier that stacks with every future
// prestige. This is what gives a level-30+ player a reason to keep
// playing instead of hitting a ceiling — every prestige makes future
// leveling faster, and prestige count itself becomes a visible long-term
// status marker (see getPrestigeTitle).
//
// Critically, prestiging does NOT touch: skills.unlocked, achievements.unlocked,
// bosses.defeated, milestoneTitlesEarned, rewards.custom/purchased, or
// dailyLog history. Those represent permanent character identity and
// history — resetting them would undermine the entire "your growth is
// real and lasting" premise the rest of the app is built on. Only level,
// xp, and lifetimeXp-derived progress reset; attribute levels also reset,
// since attributes are the thing prestige is fundamentally "re-leveling."

const Prestige = (function () {

  function canPrestige(state) {
    return state.level >= SEED_DATA.prestigeConfig.levelThreshold;
  }

  function getCurrentBonus(state) {
    return state.prestige.permanentXpBonus;
  }

  // Performs the actual prestige reset. Returns null if the player hasn't
  // reached the threshold (callers should check canPrestige first and not
  // rely on this to silently no-op, but it guards anyway since this is a
  // destructive, one-way action).
  function doPrestige(state) {
    if (!canPrestige(state)) return null;

    const previousLevel = state.level;
    const previousPrestigeCount = state.prestige.count;

    state.prestige.count += 1;
    state.prestige.permanentXpBonus += SEED_DATA.prestigeConfig.xpBonusPerPrestige;

    state.level = 1;
    state.xp = 0;
    // lifetimeXp intentionally NOT reset — it's a permanent all-time
    // counter used by achievements like "Veteran," and prestiging is a
    // strategic choice, not something that should erase historical stats.

    Object.keys(state.attributes).forEach(attrId => {
      state.attributes[attrId].xp = 0;
      state.attributes[attrId].level = 1;
      // attribute lifetimeXp also preserved, same reasoning as above.
    });

    // Check achievements/titles right after prestige.count changes, since
    // "Reborn" and "Cycle Breaker" are defined against prestige.count and
    // would otherwise never be evaluated by anything — prestiging doesn't
    // go through Quests.toggleQuest's normal achievement-check step.
    const newAchievements = Achievements.checkAll(state);
    const newMilestoneTitles = Ranks.checkMilestoneTitles(state);

    return {
      previousLevel,
      newPrestigeCount: state.prestige.count,
      newBonus: state.prestige.permanentXpBonus,
      leveledFrom: previousLevel,
      newAchievements,
      newMilestoneTitles
    };
  }

  // Returns a display title reflecting prestige count, for the hero card.
  // Not in SEED_DATA since it's purely a formatting function, not content.
  function getPrestigeTitle(state) {
    const count = state.prestige.count;
    if (count <= 0) return null;
    if (count === 1) return "Prestige I";
    if (count === 2) return "Prestige II";
    if (count === 3) return "Prestige III";
    return "Prestige " + count;
  }

  return { canPrestige, getCurrentBonus, doPrestige, getPrestigeTitle };
})();

if (typeof window !== "undefined") window.Prestige = Prestige;
