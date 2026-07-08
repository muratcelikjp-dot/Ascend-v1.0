// js/shield.js
//
// Owns the daily "shield break" ritual's HP logic. Pure state mutation,
// no DOM/animation code here — index.html handles all visual feedback
// (screen shake, particles, vibration) and just calls these functions to
// know how much damage to apply and when the shield has broken.

const Shield = (function () {

  function todayDateString() {
    return DateUtils.getLocalDateKey();
  }

  // Call on page load. If today's ritual was already completed, the
  // caller should skip straight to the quest screen instead of showing
  // the shield again.
  function isTodayAlreadyDone(state) {
    return state.shieldRitual.lastCompletedDate === todayDateString();
  }

  // Resets HP to full if this is a new day (separate from the quest
  // daily reset, since the shield ritual happens BEFORE quests are even
  // shown).
  function ensureFreshForToday(state) {
    if (state.shieldRitual.lastCompletedDate !== todayDateString()) {
      state.shieldRitual.currentHp = state.shieldRitual.maxHp;
    }
  }

  // Applies one "hit" worth of damage. Damage scales up slightly with
  // each hit so the final blow feels more dramatic and the player isn't
  // tapping 20 times for a flat-damage shield. Returns whether this hit
  // broke the shield.
  function applyHit(state, hitNumber) {
    const baseDamage = 18;
    const scaling = hitNumber * 4;
    const damage = baseDamage + scaling;

    state.shieldRitual.currentHp = Math.max(0, state.shieldRitual.currentHp - damage);

    const broken = state.shieldRitual.currentHp <= 0;
    if (broken) {
      state.shieldRitual.lastCompletedDate = todayDateString();
    }

    return { damage, broken, remainingHp: state.shieldRitual.currentHp, maxHp: state.shieldRitual.maxHp };
  }

  function getHpPercent(state) {
    return Math.round((state.shieldRitual.currentHp / state.shieldRitual.maxHp) * 100);
  }

  // Called once, exactly when the shield breaks. This intentionally mirrors
  // Quests.toggleQuest's fan-out (XP -> attribute XP -> skill unlock ->
  // boss damage -> achievements) because breaking the seal IS a real act
  // of Willpower in the game's own terms — it should not be a special
  // case that grants XP through a side door while skipping the skill tree
  // and boss systems the rest of the loop respects.
  function completeRitual(state) {
    const today = todayDateString();

    // Guard against granting rewards twice in one day. lastCompletedDate
    // alone can't be used for this check since applyHit() already sets it
    // the moment HP reaches 0, before completeRitual ever runs on a
    // legitimate first completion — a separate marker is needed to know
    // whether THIS function specifically already ran today.
    if (state.shieldRitual.rewardGrantedDate === today) {
      return {
        willpowerXp: 0, streakBonusXp: 0, totalXp: 0,
        attributeResult: { leveledUp: false }, newSkills: [],
        bossDamageDealt: 0, bossDefeated: null, newAchievements: [],
        newMilestoneTitles: [], playerLeveledUp: false, newLevel: state.level,
        alreadyGranted: true
      };
    }
    state.shieldRitual.rewardGrantedDate = today;

    const streakBonus = Math.min(50, state.streak * 2);
    const totalXp = 25 + streakBonus;
    const previousLevel = state.level;

    state.xp += totalXp;
    state.lifetimeXp += totalXp;
    state.level = Leveling.levelFromTotalXp(state.xp);
    const playerLeveledUp = state.level > previousLevel;

    const attributeResult = Attributes.applyXp(state, "willpower", 25);
    const newSkills = Skills.checkAndUnlock(state, "willpower");

    // Treat the ritual as a synthetic "quest" for boss-damage purposes,
    // since boss damage rules match on attribute + title substrings.
    const syntheticQuest = { title: "Break the daily seal", attribute: "willpower", xp: 25 };
    const bossOutcome = Bosses.applyQuestDamage(state, syntheticQuest);

    const newAchievements = Achievements.checkAll(state);
    const newMilestoneTitles = Ranks.checkMilestoneTitles(state);
    const nightOwlDef = Achievements.checkNightOwl(state);
    if (nightOwlDef) newAchievements.push(nightOwlDef);

    if (!state.dailyLog) state.dailyLog = {};
    if (!state.dailyLog[today]) state.dailyLog[today] = { xp: 0, questsCompleted: 0, questsMissed: 0 };
    state.dailyLog[today].xp += totalXp;

    return {
      willpowerXp: 25,
      streakBonusXp: streakBonus,
      totalXp,
      attributeResult,
      newSkills,
      bossDamageDealt: bossOutcome.damageDealt,
      bossDefeated: bossOutcome.defeated ? bossOutcome.bossId : null,
      newAchievements,
      newMilestoneTitles,
      playerLeveledUp,
      newLevel: state.level
    };
  }

  return { isTodayAlreadyDone, ensureFreshForToday, applyHit, completeRitual, getHpPercent, todayDateString };
})();

if (typeof window !== "undefined") window.Shield = Shield;
