(function (global) {
  const ATTRIBUTE_LABELS = {
    intelligence: "Intelligence",
    strength: "Strength",
    charisma: "Charisma",
    willpower: "Willpower"
  };

  function numberOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function getDateKeys(endDate) {
    const endKey = global.DateUtils.getLocalDateKey(endDate || new Date());
    const keys = [];
    for (let offset = 6; offset >= 0; offset--) {
      keys.push(global.DateUtils.getLocalDateKey(global.DateUtils.addDaysLocal(endKey, -offset)));
    }
    return keys;
  }

  function buildNarrative(summary) {
    if (summary.activeDays === 0) {
      const archiveSentence = summary.proofsLogged > 0
        ? " " + summary.proofsLogged + " archived completion " + (summary.proofsLogged === 1 ? "record falls" : "records fall") + " within this window, but no quest or XP activity was recorded."
        : "";
      return {
        headline: "The campaign is waiting",
        narrative: "No progress was recorded during this seven-day window." + archiveSentence + " Your character has not fallen behind; the next meaningful action can restart the signal.",
        nextFocus: "Begin with one achievable quest and rebuild from there."
      };
    }

    const mainQuestSentence = summary.mainQuestsRecorded > 0
      ? " " + summary.mainQuestsSecured + " of " + summary.mainQuestsRecorded + " recorded Main Quests were secured."
      : "";
    const attributeSentence = summary.strongestAttribute
      ? " " + summary.strongestAttribute.label + " led your growth with " + summary.strongestAttribute.xp + " XP."
      : "";
    const proofSentence = summary.proofsLogged > 0
      ? " " + summary.proofsLogged + " completion " + (summary.proofsLogged === 1 ? "record was" : "records were") + " added to your journey."
      : "";
    const questLabel = summary.questsCompleted === 1 ? " quest" : " quests";
    let headline = "Progress signal established";
    if (summary.activeDays >= 5 && summary.mainQuestsMissed === 0) headline = "A focused week";
    else if (summary.questsCompleted >= 10) headline = "Momentum is building";
    else if (summary.activeDays <= 2) headline = "A foothold was secured";

    let nextFocus = "Protect the rhythm and keep tomorrow's priority clear.";
    if (summary.activeDays < 4) nextFocus = "Aim to show up on one more day next week.";
    else if (summary.mainQuestsMissed > summary.mainQuestsSecured) nextFocus = "Reduce the load and protect the next Main Quest.";

    return {
      headline,
      narrative: "You showed up on " + summary.activeDays + " of 7 days, cleared " + summary.questsCompleted + questLabel + ", and earned " + summary.xpEarned + " XP." + proofSentence + mainQuestSentence + attributeSentence,
      nextFocus
    };
  }

  function build(state, endDate) {
    const dateKeys = getDateKeys(endDate);
    const dailyLog = state.dailyLog || {};
    const reports = state.planning && state.planning.dayReports || {};
    const proofRecords = global.Proof ? global.Proof.getArchive(state) : [];
    const proofCountsByDate = proofRecords.reduce((counts, record) => {
      if (!dateKeys.includes(record.dateKey)) return counts;
      counts[record.dateKey] = (counts[record.dateKey] || 0) + 1;
      return counts;
    }, {});
    const attributeXp = {};
    let xpEarned = 0;
    let questsCompleted = 0;
    let activeDays = 0;
    let mainQuestsRecorded = 0;
    let mainQuestsSecured = 0;
    let growthEvents = 0;

    dateKeys.forEach(dateKey => {
      const log = dailyLog[dateKey] || {};
      const dayXp = numberOrZero(log.xp);
      const dayQuests = numberOrZero(log.questsCompleted);
      xpEarned += dayXp;
      questsCompleted += dayQuests;
      if (dayQuests > 0 || dayXp > 0) activeDays += 1;
      growthEvents += Array.isArray(log.growthEvents) ? log.growthEvents.length : 0;

      Object.entries(log.attributeXp || {}).forEach(([attributeId, value]) => {
        if (!ATTRIBUTE_LABELS[attributeId]) return;
        attributeXp[attributeId] = (attributeXp[attributeId] || 0) + numberOrZero(value);
      });

      const report = reports[dateKey];
      if (report && report.mainQuest) {
        mainQuestsRecorded += 1;
        if (report.mainQuest.completed) mainQuestsSecured += 1;
      }
    });

    const strongestEntry = Object.entries(attributeXp).sort((a, b) => b[1] - a[1])[0] || null;
    const summary = {
      startDate: dateKeys[0],
      endDate: dateKeys[dateKeys.length - 1],
      activeDays,
      questsCompleted,
      xpEarned,
      mainQuestsRecorded,
      mainQuestsSecured,
      mainQuestsMissed: mainQuestsRecorded - mainQuestsSecured,
      growthEvents,
      proofsLogged: Object.values(proofCountsByDate).reduce((sum, count) => sum + count, 0),
      strongestAttribute: strongestEntry ? {
        id: strongestEntry[0],
        label: ATTRIBUTE_LABELS[strongestEntry[0]],
        xp: strongestEntry[1]
      } : null
    };

    return { ...summary, ...buildNarrative(summary) };
  }

  global.WeeklyRecap = { build };
})(typeof window !== "undefined" ? window : globalThis);
