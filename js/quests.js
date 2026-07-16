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
    ActiveEffects.pruneExpired(state, today);
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
      const endingMainQuest = getMainQuest(state);

      state.planning.dayReports[yesterdayDate] = {
        targetXp: state.planning._activeTargetXp || null,
        actualXp: yesterdayLog.xp,
        targetAttribute: targetAttr,
        actualAttributeXp: actualAttrXp,
        questsPlanned: state.quests.active.length,
        questsCompleted: yesterdayCompletedCount,
        mainQuest: endingMainQuest ? {
          id: endingMainQuest.id,
          title: endingMainQuest.title,
          completed: !!endingMainQuest.done
        } : null,
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
      attribute: g.attribute || "willpower",
      tags: [],
      difficulty: g.difficulty || "normal",
      xp: g.xp || ({ easy: 50, normal: 100, hard: 200 }[g.difficulty] || 100),
      done: false,
      dateAssigned: today,
      isWillpowerGoal: (g.attribute || "willpower") === "willpower",
      questType: g.questType === "main" || g.priority === "high" ? "main" : "side",
      priority: g.priority || "normal",
      scheduledTime: g.scheduledTime || null
    }));

    const fixedAsQuests = plannedFixed.map(tmpl => ({
      id: "fixed_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title: tmpl.title,
      attribute: tmpl.attribute,
      tags: Array.isArray(tmpl.tags) ? [...tmpl.tags] : [],
      difficulty: tmpl.difficulty,
      xp: tmpl.xp,
      done: false,
      dateAssigned: today,
      isWillpowerGoal: false,
      questType: "routine",
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

  function addQuest(state, { title, attribute, difficulty, xp, tags = [], questType = "side" }) {
    const hasMainQuest = state.quests.active.some(quest => quest.questType === "main" || quest.priority === "high");
    const hasMinimumQuest = state.quests.active.some(quest => quest.questType === "minimum" || quest.isMinimumQuest === true);
    const normalizedQuestType = questType === "minimum" && !hasMinimumQuest
      ? "minimum"
      : (questType === "main" && !hasMainQuest ? "main" : "side");
    const quest = {
      id: "q_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title, attribute, difficulty, xp,
      tags: Array.isArray(tags) ? [...new Set(tags)] : [],
      done: false,
      dateAssigned: todayDateString(),
      isWillpowerGoal: attribute === "willpower",
      isMinimumQuest: normalizedQuestType === "minimum",
      questType: normalizedQuestType,
      priority: normalizedQuestType === "main" ? "high" : "normal"
    };
    state.quests.active.push(quest);
    return quest;
  }

  function addMinimumQuest(state) {
    const existing = state.quests.active.find(quest => quest.questType === "minimum" || quest.isMinimumQuest === true);
    if (existing) return { added: false, reason: "already-active", quest: existing };
    if ((Number(state.quests.completedToday) || 0) > 0) {
      return { added: false, reason: "day-secured", quest: null };
    }

    const mainQuest = getMainQuest(state);
    const mainTitle = mainQuest && typeof mainQuest.title === "string" ? mainQuest.title.trim() : "";
    const title = mainTitle
      ? 'Work on "' + mainTitle.slice(0, 58) + '" for 5 minutes'
      : "Do one meaningful task for 5 minutes";
    const quest = addQuest(state, {
      title,
      attribute: mainQuest && mainQuest.attribute ? mainQuest.attribute : "willpower",
      difficulty: "easy",
      xp: 50,
      tags: ["minimum", "no-zero-day"],
      questType: "minimum"
    });
    quest.sourceMainQuestId = mainQuest ? mainQuest.id : null;
    return { added: true, reason: null, quest };
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

    if (quest.done) {
      return {
        quest,
        completed: false,
        uncompleted: false,
        locked: true,
        playerLeveledUp: false,
        attributeResult: null,
        newAchievements: [],
        bossDominanceReduced: 0,
        bossEncounterDefeated: false,
        bossDamageDealt: 0,
        bossDefeated: null,
        bonusXpFromSkills: 0,
        bonusXpFromEffects: 0,
        newMilestoneTitles: [],
        newSkills: [],
        activatedEffects: [],
        consumedEffects: []
      };
    }

    const wasDone = quest.done;
    quest.done = !quest.done;

    const result = {
      quest,
      completed: !wasDone && quest.done,
      uncompleted: wasDone && !quest.done,
      locked: false,
      playerLeveledUp: false,
      attributeResult: null,
      newAchievements: [],
      bossDominanceReduced: 0,
      bossEncounterDefeated: false,
      bossDamageDealt: 0,
      bossDefeated: null,
      bonusXpFromSkills: 0,
      bonusXpFromEffects: 0,
      newMilestoneTitles: [],
      newSkills: [],
      activatedEffects: [],
      consumedEffects: []
    };

    if (result.completed) {
      // 0. Apply any passive XP bonus from already-unlocked skills, PLUS
      // any permanent prestige bonus, before granting XP. Both stack
      // additively (e.g. +8% skill bonus + +15% prestige bonus = +23%
      // total), applied here so they're real mechanical effects rather
      // than numbers printed on a card that do nothing.
      const skillMultiplier = Skills.getPassiveXpMultiplier(state, quest.attribute);
      const prestigeMultiplier = (state.prestige && state.prestige.permanentXpBonus) || 0;
      const passiveMultiplier = skillMultiplier + prestigeMultiplier;
      const passiveBonusXp = Math.round(quest.xp * passiveMultiplier);
      const effectBonus = ActiveEffects.getQuestXpBonus(state, quest);
      const effectBonusXp = Math.round(quest.xp * effectBonus.multiplier);
      const effectiveXp = quest.xp + passiveBonusXp + effectBonusXp;
      result.bonusXpFromSkills = passiveBonusXp;
      result.bonusXpFromEffects = effectBonusXp;

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
      // passive-boosted XP, so skill/prestige bonuses retain their existing
      // behavior. Temporary effect XP is excluded to preserve boss balance.
      // A completed normal quest pushes back Dominance once. This runs
      // before damage so a defeating blow cannot affect the next boss.
      const dominanceOutcome = Bosses.applyNormalQuestDominanceReduction(state);
      result.bossDominanceReduced = dominanceOutcome.reducedBy;
      result.bossEncounterDefeated = !!dominanceOutcome.encounterDefeated;

      const bossEffectiveXp = quest.xp + passiveBonusXp;
      const bossOutcome = Bosses.applyQuestDamage(state, { ...quest, xp: bossEffectiveXp });
      result.bossDamageDealt = bossOutcome.damageDealt;
      result.bossDefeated = bossOutcome.defeated ? bossOutcome.bossId : null;
      result.playerLeveledUp = result.playerLeveledUp || !!bossOutcome.playerLeveledUp;

      // 6. Achievement check (runs last so it can see all the updated counters)
      result.newAchievements = [...(bossOutcome.newAchievements || []), ...Achievements.checkAll(state)];
      result.newMilestoneTitles = [...(bossOutcome.newMilestoneTitles || []), ...Ranks.checkMilestoneTitles(state)];

      if (effectBonus.effect) {
        const consumeOutcome = ActiveEffects.consume(state, effectBonus.effect.id);
        if (consumeOutcome.consumed) result.consumedEffects.push(consumeOutcome.effect);
      }

      if (quest.questType === "main" || quest.priority === "high") {
        const effectOutcome = ActiveEffects.activate(state, "momentum", quest);
        if (effectOutcome.activated) result.activatedEffects.push(effectOutcome.effect);
      }

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

  function getMainQuest(state) {
    return state.quests.active.find(quest => quest.questType === "main" || quest.priority === "high") || null;
  }

  function isMainQuestCandidate(quest) {
    if (!quest || quest.done) return false;
    if (quest.questType === "main" || quest.priority === "high") return true;
    if (quest.questType === "routine" || String(quest.id || "").startsWith("fixed_")) return false;
    if (quest.questType === "minimum" || quest.isMinimumQuest === true) return false;
    return true;
  }

  function getMainQuestCandidates(state) {
    return state.quests.active.filter(isMainQuestCandidate);
  }

  function setMainQuest(state, questId) {
    const target = state.quests.active.find(quest => quest.id === questId);
    if (!target) return { ok: false, reason: "not-found", quest: null };
    if (!isMainQuestCandidate(target)) return { ok: false, reason: "not-eligible", quest: target };

    const current = getMainQuest(state);
    if (current && current.id === target.id) {
      return { ok: true, changed: false, quest: current, previousMainId: current.id };
    }
    if (current && current.done) {
      return { ok: false, reason: "main-cleared", quest: current };
    }

    if (current) {
      current.questType = "side";
      current.priority = "normal";
    }
    target.questType = "main";
    target.priority = "high";

    const targetIndex = state.quests.active.indexOf(target);
    if (targetIndex > 0) {
      state.quests.active.splice(targetIndex, 1);
      state.quests.active.unshift(target);
    }

    return {
      ok: true,
      changed: true,
      quest: target,
      previousMainId: current ? current.id : null
    };
  }

  function getMinimumQuest(state) {
    return state.quests.active.find(quest => quest.questType === "minimum" || quest.isMinimumQuest === true) || null;
  }

  return { ensureDailyReset, addQuest, addMinimumQuest, removeQuest, toggleQuest, getActiveQuests, getMainQuest, getMainQuestCandidates, setMainQuest, getMinimumQuest, todayDateString };
})();

if (typeof window !== "undefined") window.Quests = Quests;
