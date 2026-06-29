// js/skills.js
//
// Skills unlock automatically when an attribute reaches the required level
// — no perk-point spending in this version, matching the spec's "skills
// unlock automatically based on attribute levels." (Note: this intentionally
// supersedes the earlier perk-point hex-grid prototype's spending mechanic;
// see the integration note in chat for why — the new prompt asks for
// automatic unlock, so that takes precedence for this build.)

const Skills = (function () {

  // Called right after an attribute gains XP. Checks that attribute's
  // skill list and unlocks anything newly eligible. Returns the list of
  // skills newly unlocked this call.
  function checkAndUnlock(state, attributeId) {
    const tree = SEED_DATA.skillTree[attributeId];
    if (!tree) return [];

    const attrLevel = state.attributes[attributeId].level;
    const newlyUnlocked = [];

    tree.forEach(skill => {
      if (state.skills.unlocked.includes(skill.id)) return;
      if (attrLevel >= skill.requiredLevel) {
        state.skills.unlocked.push(skill.id);
        newlyUnlocked.push(skill);
      }
    });

    return newlyUnlocked;
  }

  function getUnlockedForAttribute(state, attributeId) {
    const tree = SEED_DATA.skillTree[attributeId] || [];
    return tree.filter(s => state.skills.unlocked.includes(s.id));
  }

  function getAllForAttribute(state, attributeId) {
    const tree = SEED_DATA.skillTree[attributeId] || [];
    return tree.map(s => ({ ...s, unlocked: state.skills.unlocked.includes(s.id) }));
  }

  function getTotalUnlockedCount(state) {
    return state.skills.unlocked.length;
  }

  // Sums every unlocked skill's passiveBonus.multiplier for a given
  // attribute, returning a total multiplier (e.g. 0.13 = +13% XP).
  // Called by the quest-completion flow BEFORE Attributes.applyXp, so the
  // bonus actually changes how much XP is gained — not just a number
  // displayed on a card that does nothing.
  function getPassiveXpMultiplier(state, attributeId) {
    const tree = SEED_DATA.skillTree[attributeId];
    if (!tree) return 0;
    return tree.reduce((total, skill) => {
      if (state.skills.unlocked.includes(skill.id) && skill.passiveBonus && skill.passiveBonus.attribute === attributeId) {
        return total + skill.passiveBonus.multiplier;
      }
      return total;
    }, 0);
  }

  return { checkAndUnlock, getUnlockedForAttribute, getAllForAttribute, getTotalUnlockedCount, getPassiveXpMultiplier };
})();

if (typeof window !== "undefined") window.Skills = Skills;
