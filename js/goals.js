(function (global) {
  const MAX_SELECTED = 3;

  function definitions() {
    return Array.isArray(SEED_DATA.goalCategories) ? SEED_DATA.goalCategories : [];
  }

  function validGoalIds() {
    return new Set(definitions().map(goal => goal.id));
  }

  function normalizeSelection(goalIds) {
    const validIds = validGoalIds();
    return [...new Set(Array.isArray(goalIds) ? goalIds : [])]
      .filter(id => validIds.has(id))
      .slice(0, MAX_SELECTED);
  }

  function cleanDetails(details, selected) {
    const source = details && typeof details === "object" && !Array.isArray(details) ? details : {};
    return selected.reduce((result, goalId) => {
      const value = typeof source[goalId] === "string"
        ? source[goalId].trim().replace(/\s+/g, " ").slice(0, 120)
        : "";
      if (value) result[goalId] = value;
      return result;
    }, {});
  }

  function setSelection(state, goalIds, details) {
    const selected = normalizeSelection(goalIds);
    state.goals = {
      selected,
      details: cleanDetails(details, selected),
      onboardingComplete: selected.length > 0,
      suggestionsAccepted: false,
      lastSuggestionDate: null
    };
    return state.goals;
  }

  function shouldOfferSuggestions(state, dateKey) {
    const goals = state && state.goals;
    if (!goals || !goals.onboardingComplete || normalizeSelection(goals.selected).length === 0) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) return false;
    return goals.lastSuggestionDate !== dateKey;
  }

  function markSuggestionsHandled(state, dateKey) {
    if (!state || !state.goals || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) return null;
    state.goals.lastSuggestionDate = dateKey;
    state.goals.suggestionsAccepted = true;
    return state.goals;
  }

  function getSuggestions(state, limit = MAX_SELECTED) {
    const selected = normalizeSelection(state && state.goals && state.goals.selected);
    const templates = Array.isArray(SEED_DATA.questTemplates) ? SEED_DATA.questTemplates : [];
    const maximum = Math.max(0, Math.floor(Number(limit) || 0));
    const suggestions = [];
    const usedIds = new Set();

    selected.forEach(goalId => {
      const match = templates.find(template =>
        !usedIds.has(template.id) &&
        Array.isArray(template.goalTags) &&
        template.goalTags.includes(goalId)
      );
      if (match && suggestions.length < maximum) {
        suggestions.push({ template: match, goalId });
        usedIds.add(match.id);
      }
    });

    if (suggestions.length < maximum) {
      templates.forEach(template => {
        if (suggestions.length >= maximum || usedIds.has(template.id)) return;
        if (!Array.isArray(template.goalTags) || !template.goalTags.some(tag => selected.includes(tag))) return;
        suggestions.push({
          template,
          goalId: selected.find(goalId => template.goalTags.includes(goalId)) || null
        });
        usedIds.add(template.id);
      });
    }

    return suggestions.map(suggestion => ({
      ...suggestion.template,
      suggestedForGoalId: suggestion.goalId
    }));
  }

  global.Goals = {
    maxSelected: MAX_SELECTED,
    definitions,
    normalizeSelection,
    setSelection,
    shouldOfferSuggestions,
    markSuggestionsHandled,
    getSuggestions
  };
})(typeof window !== "undefined" ? window : globalThis);
