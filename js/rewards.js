// js/rewards.js
//
// Custom reward CRUD plus purchase logic. Purchasing deducts from the
// player's current xp (spendable currency), not lifetimeXp — lifetimeXp
// is a permanent achievement/stats counter and should never be reduced by
// spending, only by the penalty system reducing actual level progress.
// This means buying rewards can lower your effective level (since level is
// derived from current xp), which is an intentional trade-off: rewards
// cost real progress, not free points layered on top.

const Rewards = (function () {

  function addReward(state, { name, cost, category, requiredLevel, isPremium }) {
    const reward = {
      id: "rw_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name, cost,
      category: category || "other",
      requiredLevel: requiredLevel || 1,
      isPremium: !!isPremium,
      createdAt: new Date().toISOString()
    };
    state.rewards.custom.push(reward);
    return reward;
  }

  function editReward(state, rewardId, { name, cost, category, requiredLevel, isPremium }) {
    const reward = state.rewards.custom.find(r => r.id === rewardId);
    if (!reward) return null;
    if (name != null) reward.name = name;
    if (cost != null) reward.cost = cost;
    if (category != null) reward.category = category;
    if (requiredLevel != null) reward.requiredLevel = requiredLevel;
    if (isPremium != null) reward.isPremium = isPremium;
    return reward;
  }

  function deleteReward(state, rewardId) {
    state.rewards.custom = state.rewards.custom.filter(r => r.id !== rewardId);
  }

  function isLocked(state, reward) {
    return state.level < (reward.requiredLevel || 1);
  }

  // Returns { success: false, reason } if the player can't afford it OR
  // hasn't reached the reward's required level — both are real, enforced
  // gates now, not just visual hints. Previously requiredLevel existed
  // only in seed data and was never actually checked here, meaning a
  // level-1 player could buy a "level 8 required" reward with no
  // obstacle at all.
  function purchaseReward(state, rewardId) {
    const reward = state.rewards.custom.find(r => r.id === rewardId);
    if (!reward) return { success: false, reason: "not_found" };
    if (isLocked(state, reward)) return { success: false, reason: "level_locked", requiredLevel: reward.requiredLevel, currentLevel: state.level };
    if (state.xp < reward.cost) return { success: false, reason: "insufficient_xp", shortfall: reward.cost - state.xp };

    state.xp -= reward.cost;
    state.level = Leveling.levelFromTotalXp(state.xp);
    if (!state.rewards.totalXpSpent) state.rewards.totalXpSpent = 0;
    state.rewards.totalXpSpent += reward.cost;

    state.rewards.purchased.push({
      id: "pur_" + Date.now(),
      rewardId: reward.id,
      rewardName: reward.name,
      category: reward.category,
      cost: reward.cost,
      purchasedAt: new Date().toISOString()
    });

    return { success: true, reward, newXp: state.xp, newLevel: state.level };
  }

  function getAll(state) {
    return state.rewards.custom;
  }

  function getByCategory(state, categoryId) {
    if (categoryId === "all") return state.rewards.custom;
    return state.rewards.custom.filter(r => r.category === categoryId);
  }

  function getPurchaseHistory(state) {
    return state.rewards.purchased;
  }

  function getTotalXpSpent(state) {
    return state.rewards.totalXpSpent || 0;
  }

  // Breaks down purchase history by category, for the rewards stats panel.
  function getCategoryBreakdown(state) {
    const breakdown = {};
    state.rewards.purchased.forEach(p => {
      const cat = p.category || "other";
      if (!breakdown[cat]) breakdown[cat] = { count: 0, totalXp: 0 };
      breakdown[cat].count += 1;
      breakdown[cat].totalXp += p.cost;
    });
    return breakdown;
  }

  return { addReward, editReward, deleteReward, purchaseReward, isLocked, getAll, getByCategory, getPurchaseHistory, getTotalXpSpent, getCategoryBreakdown };
})();

if (typeof window !== "undefined") window.Rewards = Rewards;
