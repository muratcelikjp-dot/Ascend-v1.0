(function (global) {
  const DEFINITIONS = {
    journey_timeline: {
      id: "journey_timeline",
      label: "Journey Timeline",
      requirementType: "quests_completed",
      required: 1
    }
  };

  function getCurrentValue(state, definition) {
    if (definition.requirementType === "quests_completed") {
      return Math.max(0, Number(state.quests && state.quests.totalCompletedEver) || 0);
    }
    return 0;
  }

  function getStatus(state, featureId) {
    const definition = DEFINITIONS[featureId];
    if (!definition) return null;
    const current = getCurrentValue(state, definition);
    const required = definition.required;
    return {
      id: definition.id,
      label: definition.label,
      requirementType: definition.requirementType,
      current,
      required,
      remaining: Math.max(0, required - current),
      progress: Math.min(1, current / Math.max(1, required)),
      unlocked: current >= required
    };
  }

  function getAll(state) {
    return Object.keys(DEFINITIONS).map(featureId => getStatus(state, featureId));
  }

  global.ProgressiveUnlocks = { getAll, getStatus };
})(typeof window !== "undefined" ? window : globalThis);
