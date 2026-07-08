// js/quests.js
//
// Owns the quest list and, critically, the completeQuest() function — this
// is the single chokepoint where one user action ("I finished this quest")
// fans out into every other system: player XP, attribute XP, streak,
// achievements, and boss damage. Centralizing this in one function is what
// satisfies "quest completion updates player XP / attribute XP / statistics
// / achievements / streak progress" without each page having to remember
// to call five different things in the right order.

const Quests = (function () {

  function todayDateString() {
    return DateUtils.getLocalDateKey(); // "2026-06-22"
  }

  // Call once per page load. If the stored lastResetDate isn't today,
  // clears completed-today counters and reloads the active quest list
  // from templates. Does NOT wipe quests the user added manually today
  // if this already ran today.
  function ensureDailyReset(state) {
    const today = todayDateString();
    if (state.quests.lastResetDate === today) return false; // already reset today

    const previousResetDate = state.quests.lastResetDate;
    const streakEvaluationDates = [];

    // Before wiping, record yesterday's completion outcome for the
    // streak/penalty system to evaluate (streak.js reads this).
    //
    // IMPORTANT: a day with zero quests counts as MISSED, not exempt.
    // The original version of this check treated "no quests existed" as
    // automatically non-punishable, which silently let a user dodge the
    // entire penalty system just by never adding/planning anything — the
    // exact opposite of what a discipline-decay mechanic is supposed to
    // enforce. Only a day where quests existed AND at least one was
    // completed counts as a non-miss.
    const yesterdayCompletedCount = state.quests.active.filter(q => q.done).length;
    if (previousResetDate) {
      state.planning.missedDayLog[previousResetDate] = yesterdayCompletedCount === 0;
      streakEvaluationDates.push(previousResetDate);

      DateUtils.getLocalDateKeysBetween(previousResetDate, today).forEach(dateKey => {
        state.planning.missedDayLog[dateKey] = true;
        streakEvaluationDates.push(dateKey);
      });

      // Build the end-of-day report for the day that's ending, comparing
      // whatever target was set during planning against what was actually
      // achieved. Stored under yesterday's date so the report screen can
      // look it up after the fact, even after today's quests overwrite
      // state.quests.active.
      const yesterdayDate = previousResetDate;
      const yesterdayLog = (state.dailyLog && state.dailyLog[yesterdayDate]) || { xp: 0, questsCompleted: 0 };
      const targetAttr = state.planning._activeTargetAttribute || null;

      // Calculated directly from yesterday's still-in-memory quest list
      // (state.quests.active hasn't been overwritten yet at this point),
      // summing XP only from completed quests matching the target
      // attribute. This is accurate without needing dailyLog to carry a
      // per-attribute breakdown it was never designed to store.
      const actualAttrXp = targetAttr
        ? state.quests.active.filter(q => q.done && q.attribute === targetAttr).reduce((sum, q) => sum + q.xp, 0)
        : null;

      state.planning.dayReports[yesterdayDate] = {
        targetXp: state.planning._activeTargetXp || null,
        actualXp: yesterdayLog.xp,
        targetAttribute: targetAttr,
        actualAttributeXp: actualAttrXp,
        questsPlanned: state.quests.active.length,
        questsCompleted: yesterdayCompletedCount,
        growthEvents: yesterdayLog.growthEvents || []
      };
    }

    const plannedFixed = (state.planning.tomorrowFixed || []).map(entry => {
      const tmpl = SEED_DATA.questTemplates.find(t => t.id === entry.templateId) || null;
      return tmpl ? { ...tmpl, priority: entry.priority || "normal", scheduledTime: entry.scheduledTime || null } : null;
    }).filter(Boolean);

    const plannedGoals = (state.planning.tomorrowGoals || []).map(g => ({
      id: "goal_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title: g.text,
      attribute: "willpower",
      difficulty: "normal",
      xp: g.xp || 50,
      done: false,
      dateAssigned: today,
      isWillpowerGoal: true,
      priority: g.priority || "normal",
      scheduledTime: g.scheduledTime || null
    }));

    const fixedAsQuests = plannedFixed.map(tmpl => ({
      id: "fixed_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title: tmpl.title,
      attribute: tmpl.attribute,
      difficulty: tmpl.difficulty,
      xp: tmpl.xp,
      done: false,
      dateAssigned: today,
      isWillpowerGoal: false,
      priority: tmpl.priority || "normal",
      scheduledTime: tmpl.scheduledTime || null
    }));

    // Sort so higher-priority and earlier-scheduled quests surface first —
    // this is what makes setting a priority/time during planning actually
    // matter, rather than being metadata nobody ever sees reflected back.
    const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 };
    const combined = [...plannedGoals, ...fixedAsQuests].sort((a, b) => {
      const pDiff = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      if (pDiff !== 0) return pDiff;
      if (a.scheduledTime && b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
      if (a.scheduledTime) return -1;
      if (b.scheduledTime) return 1;
      return 0;
    });

    state.quests.active = combined;
    state.quests.completedToday = 0;
    state.quests.lastResetDate = today;

    // Promote the targets set during last night's planning session to be
    // TODAY's active targets, now that the report for the previous day
    // (built above, using the now-stale _activeTarget values) is done.
    // This ordering matters: promoting before building the report would
    // make a day's report compare its own target against itself instead
    // of the target that was actually active during that day.
    state.planning._activeTargetXp = state.planning.tomorrowTargetXp || null;
    state.planning._activeTargetAttribute = state.planning.tomorrowTargetAttribute || null;

    // Clear the planning buffers now that they've been consumed.
    state.planning.tomorrowGoals = [];
    state.planning.tomorrowFixed = [];
    state.planning.tomorrowTargetXp = null;
    state.planning.tomorrowTargetAttribute = null;

    return { didReset: true, streakEvaluationDates };
  }

  function addQuest(state, { title, attribute, difficulty, xp }) {
    const quest = {
      id: "q_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title, attribute, difficulty, xp,
      done: false,
      dateAssigned: todayDateString(),
      isWillpowerGoal: attribute === "willpower"
    };
    state.quests.active.push(quest);
    return quest;
  }

  function removeQuest(state, questId) {
    state.quests.active = state.quests.active.filter(q => q.id !== questId);
  }

  // The chokepoint function. Toggles a quest's done state and, if newly
  // completed, applies every downstream effect. Returns a result object
  // describing everything that happened so the UI layer can decide what
  // animations/toasts to show without re-deriving the logic itself.
  function toggleQuest(state, questId) {
    const quest = state.quests.active.find(q => q.id === questId);
    if (!quest) return null;

    const wasDone = quest.done;
    quest.done = !quest.done;

    const result = {
      quest,
      completed: !wasDone && quest.done,
      uncompleted: wasDone && !quest.done,
      playerLeveledUp: false,
      attributeResult: null,
      newAchievements: [],
      bossDamageDealt: 0,
      bossDefeated: null,
      bonusXpFromSkills: 0,
      newMilestoneTitles: [],
      newSkills: []
    };

    if (result.completed) {
      // 0. Apply any passive XP bonus from already-unlocked skills, PLUS
      // any permanent prestige bonus, before granting XP. Both stack
      // additively (e.g. +8% skill bonus + +15% prestige bonus = +23%
      // total), applied here so they're real mechanical effects rather
      // than numbers printed on a card that do nothing.
      const skillMultiplier = Skills.getPassiveXpMultiplier(state, quest.attribute);
      const prestigeMultiplier = (state.prestige && state.prestige.permanentXpBonus) || 0;
      const totalMultiplier = skillMultiplier + prestigeMultiplier;
      const bonusXp = Math.round(quest.xp * totalMultiplier);
      const effectiveXp = quest.xp + bonusXp;
      result.bonusXpFromSkills = bonusXp;

      // 1. Player XP
      const prevPlayerLevel = state.level;
      state.xp += effectiveXp;
      state.lifetimeXp += effectiveXp;
      const playerProgress = Leveling.progressWithinLevel(state.xp);
      state.level = playerProgress.level;
      result.playerLeveledUp = state.level > prevPlayerLevel;

      // 2. Attribute XP
      result.attributeResult = Attributes.applyXp(state, quest.attribute, effectiveXp);

      // 3. Quest counters (used by Stats and the Machine achievement)
      state.quests.completedToday += 1;
      state.quests.totalCompletedEver += 1;

      // 3b. Daily history log, for the Stats page to render real charts
      // instead of hardcoded numbers. Keyed by date so it naturally
      // accumulates day-over-day without needing a separate rollup job.
      // attributeXp is a per-day breakdown by attribute id, needed for
      // attribute growth-over-time charts — without this, the stats page
      // can only ever show a single current snapshot, never a trend.
      if (!state.dailyLog) state.dailyLog = {};
      const today = todayDateString();
      if (!state.dailyLog[today]) state.dailyLog[today] = { xp: 0, questsCompleted: 0, questsMissed: 0, attributeXp: {} };
      if (!state.dailyLog[today].attributeXp) state.dailyLog[today].attributeXp = {};
      state.dailyLog[today].xp += effectiveXp;
      state.dailyLog[today].questsCompleted += 1;
      state.dailyLog[today].attributeXp[quest.attribute] = (state.dailyLog[today].attributeXp[quest.attribute] || 0) + effectiveXp;

      // 4. Skill tree auto-unlock check (level-gated, no perk points in this version)
      result.newSkills = Skills.checkAndUnlock(state, quest.attribute);

      // 5. Boss damage — uses a synthetic quest object carrying the
      // boosted XP, so a skill bonus also makes you hit harder against
      // bosses, consistent with it being a real mechanical effect.
      const bossOutcome = Bosses.applyQuestDamage(state, { ...quest, xp: effectiveXp });
      result.bossDamageDealt = bossOutcome.damageDealt;
      result.bossDefeated = bossOutcome.defeated ? bossOutcome.bossId : null;

      // 6. Achievement check (runs last so it can see all the updated counters)
      result.newAchievements = Achievements.checkAll(state);
      result.newMilestoneTitles = Ranks.checkMilestoneTitles(state);

      // Record every growth event into today's log, so the end-of-day
      // report (built by ensureDailyReset) can summarize the full
      // emotional picture of the day — not just an XP number — per the
      // "your character genuinely got stronger today" goal. Without this,
      // a level-up or skill unlock that happened mid-day would be visible
      // only as a passing toast, never recalled in the day's recap.
      if (!state.dailyLog[today].growthEvents) state.dailyLog[today].growthEvents = [];
      if (result.playerLeveledUp) state.dailyLog[today].growthEvents.push({ type: "level", value: state.level });
      result.newSkills.forEach(s => state.dailyLog[today].growthEvents.push({ type: "skill", value: s.name }));
      result.newAchievements.forEach(a => state.dailyLog[today].growthEvents.push({ type: "achievement", value: a.name }));
      result.newMilestoneTitles.forEach(t => state.dailyLog[today].growthEvents.push({ type: "title", value: t.name }));
      if (result.bossDefeated) state.dailyLog[today].growthEvents.push({ type: "boss", value: result.bossDefeated });

      // Stash the effective XP on the quest record itself so the
      // uncomplete path below (toggling the same quest back off) reverses
      // the EXACT amount that was actually granted, bonus included.
      // Without this, undoing a quest that received a skill bonus would
      // only refund the base XP, silently leaking the bonus amount into
      // the player's total every time they toggle a quest off and on.
      quest._lastGrantedXp = effectiveXp;

    } else if (result.uncompleted) {
      // Reversing a completion: undo XP/counters so toggling is non-destructive.
      const refundXp = quest._lastGrantedXp || quest.xp;
      state.xp = Math.max(0, state.xp - refundXp);
      state.lifetimeXp = Math.max(0, state.lifetimeXp - refundXp);
      state.level = Leveling.levelFromTotalXp(state.xp);
      Attributes.removeXp(state, quest.attribute, refundXp);
      state.quests.completedToday = Math.max(0, state.quests.completedToday - 1);
      state.quests.totalCompletedEver = Math.max(0, state.quests.totalCompletedEver - 1);

      const today = todayDateString();
      if (state.dailyLog && state.dailyLog[today]) {
        state.dailyLog[today].xp = Math.max(0, state.dailyLog[today].xp - refundXp);
        state.dailyLog[today].questsCompleted = Math.max(0, state.dailyLog[today].questsCompleted - 1);
        if (state.dailyLog[today].attributeXp && state.dailyLog[today].attributeXp[quest.attribute] != null) {
          state.dailyLog[today].attributeXp[quest.attribute] = Math.max(0, state.dailyLog[today].attributeXp[quest.attribute] - refundXp);
        }
      }
    }

    return result;
  }

  function getActiveQuests(state) {
    return state.quests.active;
  }

  return { ensureDailyReset, addQuest, removeQuest, toggleQuest, getActiveQuests, todayDateString };
})();

if (typeof window !== "undefined") window.Quests = Quests;
