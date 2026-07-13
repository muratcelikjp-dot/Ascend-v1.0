// js/bosses.js
//
// Bosses take damage from quest completions based on damageRules defined
// in seed-data.js (per boss). A rule matches either by attribute or by a
// substring in the quest title, so non-engineers (or future-you) can add
// new bosses purely by editing data, e.g.:
//   { matchType: "titleContains", match: "cold shower", damage: 80 }

const Bosses = (function () {

  function getCurrentBossDef(state) {
    return SEED_DATA.bosses[state.bosses.currentBossId] || null;
  }

  // Computes how much damage a single completed quest deals to the
  // current boss, based on every matching rule (rules can stack).
  function computeDamage(bossDef, quest) {
    let total = 0;
    bossDef.damageRules.forEach(rule => {
      if (rule.matchType === "attribute" && rule.match === quest.attribute) {
        total += (rule.damagePerXp || 0) * quest.xp;
      } else if (rule.matchType === "tag" && Array.isArray(quest.tags) && quest.tags.includes(rule.match)) {
        total += (rule.damagePerXp || 0) * quest.xp;
      } else if (rule.matchType === "titleContains" && quest.title.toLowerCase().includes(rule.match.toLowerCase())) {
        total += rule.damage || 0;
      }
    });
    return Math.round(total);
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

    state.bosses.currentHp = Math.max(0, state.bosses.currentHp - damage);
    logDamage(state, bossDef.id, damage);

    if (state.bosses.currentHp <= 0) {
      state.bosses.defeated.push(bossDef.id);
      if (!state.bosses.titlesEarned) state.bosses.titlesEarned = [];
      state.bosses.titlesEarned.push(bossDef.rewards.title);

      // Grant rewards directly — bosses.js is allowed to touch player-level
      // XP here since this is the one place a "defeat" event naturally
      // produces a reward; everything still flows through the same state
      // object the caller will persist via GameState.set().
      state.xp += bossDef.rewards.xp;
      state.lifetimeXp += bossDef.rewards.xp;
      state.level = Leveling.levelFromTotalXp(state.xp);

      const nextBossId = bossDef.nextBossId;
      const nextBossDef = nextBossId ? SEED_DATA.bosses[nextBossId] : null;

      state.bosses.currentBossId = nextBossId;
      state.bosses.currentHp = nextBossDef ? nextBossDef.maxHp : 0;

      return { damageDealt: damage, defeated: true, bossId: bossDef.id, rewards: bossDef.rewards, nextBossId, nextBossDef };
    }

    return { damageDealt: damage, defeated: false, bossId: bossDef.id };
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
      pct: Math.round((state.bosses.currentHp / bossDef.maxHp) * 100),
      rewards: bossDef.rewards,
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
          : (state.bosses.currentBossId === def.id ? "current" : "locked")
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

  return { getCurrentBossDef, computeDamage, applyQuestDamage, getBossProgress, getRoster, getDamageHistory };
})();

if (typeof window !== "undefined") window.Bosses = Bosses;
