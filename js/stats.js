// js/stats.js
//
// Pure read-side module. Takes the state object and derives the numbers
// the Stats page needs to render — last-7-days XP, this-week vs last-week
// totals, attribute XP breakdown, activity heatmap. Nothing here mutates
// state; this only exists so stats.html doesn't need its own duplicate
// date-math logic.

const Stats = (function () {

  function dateNDaysAgo(n) {
    return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  }

  // Generalized version of the old getLast7Days — returns the last N
  // calendar days (oldest first), each with whatever was actually logged
  // that day. Backing function for the 7/30/90-day chart views.
  function getLastNDays(state, n) {
    const log = state.dailyLog || {};
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const date = dateNDaysAgo(i);
      const entry = log[date] || { xp: 0, questsCompleted: 0, questsMissed: 0, attributeXp: {} };
      days.push({ date, ...entry });
    }
    return days;
  }

  // Kept as a thin wrapper for backward compatibility with existing
  // callers (stats.html's existing 7-day chart) that already call this
  // by name.
  function getLast7Days(state) {
    return getLastNDays(state, 7);
  }

  function getWeekTotal(state, weeksAgo) {
    const log = state.dailyLog || {};
    let total = 0;
    for (let i = weeksAgo * 7; i < weeksAgo * 7 + 7; i++) {
      const date = dateNDaysAgo(i);
      if (log[date]) total += log[date].xp;
    }
    return total;
  }

  function getThisWeekVsLastWeek(state) {
    const thisWeek = getWeekTotal(state, 0);
    const lastWeek = getWeekTotal(state, 1);
    return { thisWeek, lastWeek, delta: thisWeek - lastWeek };
  }

  function getQuestsCompletedThisWeek(state) {
    const days = getLast7Days(state);
    return days.reduce((sum, d) => sum + d.questsCompleted, 0);
  }

  function getActiveDaysThisWeek(state) {
    const days = getLast7Days(state);
    return days.filter(d => d.questsCompleted > 0).length;
  }

  // Returns attribute XP sorted descending, for the "by attribute" chart.
  function getAttributeBreakdown(state) {
    return Object.keys(state.attributes)
      .map(id => ({ id, xp: state.attributes[id].xp, level: state.attributes[id].level }))
      .sort((a, b) => b.xp - a.xp);
  }

  // 4-week XP trend (each point is a full week's total), oldest first.
  function get4WeekTrend(state) {
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      weeks.push(getWeekTotal(state, w));
    }
    return weeks;
  }

  // Attribute growth over the last N days: returns one series per
  // attribute, each a running CUMULATIVE total (not daily delta), so the
  // chart reads as "how has this attribute's XP climbed over time" rather
  // than a noisy daily bar chart. Starts from the attribute's CURRENT
  // total minus everything gained in the window, then adds each day's
  // gain forward — this approximates the attribute's value at the start
  // of the window without needing a separate historical snapshot system.
  function getAttributeGrowth(state, days) {
    const dayEntries = getLastNDays(state, days);
    const totalGainedInWindow = {};
    Object.keys(state.attributes).forEach(attrId => {
      totalGainedInWindow[attrId] = dayEntries.reduce((sum, d) => sum + ((d.attributeXp && d.attributeXp[attrId]) || 0), 0);
    });

    const series = {};
    Object.keys(state.attributes).forEach(attrId => {
      const startingValue = Math.max(0, state.attributes[attrId].xp - totalGainedInWindow[attrId]);
      let running = startingValue;
      series[attrId] = dayEntries.map(d => {
        running += (d.attributeXp && d.attributeXp[attrId]) || 0;
        return running;
      });
    });

    return { labels: dayEntries.map(d => d.date), series };
  }

  // Boss damage dealt per day over the last N days, reading from the
  // damageHistory log bosses.js already maintains (added when the boss
  // system was built — this is the first time anything actually reads it
  // back out for display).
  function getBossDamageHistory(state, days) {
    const history = (state.bosses && state.bosses.damageHistory) || {};
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = dateNDaysAgo(i);
      result.push({ date, damage: history[date] || 0 });
    }
    return result;
  }

  // Streak history over the last N days, derived from missedDayLog (which
  // already records true/false per date from the daily-reset/penalty
  // system) rather than inventing a second tracking mechanism.
  function getStreakHistory(state, days) {
    const log = state.planning && state.planning.missedDayLog || {};
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = dateNDaysAgo(i);
      const hasEntry = Object.prototype.hasOwnProperty.call(log, date);
      result.push({ date, missed: hasEntry ? log[date] === true : null }); // null = no data yet (too early in app lifetime)
    }
    return result;
  }

  // Quest completion trend: completed vs missed-by-inaction per day,
  // approximating "missed" as planned-but-incomplete using questsMissed if
  // ever populated, falling back to 0 since the current quest model
  // doesn't separately track per-quest misses within a day (only whole-day
  // miss/hit via missedDayLog).
  function getQuestCompletionTrend(state, days) {
    const dayEntries = getLastNDays(state, days);
    return dayEntries.map(d => ({ date: d.date, completed: d.questsCompleted, missed: d.questsMissed || 0 }));
  }

  return {
    getLastNDays, getLast7Days, getThisWeekVsLastWeek, getQuestsCompletedThisWeek,
    getActiveDaysThisWeek, getAttributeBreakdown, get4WeekTrend,
    getAttributeGrowth, getBossDamageHistory, getStreakHistory, getQuestCompletionTrend
  };
})();

if (typeof window !== "undefined") window.Stats = Stats;
