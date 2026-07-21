// js/rewards.js
//
// Custom reward CRUD plus purchase logic. Credits are earned alongside XP
// but remain a separate spendable balance, so redeeming a real-life reward
// can never lower the player's level or erase character progression.

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
    const cost = Math.max(0, Number(reward.cost) || 0);
    if (state.rewards.credits < cost) return { success: false, reason: "insufficient_credits", shortfall: cost - state.rewards.credits };

    state.rewards.credits -= cost;
    state.rewards.totalCreditsSpent += cost;

    state.rewards.purchased.push({
      id: "pur_" + Date.now(),
      rewardId: reward.id,
      rewardName: reward.name,
      category: reward.category,
      cost,
      currency: "credits",
      purchasedAt: new Date().toISOString()
    });

    // Check achievements right after the purchase counters update, so
    // "First Purchase" and "Big Spender" (both defined against
    // rewards.purchased.length / rewards.totalCreditsSpent) can actually
    // unlock. Without this call they were dead data — defined in the
    // roster but never evaluated by anything.
    const newAchievements = Achievements.checkAll(state);
    const newMilestoneTitles = Ranks.checkMilestoneTitles(state);

    return { success: true, reward, newCredits: state.rewards.credits, newAchievements, newMilestoneTitles };
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

  function getTotalCreditsSpent(state) {
    return state.rewards.totalCreditsSpent || 0;
  }

  // Breaks down purchase history by category, for the rewards stats panel.
  function getCategoryBreakdown(state) {
    const breakdown = {};
    state.rewards.purchased.forEach(p => {
      const cat = p.category || "other";
      if (!breakdown[cat]) breakdown[cat] = { count: 0, totalCredits: 0 };
      breakdown[cat].count += 1;
      breakdown[cat].totalCredits += p.cost;
    });
    return breakdown;
  }

  return { addReward, editReward, deleteReward, purchaseReward, isLocked, getAll, getByCategory, getPurchaseHistory, getTotalCreditsSpent, getCategoryBreakdown };
})();

if (typeof window !== "undefined") window.Rewards = Rewards;
