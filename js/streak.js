// js/streak.js
//
// Owns streak incrementing and the discipline-decay penalty. Call
// evaluateDailyStreak(state) once per day (naturally happens inside
// Quests.ensureDailyReset's caller — see integration in each page) AFTER
// the previous day has been logged into planning.missedDayLog.
//
// Penalty rule (per the earlier agreed design, carried forward into this
// build since the new prompt doesn't override it): missing 2 consecutive
// days resets the streak, deducts a flat XP penalty, and drops the most
// relevant attribute levels (Willpower and Discipline) by one level each.

const Streak = (function () {

  const PENALTY_XP = 120;
  const PENALTY_CONSECUTIVE_DAYS = 2;
  const PENALTY_ATTRIBUTES = ["willpower", "discipline"];

  // Looks at the most recent entries in missedDayLog to count how many
  // consecutive days (ending yesterday) were fully missed.
  function countConsecutiveMisses(state) {
    const dates = Object.keys(state.planning.missedDayLog).sort().reverse();
    let consecutive = 0;
    for (const date of dates) {
      if (state.planning.missedDayLog[date] === true) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  // Call once per day, after Quests.ensureDailyReset has logged yesterday's
  // outcome. Increments streak on a successful day, or applies the penalty
  // and resets streak if the consecutive-miss threshold is reached.
  // Returns a result object describing what happened, for the UI to show
  // a "progress lost" summary if a penalty fired.
  function evaluateDailyStreak(state) {
    const today = DateUtils.getLocalDateKey();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = DateUtils.getLocalDateKey(yesterdayDate);
    const yesterdayMissed = state.planning.missedDayLog[yesterday];

    if (yesterdayMissed === undefined) {
      // No record for yesterday (e.g. very first day of use) — nothing to evaluate yet.
      return { penaltyApplied: false, streakChanged: false };
    }

    const consecutiveMisses = countConsecutiveMisses(state);

    if (consecutiveMisses >= PENALTY_CONSECUTIVE_DAYS) {
      const oldStreak = state.streak;
      state.streak = 0;
      state.achievements._hadPenaltyEver = true;

      state.xp = Math.max(0, state.xp - PENALTY_XP);
      state.level = Leveling.levelFromTotalXp(state.xp);

      const attributeDrops = PENALTY_ATTRIBUTES.map(attrId => {
        const before = state.attributes[attrId].level;
        // To guarantee an actual level drop (not just in-level XP loss),
        // remove enough XP to fall below the current level's threshold,
        // with a minimum penalty floor so this still bites even at level 1.
        const currentLevelFloor = Leveling.xpRequiredForLevel(before);
        const amountToRemove = Math.max(state.attributes[attrId].xp - currentLevelFloor + 1, 50);
        Attributes.removeXp(state, attrId, amountToRemove);
        const after = state.attributes[attrId].level;
        return { attribute: attrId, before, after };
      });

      return {
        penaltyApplied: true,
        streakChanged: true,
        oldStreak,
        newStreak: 0,
        xpLost: PENALTY_XP,
        attributeDrops
      };
    }

    if (!yesterdayMissed) {
      state.streak += 1;
      return { penaltyApplied: false, streakChanged: true, newStreak: state.streak };
    }

    return { penaltyApplied: false, streakChanged: false };
  }

  function getStreakStatus(state) {
    const consecutiveMisses = countConsecutiveMisses(state);
    if (consecutiveMisses >= PENALTY_CONSECUTIVE_DAYS) return "penalty_triggered";
    if (consecutiveMisses === 1) return "warning";
    return "on_track";
  }

  return { evaluateDailyStreak, countConsecutiveMisses, getStreakStatus, PENALTY_XP, PENALTY_ATTRIBUTES };
})();

if (typeof window !== "undefined") window.Streak = Streak;
