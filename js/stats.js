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

  // Returns an array of the last 7 calendar days (oldest first), each with
  // whatever was actually logged that day (0 if nothing happened — a brand
  // new save will correctly show all zeros, not fake placeholder numbers).
  function getLast7Days(state) {
    const log = state.dailyLog || {};
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = dateNDaysAgo(i);
      const entry = log[date] || { xp: 0, questsCompleted: 0, questsMissed: 0 };
      days.push({ date, ...entry });
    }
    return days;
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

  return { getLast7Days, getThisWeekVsLastWeek, getQuestsCompletedThisWeek, getActiveDaysThisWeek, getAttributeBreakdown, get4WeekTrend };
})();

if (typeof window !== "undefined") window.Stats = Stats;
