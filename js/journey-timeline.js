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

  function buildEntry(dateKey, log, report, proofs) {
    const growthEvents = (Array.isArray(log.growthEvents) ? log.growthEvents : [])
      .map(normalizeEvent)
      .filter(Boolean);
    const mainQuest = report && report.mainQuest ? {
      title: String(report.mainQuest.title || "Main Quest"),
      completed: Boolean(report.mainQuest.completed)
    } : null;
    const xp = numberOrZero(log.xp);
    const questsCompleted = numberOrZero(log.questsCompleted);
    const proofRecords = Array.isArray(proofs) ? proofs : [];
    const hasActivity = xp > 0 || questsCompleted > 0 || growthEvents.length > 0 || mainQuest || proofRecords.length > 0;
    if (!hasActivity) return null;

    let title = "Progress recorded";
    let tone = "active";
    if (mainQuest) {
      title = mainQuest.title;
      tone = mainQuest.completed ? "secured" : "missed";
    } else if (growthEvents.length > 0) {
      title = growthEvents[0].label;
      tone = "growth";
    } else if (proofRecords.length > 0) {
      title = proofRecords[0].questTitle || "Proof recorded";
      tone = "proof";
    }

    return { dateKey, title, tone, xp, questsCompleted, mainQuest, growthEvents, proofs: proofRecords };
  }

  function build(state, limit) {
    const dailyLog = state.dailyLog || {};
    const reports = state.planning && state.planning.dayReports || {};
    const proofRecords = global.Proof ? global.Proof.getArchive(state) : [];
    const proofsByDate = proofRecords.reduce((grouped, record) => {
      if (!global.DateUtils.parseLocalDateKey(record.dateKey)) return grouped;
      if (!grouped[record.dateKey]) grouped[record.dateKey] = [];
      grouped[record.dateKey].push(record);
      return grouped;
    }, {});
    const dateKeys = [...new Set([...Object.keys(dailyLog), ...Object.keys(reports), ...Object.keys(proofsByDate)])]
      .filter(dateKey => global.DateUtils.parseLocalDateKey(dateKey))
      .sort()
      .reverse();
    const maxEntries = Number.isInteger(limit) && limit > 0 ? limit : 14;
    return dateKeys
      .map(dateKey => buildEntry(dateKey, dailyLog[dateKey] || {}, reports[dateKey] || null, proofsByDate[dateKey] || []))
      .filter(Boolean)
      .slice(0, maxEntries);
  }

  global.JourneyTimeline = { build };
})(typeof window !== "undefined" ? window : globalThis);
