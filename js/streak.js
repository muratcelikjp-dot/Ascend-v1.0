// js/streak.js
//
// Owns streak incrementing and the discipline-decay penalty. Call
// evaluateDailyStreak(state) after Quests.ensureDailyReset has logged the
// date records that need evaluation.

const Streak = (function () {

  const PENALTY_XP = 120;
  const PENALTY_CONSECUTIVE_DAYS = 2;
  const PENALTY_ATTRIBUTES = ["willpower", "discipline"];

  // Counts calendar-contiguous missed days ending at endDateKey. If no
  // end date is supplied, it uses the most recent logged date.
  function countConsecutiveMisses(state, endDateKey) {
    const log = state.planning.missedDayLog;
    let dateKey = endDateKey || Object.keys(log).sort().reverse()[0];
    let consecutive = 0;

    while (dateKey && log[dateKey] === true) {
      consecutive++;
      const previousDate = DateUtils.addDaysLocal(dateKey, -1);
      dateKey = previousDate ? DateUtils.getLocalDateKey(previousDate) : null;
    }

    return consecutive;
  }

  function yesterdayDateKey() {
    const yesterdayDate = DateUtils.addDaysLocal(new Date(), -1);
    return DateUtils.getLocalDateKey(yesterdayDate);
  }

  // Evaluates one or more newly logged local calendar dates in order.
  // This preserves the existing rules while allowing a single app open
  // after several days away to catch up each missed day exactly once.
  function evaluateDailyStreak(state, dateKeys) {
    const datesToEvaluate = Array.isArray(dateKeys) && dateKeys.length ? dateKeys : [yesterdayDateKey()];
    const summary = {
      penaltyApplied: false,
      streakChanged: false,
      processedDates: [],
      penaltiesApplied: 0,
      xpLost: 0,
      attributeDrops: []
    };

    datesToEvaluate.forEach(dateKey => {
      const dayMissed = state.planning.missedDayLog[dateKey];

      if (dayMissed === undefined) {
        return;
      }

      summary.processedDates.push(dateKey);

      const consecutiveMisses = countConsecutiveMisses(state, dateKey);

      if (consecutiveMisses >= PENALTY_CONSECUTIVE_DAYS) {
        if (summary.oldStreak === undefined) summary.oldStreak = state.streak;
        state.streak = 0;
        state.achievements._hadPenaltyEver = true;

        state.xp = Math.max(0, state.xp - PENALTY_XP);
        state.level = Leveling.levelFromTotalXp(state.xp);

        const attributeDrops = PENALTY_ATTRIBUTES.map(attrId => {
          const before = state.attributes[attrId].level;
          const currentLevelFloor = Leveling.xpRequiredForLevel(before);
          const amountToRemove = Math.max(state.attributes[attrId].xp - currentLevelFloor + 1, 50);
          Attributes.removeXp(state, attrId, amountToRemove);
          const after = state.attributes[attrId].level;
          return { attribute: attrId, before, after, date: dateKey };
        });

        summary.penaltyApplied = true;
        summary.streakChanged = true;
        summary.penaltiesApplied += 1;
        summary.xpLost += PENALTY_XP;
        summary.newStreak = 0;
        summary.attributeDrops = summary.attributeDrops.concat(attributeDrops);
        return;
      }

      if (!dayMissed) {
        if (summary.oldStreak === undefined) summary.oldStreak = state.streak;
        state.streak += 1;
        summary.streakChanged = true;
        summary.newStreak = state.streak;
      }
    });

    return summary;
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
