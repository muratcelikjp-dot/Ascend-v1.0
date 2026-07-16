(function (global) {
  const EVENT_LABELS = {
    level: "Level reached",
    skill: "Skill unlocked",
    achievement: "Achievement unlocked",
    title: "Title earned",
    boss: "Boss defeated"
  };

  function numberOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizeEvent(event) {
    if (!event || !EVENT_LABELS[event.type]) return null;
    return {
      type: event.type,
      label: EVENT_LABELS[event.type],
      value: event.value == null ? "" : String(event.value)
    };
  }

  function buildEntry(dateKey, log, report) {
    const growthEvents = (Array.isArray(log.growthEvents) ? log.growthEvents : [])
      .map(normalizeEvent)
      .filter(Boolean);
    const mainQuest = report && report.mainQuest ? {
      title: String(report.mainQuest.title || "Main Quest"),
      completed: Boolean(report.mainQuest.completed)
    } : null;
    const xp = numberOrZero(log.xp);
    const questsCompleted = numberOrZero(log.questsCompleted);
    const hasActivity = xp > 0 || questsCompleted > 0 || growthEvents.length > 0 || mainQuest;
    if (!hasActivity) return null;

    let title = "Progress recorded";
    let tone = "active";
    if (mainQuest) {
      title = mainQuest.title;
      tone = mainQuest.completed ? "secured" : "missed";
    } else if (growthEvents.length > 0) {
      title = growthEvents[0].label;
      tone = "growth";
    }

    return { dateKey, title, tone, xp, questsCompleted, mainQuest, growthEvents };
  }

  function build(state, limit) {
    const dailyLog = state.dailyLog || {};
    const reports = state.planning && state.planning.dayReports || {};
    const dateKeys = [...new Set([...Object.keys(dailyLog), ...Object.keys(reports)])]
      .filter(dateKey => global.DateUtils.parseLocalDateKey(dateKey))
      .sort()
      .reverse();
    const maxEntries = Number.isInteger(limit) && limit > 0 ? limit : 14;
    return dateKeys
      .map(dateKey => buildEntry(dateKey, dailyLog[dateKey] || {}, reports[dateKey] || null))
      .filter(Boolean)
      .slice(0, maxEntries);
  }

  global.JourneyTimeline = { build };
})(typeof window !== "undefined" ? window : globalThis);
