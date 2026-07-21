// js/gameloop.js
//
// This file exists to close a real architectural gap: previously only
// quests.html called Quests.ensureDailyReset() + Streak.evaluateDailyStreak().
// If a user opened hero.html or stats.html first thing in the morning
// (entirely possible via the nav bar), the daily reset chain never ran on
// those pages, meaning yesterday's quest list could still be showing, the
// streak might not have advanced, and the penalty system might never fire.
//
// GameLoop.bootstrapDay() is now the SINGLE function every page calls on
// load, before rendering anything. It defines the canonical order of the
// full daily loop described in the design doc:
//
//   Shield Break -> Daily Quests -> XP Gain -> Attribute XP Gain ->
//   Skill Unlock -> Boss Damage -> Reward Purchase -> New Day -> Repeat
//
// Calling this is idempotent — calling it five times in a row on five
// different page loads on the same day is harmless, because every sub-step
// already checks its own "have I already run today?" condition internally.

const GameLoop = (function () {

  // Runs once per page load, on every page. Returns a report describing
  // what happened, so a page can show a toast if something notable fired
  // (e.g. a penalty, or a new day's quests being seeded).
  function bootstrapDay() {
    const report = {
      shieldRefreshed: false,
      questsReset: false,
      streakResult: null,
      dominanceUpdate: null,
      missionExpiration: null,
      newAchievements: []
    };

    GameState.set(state => {
      // Step 0 (pre-loop): make sure the shield ritual's HP is correct for
      // today before anything else touches state, since the ritual is
      // conceptually "before" the quest day even starts.
      const prevShieldDate = state.shieldRitual.lastCompletedDate;
      Shield.ensureFreshForToday(state);
      report.shieldRefreshed = (prevShieldDate !== state.shieldRitual.lastCompletedDate) || !Shield.isTodayAlreadyDone(state);

      // Step: New Day boundary. ensureDailyReset both seeds today's quest
      // list AND logs yesterday's completion outcome into missedDayLog —
      // that log is what evaluateDailyStreak reads next, so the order here
      // matters and must not be reversed.
      const resetResult = Quests.ensureDailyReset(state);
      report.questsReset = !!(resetResult && resetResult.didReset);

      if (report.questsReset) {
        report.streakResult = Streak.evaluateDailyStreak(state, resetResult.streakEvaluationDates);

        // Streak thresholds are counter achievements, so evaluate them at
        // the exact point the streak changes instead of waiting for a later
        // quest completion or reward purchase.
        report.newAchievements.push(...Achievements.checkAll(state));

        // Check the Comeback secret achievement right after the streak
        // updates, since that's the only moment state.streak actually
        // changes day-to-day.
        const comebackDef = Achievements.checkComeback(state);
        if (comebackDef) report.newAchievements.push(comebackDef);
      } else {
        // Existing saves may already contain a completed quest for today
        // when this version first loads. Count that day once without asking
        // the user to redo or unlock an already-cleared quest.
        const completedToday = state.quests.lastResetDate === DateUtils.getLocalDateKey()
          && state.quests.active.some(quest => quest && quest.done);
        if (completedToday) {
          report.streakResult = Streak.recordSuccessfulDay(state, DateUtils.getLocalDateKey());
          if (report.streakResult.counted) {
            report.newAchievements.push(...Achievements.checkAll(state));
            const comebackDef = Achievements.checkComeback(state);
            if (comebackDef) report.newAchievements.push(comebackDef);
          }
        }
      }

      // Dominance grows from elapsed real time, not from page-load count.
      // The stored timestamp makes repeated same-day loads idempotent.
      report.dominanceUpdate = Bosses.updateDominance(state);
      report.missionExpiration = typeof Bosses.processMissionExpiration === "function"
        ? Bosses.processMissionExpiration(state)
        : null;
    });

    return report;
  }

  // Convenience wrapper used by every quest-completing surface (currently
  // just quests.html, but boss-fight quick actions etc. should also use
  // this rather than calling Quests.toggleQuest directly) so the full
  // fan-out — XP, attribute XP, skill unlock, boss damage, achievements —
  // always happens together, in the same order, everywhere.
  function completeQuestFlow(questId) {
    let result;
    const newState = GameState.set(state => {
      result = Quests.toggleQuest(state, questId);
    });
    return { result, state: newState };
  }

  return { bootstrapDay, completeQuestFlow };
})();

if (typeof window !== "undefined") window.GameLoop = GameLoop;
