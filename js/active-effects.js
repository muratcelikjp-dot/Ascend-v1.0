(function (global) {
  const DEFINITIONS = {
    momentum: {
      id: "momentum",
      label: "Momentum",
      description: "Next Side Quest grants +10% XP",
      icon: "ti-bolt",
      questXpMultiplier: 0.1,
      eligibleQuestTypes: ["side"]
    }
  };

  function ensureState(state) {
    if (!state.activeEffects || typeof state.activeEffects !== "object" || Array.isArray(state.activeEffects)) {
      state.activeEffects = { active: [] };
    }
    if (!Array.isArray(state.activeEffects.active)) state.activeEffects.active = [];
    return state.activeEffects;
  }

  function todayDateKey() {
    return global.DateUtils.getLocalDateKey();
  }

  function pruneExpired(state, dateKey) {
    const effects = ensureState(state);
    const today = dateKey || todayDateKey();
    const previousCount = effects.active.length;
    effects.active = effects.active.filter(effect => effect && effect.dateKey === today && DEFINITIONS[effect.id]);
    return previousCount - effects.active.length;
  }

  function activate(state, effectId, source) {
    const definition = DEFINITIONS[effectId];
    if (!definition) return { ok: false, activated: false, effect: null };

    const today = todayDateKey();
    const effects = ensureState(state);
    pruneExpired(state, today);
    const existing = effects.active.find(effect => effect.id === effectId && effect.dateKey === today);
    if (existing) return { ok: true, activated: false, effect: existing };

    const effect = {
      id: effectId,
      dateKey: today,
      activatedAt: Date.now(),
      sourceQuestId: source && source.id ? source.id : null,
      sourceQuestTitle: source && source.title ? source.title : null
    };
    effects.active.push(effect);
    return { ok: true, activated: true, effect };
  }

  function getActive(state, dateKey) {
    const effects = ensureState(state);
    const today = dateKey || todayDateKey();
    return effects.active
      .filter(effect => effect && effect.dateKey === today && DEFINITIONS[effect.id])
      .map(effect => ({ ...effect, ...DEFINITIONS[effect.id] }));
  }

  function getDefinition(effectId) {
    const definition = DEFINITIONS[effectId];
    return definition ? { ...definition } : null;
  }

  function getQuestXpBonus(state, quest) {
    if (!quest) return { multiplier: 0, effect: null };
    const effect = getActive(state).find(active => {
      const eligibleTypes = Array.isArray(active.eligibleQuestTypes) ? active.eligibleQuestTypes : [];
      return eligibleTypes.includes(quest.questType) && Number(active.questXpMultiplier) > 0;
    });
    return effect ? { multiplier: Number(effect.questXpMultiplier), effect } : { multiplier: 0, effect: null };
  }

  function consume(state, effectId, dateKey) {
    const effects = ensureState(state);
    const today = dateKey || todayDateKey();
    const index = effects.active.findIndex(effect => effect && effect.id === effectId && effect.dateKey === today);
    if (index < 0) return { consumed: false, effect: null };
    const effect = effects.active.splice(index, 1)[0];
    return { consumed: true, effect };
  }

  global.ActiveEffects = { activate, consume, getActive, getDefinition, getQuestXpBonus, pruneExpired };
})(typeof window !== "undefined" ? window : globalThis);
