// js/attributes.js
//
// Handles applying XP to a specific attribute and recalculating that
// attribute's level. Does not touch localStorage directly — operates on
// a state object passed in, intended to be called from within a
// GameState.set(fn) callback so the caller controls persistence timing.

const Attributes = (function () {

  const VALID_ATTRIBUTES = ["intelligence", "strength", "charisma", "willpower"];

  // Applies XP to one attribute, recalculates its level, and returns
  // whether the attribute leveled up (so callers can trigger UI feedback
  // like the level-up toast, without recalculating anything themselves).
  function applyXp(state, attributeId, amount) {
    if (!VALID_ATTRIBUTES.includes(attributeId)) {
      console.warn("Attributes.applyXp: unknown attribute id:", attributeId);
      return { leveledUp: false };
    }
    const attr = state.attributes[attributeId];
    const previousLevel = attr.level;

    attr.xp += amount;
    if (!attr.lifetimeXp) attr.lifetimeXp = 0; // backward-compat for older saves
    attr.lifetimeXp += amount;

    const progress = Leveling.progressWithinLevel(totalLifetimeXpToCurveXp(attr));
    attr.level = progress.level;

    return { leveledUp: attr.level > previousLevel, previousLevel, newLevel: attr.level };
  }

  // Removes XP from an attribute (used by the penalty system) and allows
  // the level to actually drop, not just stall — this is intentional per
  // the discipline-decay design: penalties should be able to regress a
  // level, not just zero out in-level progress.
  function removeXp(state, attributeId, amount) {
    if (!VALID_ATTRIBUTES.includes(attributeId)) return { leveledDown: false };
    const attr = state.attributes[attributeId];
    const previousLevel = attr.level;

    attr.xp = Math.max(0, attr.xp - amount);

    const progress = Leveling.progressWithinLevel(totalLifetimeXpToCurveXp(attr));
    attr.level = progress.level;

    return { leveledDown: attr.level < previousLevel, previousLevel, newLevel: attr.level };
  }

  // Internal helper: the leveling curve is keyed off "xp" (current,
  // reducible) rather than lifetimeXp, since attribute levels should be
  // able to regress under the penalty system. lifetimeXp is tracked
  // separately purely for achievement checks like "Scholar."
  function totalLifetimeXpToCurveXp(attr) {
    return attr.xp;
  }

  function getAll(state) {
    return state.attributes;
  }

  function getXpProgress(state, attributeId) {
    const attr = state.attributes[attributeId];
    return Leveling.progressWithinLevel(attr.xp);
  }

  return { VALID_ATTRIBUTES, applyXp, removeXp, getAll, getXpProgress };
})();

if (typeof window !== "undefined") window.Attributes = Attributes;
