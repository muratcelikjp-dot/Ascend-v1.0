// js/bosses.js
//
// Bosses take damage from quest completions based on damageRules defined
// in seed-data.js (per boss). A rule matches either by attribute or by a
// substring in the quest title, so non-engineers (or future-you) can add
// new bosses purely by editing data, e.g.:
//   { matchType: "titleContains", match: "cold shower", damage: 80 }

const Bosses = (function () {
  const DOMINANCE_MAX = 100;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  function clampDominance(value) {
    return Math.max(0, Math.min(DOMINANCE_MAX, Math.round(value * 10000) / 10000));
  }

  function getDominanceConfig(bossDef) {
    return {
      starting: Math.max(0, Number(bossDef && bossDef.startingDominance) || 0),
      passivePerDay: Math.max(0, Number(bossDef && bossDef.passiveDominancePerDay) || 0),
      normalQuestReduction: Math.max(0, Number(bossDef && bossDef.normalQuestDominanceReduction) || 0)
    };
  }

  function getCurrentBossDef(state) {
    return SEED_DATA.bosses[state.bosses.currentBossId] || null;
  }

  function initializeDominance(state, bossDef, now) {
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const config = getDominanceConfig(bossDef);
    state.bosses.dominance = bossDef ? clampDominance(config.starting) : 0;
    state.bosses.lastDominanceUpdatedAt = timestamp;
    return state.bosses.dominance;
  }

  function ensureDominanceState(state, now) {
    const bossDef = getCurrentBossDef(state);
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const dominance = Number(state.bosses.dominance);
    const lastUpdatedAt = Number(state.bosses.lastDominanceUpdatedAt);

    if (state.bosses.dominance === null || !Number.isFinite(dominance)) {
      initializeDominance(state, bossDef, timestamp);
    } else {
      state.bosses.dominance = clampDominance(dominance);
    }

    if (state.bosses.lastDominanceUpdatedAt === null || !Number.isFinite(lastUpdatedAt) || lastUpdatedAt > timestamp) {
      state.bosses.lastDominanceUpdatedAt = timestamp;
    }

    return bossDef;
  }

  function isEncounterRetreated(state) {
    return !!(state && state.bosses && state.bosses.encounterStatus === "retreated");
  }

  function getNextLocalDateKey(timestamp) {
    const nextDate = DateUtils.addDaysLocal(new Date(timestamp), 1);
    return DateUtils.getLocalDateKey(nextDate);
  }

  function closeMissionForEncounterDefeat(state, timestamp, cause) {
    const mission = state.bosses.activeMission;
    if (!mission || mission.status !== "active") return null;

    mission.failedAt = timestamp;
    if (cause === "mission_expiration") {
      mission.status = "expired";
      mission.failureReason = null;
    } else {
      mission.status = "failed";
      mission.failureReason = "encounter_defeat";
    }
    archiveMission(state, mission);
    if (mission.status === "expired" && !state.bosses.pendingFailureReasonMissionId) {
      state.bosses.pendingFailureReasonMissionId = mission.id;
    }
    return { ...mission };
  }

  function retreatEncounter(state, now, cause) {
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const bossDef = getCurrentBossDef(state);
    if (!bossDef || isEncounterRetreated(state) || Number(state.bosses.dominance) < DOMINANCE_MAX) {
      return { defeated: false, record: null };
    }

    const attempt = Math.max(1, Number(state.bosses.encounterAttempt) || 1);
    const record = {
      id: [bossDef.id, "loss", attempt, timestamp].join("_"),
      bossId: bossDef.id,
      attempt,
      defeatedAt: timestamp,
      localDate: DateUtils.getLocalDateKey(new Date(timestamp)),
      integrityAtDefeat: Math.max(0, Number(state.bosses.currentHp) || 0),
      maxIntegrity: bossDef.maxHp,
      dominance: DOMINANCE_MAX,
      cause: cause || "dominance"
    };

    closeMissionForEncounterDefeat(state, timestamp, cause);
    if (!Array.isArray(state.bosses.encounterLosses)) state.bosses.encounterLosses = [];
    if (!state.bosses.encounterLosses.some(loss => loss && loss.id === record.id)) {
      state.bosses.encounterLosses.push(record);
    }

    state.bosses.dominance = DOMINANCE_MAX;
    state.bosses.encounterStatus = "retreated";
    state.bosses.encounterDefeatedAt = timestamp;
    state.bosses.retreatedAt = timestamp;
    state.bosses.rematchAvailableDate = getNextLocalDateKey(timestamp);
    state.bosses.pendingDefeatNoticeId = record.id;
    state.bosses.lastDominanceUpdatedAt = timestamp;
    return { defeated: true, record };
  }

  function isRematchAvailable(state, now) {
    if (!isEncounterRetreated(state) || !state.bosses.rematchAvailableDate) return false;
    const date = now instanceof Date ? now : new Date(Number.isFinite(Number(now)) ? Number(now) : Date.now());
    return DateUtils.getLocalDateKey(date) >= state.bosses.rematchAvailableDate;
  }

  function beginRematch(state, now) {
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    if (!isEncounterRetreated(state)) return { started: false, reason: "encounter_not_retreated" };
    if (!isRematchAvailable(state, timestamp)) return { started: false, reason: "rematch_not_available" };

    const bossDef = getCurrentBossDef(state);
    if (!bossDef) return { started: false, reason: "boss_unavailable" };

    state.bosses.encounterStatus = "active";
    state.bosses.encounterAttempt = Math.max(1, Number(state.bosses.encounterAttempt) || 1) + 1;
    state.bosses.encounterStartedAt = timestamp;
    state.bosses.encounterDefeatedAt = null;
    state.bosses.retreatedAt = null;
    state.bosses.rematchAvailableDate = null;
    state.bosses.pendingDefeatNoticeId = null;
    state.bosses.currentHp = bossDef.maxHp;
    state.bosses.dominance = clampDominance(getDominanceConfig(bossDef).starting);
    state.bosses.lastDominanceUpdatedAt = timestamp;
    state.bosses.activeMission = null;
    if (!state.bosses.weakPointStates) state.bosses.weakPointStates = {};
    state.bosses.weakPointStates[bossDef.id] = {};
    return { started: true, bossId: bossDef.id, attempt: state.bosses.encounterAttempt };
  }

  function acknowledgeDefeat(state, defeatId) {
    if (!defeatId || state.bosses.pendingDefeatNoticeId !== defeatId) return false;
    state.bosses.pendingDefeatNoticeId = null;
    return true;
  }

  function updateDominance(state, now, cause) {
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const bossDef = ensureDominanceState(state, timestamp);
    const before = state.bosses.dominance;
    const lastUpdatedAt = Number(state.bosses.lastDominanceUpdatedAt);

    if (!bossDef || isEncounterRetreated(state)) {
      return { before, after: before, increasedBy: 0, encounterDefeated: false, defeatRecord: null };
    }

    if (before >= DOMINANCE_MAX) {
      const defeat = retreatEncounter(state, timestamp, cause || "passive_dominance");
      return { before, after: state.bosses.dominance, increasedBy: 0, encounterDefeated: defeat.defeated, defeatRecord: defeat.record };
    }

    if (timestamp <= lastUpdatedAt) {
      return { before, after: before, increasedBy: 0, encounterDefeated: false, defeatRecord: null };
    }

    const elapsedDays = (timestamp - lastUpdatedAt) / MS_PER_DAY;
    const increase = elapsedDays * getDominanceConfig(bossDef).passivePerDay;
    const after = clampDominance(before + increase);
    state.bosses.dominance = after;
    state.bosses.lastDominanceUpdatedAt = timestamp;

    const defeat = retreatEncounter(state, timestamp, cause || "passive_dominance");

    return {
      before,
      after: state.bosses.dominance,
      increasedBy: clampDominance(after - before),
      encounterDefeated: defeat.defeated,
      defeatRecord: defeat.record
    };
  }

  function applyNormalQuestDominanceReduction(state, now) {
    const passiveUpdate = updateDominance(state, now, "normal_quest");
    const bossDef = getCurrentBossDef(state);
    if (!bossDef || isEncounterRetreated(state) || passiveUpdate.encounterDefeated) {
      return {
        before: state.bosses.dominance,
        after: state.bosses.dominance,
        reducedBy: 0,
        passiveIncrease: passiveUpdate.increasedBy,
        encounterDefeated: passiveUpdate.encounterDefeated,
        defeatRecord: passiveUpdate.defeatRecord
      };
    }
    const requestedReduction = getDominanceConfig(bossDef).normalQuestReduction;
    const before = state.bosses.dominance;
    const after = clampDominance(before - requestedReduction);
    state.bosses.dominance = after;

    return {
      before,
      after,
      reducedBy: clampDominance(before - after),
      passiveIncrease: passiveUpdate.increasedBy,
      encounterDefeated: false,
      defeatRecord: null
    };
  }

  function changeDominance(state, amount, now, cause) {
    const passiveUpdate = updateDominance(state, now, cause);
    if (isEncounterRetreated(state) || passiveUpdate.encounterDefeated) {
      return {
        before: state.bosses.dominance,
        after: state.bosses.dominance,
        changedBy: 0,
        passiveIncrease: passiveUpdate.increasedBy,
        encounterDefeated: passiveUpdate.encounterDefeated,
        defeatRecord: passiveUpdate.defeatRecord
      };
    }
    const before = state.bosses.dominance;
    const after = clampDominance(before + (Number(amount) || 0));
    state.bosses.dominance = after;
    const defeat = retreatEncounter(state, now, cause || "dominance_change");
    return {
      before,
      after: state.bosses.dominance,
      changedBy: Math.round((after - before) * 10000) / 10000,
      passiveIncrease: passiveUpdate.increasedBy,
      encounterDefeated: defeat.defeated,
      defeatRecord: defeat.record
    };
  }

  function getWeakPointStatus(state, bossId, weakPointId) {
    const bossDef = SEED_DATA.bosses[bossId];
    const weakPoint = getWeakPointDef(bossDef, weakPointId);
    if (!bossDef || !weakPoint) return "unavailable";
    if (isEncounterRetreated(state)) return "unavailable";

    const bossStates = state.bosses.weakPointStates && state.bosses.weakPointStates[bossId];
    if (bossStates && bossStates[weakPointId] === "broken") return "broken";

    const activeMission = state.bosses.activeMission;
    if (activeMission && activeMission.status === "active") {
      return activeMission.bossId === bossId && activeMission.weakPointId === weakPointId
        ? "active"
        : "unavailable";
    }

    return Number.isFinite(Number(weakPoint.durationMinutes)) && Number(weakPoint.durationMinutes) > 0
      ? "available"
      : "pending";
  }

  function archiveMission(state, mission) {
    if (!Array.isArray(state.bosses.missionHistory)) state.bosses.missionHistory = [];
    if (!state.bosses.missionHistory.some(item => item.id === mission.id)) {
      state.bosses.missionHistory.push({ ...mission });
    }
    state.bosses.activeMission = null;
  }

  function findPendingFailureReasonMissionId(state) {
    const mission = (state.bosses.missionHistory || []).find(item => item && item.status === "expired" && !item.failureReason);
    return mission ? mission.id : null;
  }

  function closeMissionForCompletedEncounter(state, bossId, now) {
    const mission = state.bosses.activeMission;
    if (!mission || mission.status !== "active" || mission.bossId !== bossId) return;
    mission.status = "cancelled";
    mission.failedAt = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    mission.failureReason = "encounter_complete";
    archiveMission(state, mission);
  }

  function acceptMission(state, bossId, weakPointId, userTarget, now) {
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    processMissionExpiration(state, timestamp);

    const bossDef = SEED_DATA.bosses[bossId];
    const weakPoint = getWeakPointDef(bossDef, weakPointId);
    const cleanTarget = String(userTarget || "").trim().slice(0, 160);
    const durationMinutes = Number(weakPoint && weakPoint.durationMinutes);

    if (isEncounterRetreated(state)) return { accepted: false, reason: "encounter_retreated" };
    if (!bossDef || !weakPoint || state.bosses.currentBossId !== bossId) return { accepted: false, reason: "invalid_weak_point" };
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return { accepted: false, reason: "duration_pending" };
    if (!cleanTarget) return { accepted: false, reason: "target_required" };
    if (state.bosses.activeMission) return { accepted: false, reason: "mission_already_active" };
    if (getWeakPointStatus(state, bossId, weakPointId) === "broken") return { accepted: false, reason: "weak_point_broken" };

    const mission = {
      id: [bossId, weakPointId, timestamp, state.bosses.missionHistory.length + 1].join("_"),
      bossId,
      weakPointId,
      status: "active",
      userTarget: cleanTarget,
      durationMinutes,
      acceptedAt: timestamp,
      deadlineAt: timestamp + (durationMinutes * 60 * 1000),
      completedAt: null,
      failedAt: null,
      failureReason: null,
      integrityDamage: 0,
      dominanceChange: 0
    };
    state.bosses.activeMission = mission;
    return { accepted: true, mission };
  }

  function processMissionExpiration(state, now) {
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const mission = state.bosses.activeMission;
    if (!mission || mission.status !== "active") return { expired: false, mission: null };
    if (timestamp < Number(mission.deadlineAt)) return { expired: false, mission };

    const bossDef = SEED_DATA.bosses[mission.bossId];
    const penalty = Math.max(0, Number(bossDef && bossDef.expirationDominancePenalty) || 0);
    const dominanceOutcome = changeDominance(state, penalty, timestamp, "mission_expiration");
    if (dominanceOutcome.encounterDefeated) {
      const archivedMission = state.bosses.missionHistory.find(item => item.id === mission.id) || mission;
      archivedMission.dominanceChange = dominanceOutcome.changedBy;
      return {
        expired: true,
        mission: { ...archivedMission },
        dominanceIncreased: Math.max(0, dominanceOutcome.changedBy + dominanceOutcome.passiveIncrease),
        encounterDefeated: true,
        defeatRecord: dominanceOutcome.defeatRecord
      };
    }
    mission.status = "expired";
    mission.failedAt = timestamp;
    mission.dominanceChange = dominanceOutcome.changedBy;
    archiveMission(state, mission);
    if (!state.bosses.pendingFailureReasonMissionId) state.bosses.pendingFailureReasonMissionId = mission.id;
    return {
      expired: true,
      mission: { ...mission },
      dominanceIncreased: Math.max(0, dominanceOutcome.changedBy),
      encounterDefeated: false,
      defeatRecord: null
    };
  }

  function completeActiveMission(state, now) {
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const expiration = processMissionExpiration(state, timestamp);
    if (expiration.expired) return { completed: false, ...expiration };

    const mission = state.bosses.activeMission;
    if (!mission || mission.status !== "active") return { completed: false, reason: "no_active_mission" };
    const bossDef = SEED_DATA.bosses[mission.bossId];
    const weakPoint = getWeakPointDef(bossDef, mission.weakPointId);
    if (!bossDef || !weakPoint || state.bosses.currentBossId !== mission.bossId) {
      return { completed: false, reason: "encounter_changed" };
    }

    const requestedReduction = Math.max(0, Number(weakPoint.dominanceReduction) || 0);
    const dominanceOutcome = changeDominance(state, -requestedReduction, timestamp, "mission_completion");
    if (dominanceOutcome.encounterDefeated) {
      return {
        completed: false,
        encounterDefeated: true,
        mission: null,
        defeatRecord: dominanceOutcome.defeatRecord
      };
    }
    mission.status = "completed";
    mission.completedAt = timestamp;
    mission.dominanceChange = dominanceOutcome.changedBy;
    if (!state.bosses.weakPointStates[mission.bossId]) state.bosses.weakPointStates[mission.bossId] = {};
    state.bosses.weakPointStates[mission.bossId][mission.weakPointId] = "broken";
    archiveMission(state, mission);

    const damageOutcome = applyDirectDamage(state, bossDef, bossDef.maxHp * (Number(weakPoint.breakDamagePct) || 0));
    mission.integrityDamage = damageOutcome.damageDealt;
    const historyMission = state.bosses.missionHistory.find(item => item.id === mission.id);
    if (historyMission) historyMission.integrityDamage = damageOutcome.damageDealt;
    recordMissionVictoryGrowth(state, damageOutcome);

    return {
      ...damageOutcome,
      completed: true,
      mission: { ...mission },
      weakPoint,
      dominanceReduced: Math.max(0, -dominanceOutcome.changedBy)
    };
  }

  function cancelActiveMission(state, now) {
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const expiration = processMissionExpiration(state, timestamp);
    if (expiration.expired) return { cancelled: false, ...expiration };

    const mission = state.bosses.activeMission;
    if (!mission || mission.status !== "active") return { cancelled: false, reason: "no_active_mission" };
    const bossDef = SEED_DATA.bosses[mission.bossId];
    const penalty = Math.max(0, Number(bossDef && bossDef.cancellationDominancePenalty) || 0);
    const dominanceOutcome = changeDominance(state, penalty, timestamp, "mission_cancellation");
    if (dominanceOutcome.encounterDefeated) {
      const archivedMission = state.bosses.missionHistory.find(item => item.id === mission.id);
      if (archivedMission) archivedMission.dominanceChange = dominanceOutcome.changedBy;
      return {
        cancelled: true,
        encounterDefeated: true,
        mission: null,
        dominanceIncreased: Math.max(0, dominanceOutcome.changedBy + dominanceOutcome.passiveIncrease),
        defeatRecord: dominanceOutcome.defeatRecord
      };
    }
    mission.status = "cancelled";
    mission.failedAt = timestamp;
    mission.dominanceChange = dominanceOutcome.changedBy;
    archiveMission(state, mission);
    return { cancelled: true, mission: { ...mission }, dominanceIncreased: Math.max(0, dominanceOutcome.changedBy) };
  }

  function setMissionFailureReason(state, missionId, reason) {
    const allowedReasons = ["time_underestimated", "task_too_large", "forgot_or_lost_focus", "external_blocker", "wrong_mission"];
    if (!allowedReasons.includes(reason)) return false;
    const mission = (state.bosses.missionHistory || []).find(item => item.id === missionId && item.status === "expired");
    if (!mission) return false;
    mission.failureReason = reason;
    if (state.bosses.pendingFailureReasonMissionId === missionId) {
      state.bosses.pendingFailureReasonMissionId = findPendingFailureReasonMissionId(state);
    }
    return true;
  }

  function getQuestDamageBreakdown(bossDef, quest) {
    if (!bossDef || !quest) return { baseDamage: 0, bonusDamage: 0, totalDamage: 0, matches: [] };

    const questXp = Number(quest.xp) || 0;
    const baseDamage = (bossDef.baseDamagePerXp || 0) * questXp;
    let bonusDamage = 0;
    const matches = [];

    (bossDef.damageRules || []).forEach(rule => {
      let ruleDamage = 0;
      if (rule.matchType === "attribute" && rule.match === quest.attribute) {
        ruleDamage = (rule.damagePerXp || 0) * questXp;
      } else if (rule.matchType === "tag" && Array.isArray(quest.tags) && quest.tags.includes(rule.match)) {
        ruleDamage = (rule.damagePerXp || 0) * questXp;
      } else if (rule.matchType === "titleContains" && typeof quest.title === "string" && quest.title.toLowerCase().includes(String(rule.match).toLowerCase())) {
        ruleDamage = rule.damage || 0;
      }

      if (ruleDamage > 0) {
        bonusDamage += ruleDamage;
        matches.push({ matchType: rule.matchType, match: rule.match, damage: Math.round(ruleDamage) });
      }
    });

    return {
      baseDamage: Math.round(baseDamage),
      bonusDamage: Math.round(bonusDamage),
      totalDamage: Math.round(baseDamage + bonusDamage),
      matches
    };
  }

  // Computes how much damage a completed quest deals. Every quest chips
  // the active boss; matching attribute/specialization rules add bonuses.
  function computeDamage(bossDef, quest) {
    return getQuestDamageBreakdown(bossDef, quest).totalDamage;
  }

  function getTodayLog(state) {
    if (!state.dailyLog) state.dailyLog = {};
    const today = DateUtils.getLocalDateKey();
    if (!state.dailyLog[today]) {
      state.dailyLog[today] = { xp: 0, questsCompleted: 0, questsMissed: 0, attributeXp: {} };
    }
    const log = state.dailyLog[today];
    const savedXp = Number(log.xp);
    log.xp = Number.isFinite(savedXp) ? savedXp : 0;
    if (!Array.isArray(log.growthEvents)) log.growthEvents = [];
    return log;
  }

  function recordMissionVictoryGrowth(state, outcome) {
    if (!outcome || !outcome.defeated) return;
    const log = getTodayLog(state);
    if (outcome.playerLeveledUp) log.growthEvents.push({ type: "level", value: state.level });
    (outcome.newAchievements || []).forEach(def => log.growthEvents.push({ type: "achievement", value: def.name }));
    (outcome.newMilestoneTitles || []).forEach(def => log.growthEvents.push({ type: "title", value: def.name }));
    log.growthEvents.push({ type: "boss", value: outcome.bossId });
  }

  function finishBoss(state, bossDef, damageDealt) {
    closeMissionForCompletedEncounter(state, bossDef.id, Date.now());
    if (!state.bosses.defeated.includes(bossDef.id)) state.bosses.defeated.push(bossDef.id);
    if (!state.bosses.titlesEarned) state.bosses.titlesEarned = [];
    if (!state.bosses.titlesEarned.includes(bossDef.rewards.title)) state.bosses.titlesEarned.push(bossDef.rewards.title);

    const rewardXp = Math.max(0, Number(bossDef.rewards.xp) || 0);
    const rewardCredits = Math.max(0, Number(bossDef.rewards.credits) || 0);
    const previousLevel = state.level;
    state.xp += rewardXp;
    state.lifetimeXp += rewardXp;
    state.level = Leveling.levelFromTotalXp(state.xp);
    state.rewards.credits += rewardCredits;
    state.rewards.totalCreditsEarned += rewardCredits;
    getTodayLog(state).xp += rewardXp;

    const newAchievements = Achievements.checkAll(state);
    const newMilestoneTitles = Ranks.checkMilestoneTitles(state);

    const nextBossId = bossDef.nextBossId;
    const nextBossDef = nextBossId ? SEED_DATA.bosses[nextBossId] : null;
    const nextStartedAt = Date.now();
    state.bosses.currentBossId = nextBossId;
    state.bosses.currentHp = nextBossDef ? nextBossDef.maxHp : 0;
    state.bosses.encounterStatus = "active";
    state.bosses.encounterAttempt = 1;
    state.bosses.encounterStartedAt = nextStartedAt;
    state.bosses.encounterDefeatedAt = null;
    state.bosses.retreatedAt = null;
    state.bosses.rematchAvailableDate = null;
    state.bosses.pendingDefeatNoticeId = null;
    initializeDominance(state, nextBossDef, nextStartedAt);

    return {
      damageDealt,
      defeated: true,
      bossId: bossDef.id,
      rewards: bossDef.rewards,
      nextBossId,
      nextBossDef,
      playerLeveledUp: state.level > previousLevel,
      newAchievements,
      newMilestoneTitles
    };
  }

  function applyDirectDamage(state, bossDef, requestedDamage) {
    if (!bossDef || isEncounterRetreated(state) || state.bosses.currentBossId !== bossDef.id) return { damageDealt: 0, defeated: false };

    const currentHp = Math.max(0, Number(state.bosses.currentHp) || 0);
    const damageDealt = Math.min(currentHp, Math.max(0, Math.round(requestedDamage)));
    if (damageDealt <= 0) return { damageDealt: 0, defeated: false, bossId: bossDef.id };

    state.bosses.currentHp = currentHp - damageDealt;
    logDamage(state, bossDef.id, damageDealt);
    if (state.bosses.currentHp <= 0) return finishBoss(state, bossDef, damageDealt);
    return { damageDealt, defeated: false, bossId: bossDef.id };
  }

  // Applies a completed quest's damage to the current boss. If this brings
  // HP to 0 or below: grants boss rewards, marks it defeated, and advances
  // to the next boss in the roster (HP reset to that boss's maxHp).
  // Returns enough info for the UI to show a victory screen if needed.
  function applyQuestDamage(state, quest) {
    const bossDef = getCurrentBossDef(state);
    if (!bossDef) return { damageDealt: 0, defeated: false };

    const damage = computeDamage(bossDef, quest);
    if (damage <= 0) return { damageDealt: 0, defeated: false };

    return applyDirectDamage(state, bossDef, damage);
  }

  function getWeakPointDef(bossDef, weakPointId) {
    return bossDef && Array.isArray(bossDef.weakPoints)
      ? bossDef.weakPoints.find(point => point.id === weakPointId) || null
      : null;
  }

  function getContract(state, bossId, weakPointId) {
    return state.bosses.contracts && state.bosses.contracts[bossId]
      ? state.bosses.contracts[bossId][weakPointId] || null
      : null;
  }

  function createContract(state, bossId, weakPointId, title, checkpointLabels) {
    const bossDef = SEED_DATA.bosses[bossId];
    const weakPoint = getWeakPointDef(bossDef, weakPointId);
    const cleanTitle = String(title || "").trim().slice(0, 120);
    if (!bossDef || !weakPoint || !cleanTitle || isEncounterRetreated(state) || state.bosses.currentBossId !== bossId) return null;

    const labels = (Array.isArray(checkpointLabels) ? checkpointLabels : [])
      .map(label => String(label || "").trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 5);
    if (labels.length === 0) labels.push("Finish the project");

    if (!state.bosses.contracts) state.bosses.contracts = {};
    if (!state.bosses.contracts[bossId]) state.bosses.contracts[bossId] = {};

    const contract = {
      bossId,
      weakPointId,
      title: cleanTitle,
      checkpoints: labels.map((label, index) => ({ id: "step_" + (index + 1), label, done: false, completedAt: null })),
      createdAt: DateUtils.getLocalDateKey(),
      completed: false,
      completedAt: null,
      damageDealt: 0
    };
    state.bosses.contracts[bossId][weakPointId] = contract;
    return contract;
  }

  function completeContractCheckpoint(state, bossId, weakPointId, checkpointId) {
    const bossDef = SEED_DATA.bosses[bossId];
    const weakPoint = getWeakPointDef(bossDef, weakPointId);
    const contract = getContract(state, bossId, weakPointId);
    if (!bossDef || !weakPoint || !contract || contract.completed || isEncounterRetreated(state) || state.bosses.currentBossId !== bossId) {
      return { completed: false, contractCompleted: false, damageDealt: 0, defeated: false };
    }

    const checkpoint = contract.checkpoints.find(step => step.id === checkpointId);
    if (!checkpoint || checkpoint.done) return { completed: false, contractCompleted: false, damageDealt: 0, defeated: false };

    checkpoint.done = true;
    checkpoint.completedAt = DateUtils.getLocalDateKey();
    const contractCompleted = contract.checkpoints.every(step => step.done);
    if (!contractCompleted) return { completed: true, contractCompleted: false, damageDealt: 0, defeated: false };

    contract.completed = true;
    contract.completedAt = DateUtils.getLocalDateKey();
    if (!state.bosses.weakPointStates) state.bosses.weakPointStates = {};
    if (!state.bosses.weakPointStates[bossId]) state.bosses.weakPointStates[bossId] = {};
    state.bosses.weakPointStates[bossId][weakPointId] = "broken";
    const outcome = applyDirectDamage(state, bossDef, bossDef.maxHp * weakPoint.breakDamagePct);
    contract.damageDealt = outcome.damageDealt;
    return { ...outcome, completed: true, contractCompleted: true, contract, weakPoint };
  }

  function abandonContract(state, bossId, weakPointId) {
    const contract = getContract(state, bossId, weakPointId);
    if (!contract || contract.completed) return false;
    delete state.bosses.contracts[bossId][weakPointId];
    return true;
  }

  // Per-day damage log, keyed the same way dailyLog/xp tracking already is,
  // so stats.html can chart "boss damage over time" without inventing a
  // second date-bucketing scheme.
  function logDamage(state, bossId, damage) {
    if (!state.bosses.damageHistory) state.bosses.damageHistory = {};
    const today = DateUtils.getLocalDateKey();
    if (!state.bosses.damageHistory[today]) state.bosses.damageHistory[today] = 0;
    state.bosses.damageHistory[today] += damage;
  }

  function getDamageHistory(state) {
    return state.bosses.damageHistory || {};
  }

  function getBossProgress(state) {
    const bossDef = getCurrentBossDef(state);
    if (!bossDef) return null;
    return {
      id: bossDef.id,
      name: bossDef.name,
      icon: bossDef.icon,
      lore: bossDef.lore,
      ability: bossDef.ability,
      description: bossDef.description,
      hp: state.bosses.currentHp,
      maxHp: bossDef.maxHp,
      dominance: state.bosses.dominance,
      encounterStatus: state.bosses.encounterStatus,
      encounterAttempt: state.bosses.encounterAttempt,
      rematchAvailableDate: state.bosses.rematchAvailableDate,
      pct: Math.round((state.bosses.currentHp / bossDef.maxHp) * 100),
      rewards: bossDef.rewards,
      weakPoints: bossDef.weakPoints || [],
      nextBossDef: bossDef.nextBossId ? SEED_DATA.bosses[bossDef.nextBossId] : null
    };
  }

  // Returns the full boss roster in defeat order, each annotated with
  // whether it's defeated/current/locked — used by the boss progression
  // screen so the player can see the whole campaign at a glance, not just
  // the current fight.
  function getRoster(state) {
    const roster = [];
    let bossId = findFirstBossId();
    const visited = new Set();
    while (bossId && !visited.has(bossId)) {
      visited.add(bossId);
      const def = SEED_DATA.bosses[bossId];
      if (!def) break;
      roster.push({
        id: def.id,
        name: def.name,
        icon: def.icon,
        description: def.description,
        rewards: def.rewards,
        status: state.bosses.defeated.includes(def.id)
          ? "defeated"
          : (state.bosses.currentBossId === def.id ? (isEncounterRetreated(state) ? "retreated" : "current") : "locked")
      });
      bossId = def.nextBossId;
    }
    return roster;
  }

  // Finds the entry boss (the one no other boss points to via nextBossId),
  // so getRoster always starts from the true beginning of the campaign
  // regardless of how far the player has progressed.
  function findFirstBossId() {
    const allIds = Object.keys(SEED_DATA.bosses);
    const pointedTo = new Set(allIds.map(id => SEED_DATA.bosses[id].nextBossId).filter(Boolean));
    return allIds.find(id => !pointedTo.has(id)) || allIds[0];
  }

  return {
    getCurrentBossDef,
    isEncounterRetreated,
    isRematchAvailable,
    beginRematch,
    acknowledgeDefeat,
    updateDominance,
    applyNormalQuestDominanceReduction,
    getWeakPointStatus,
    acceptMission,
    processMissionExpiration,
    completeActiveMission,
    cancelActiveMission,
    setMissionFailureReason,
    getQuestDamageBreakdown,
    computeDamage,
    applyQuestDamage,
    getBossProgress,
    getRoster,
    getDamageHistory,
    getContract,
    createContract,
    completeContractCheckpoint,
    abandonContract
  };
})();

if (typeof window !== "undefined") window.Bosses = Bosses;
