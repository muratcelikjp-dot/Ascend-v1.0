(function (global) {
  const CAPACITIES = ["low", "steady", "strong"];
  const LOAD_PROFILES = {
    low: { recommendedQuestCount: 1, label: "Essential focus" },
    steady: { recommendedQuestCount: 3, label: "Balanced deployment" },
    strong: { recommendedQuestCount: 5, label: "Expanded deployment" }
  };

  function ensureState(state) {
    if (!state.dailyState || typeof state.dailyState !== "object" || Array.isArray(state.dailyState)) {
      state.dailyState = { checkIns: {} };
    }
    if (!state.dailyState.checkIns || typeof state.dailyState.checkIns !== "object" || Array.isArray(state.dailyState.checkIns)) {
      state.dailyState.checkIns = {};
    }
    return state.dailyState;
  }

  function getDateKey(date) {
    return global.DateUtils.getLocalDateKey(date || new Date());
  }

  function get(state, dateKey) {
    const dailyState = ensureState(state);
    return dailyState.checkIns[dateKey] || null;
  }

  function getToday(state) {
    return get(state, getDateKey());
  }

  function set(state, capacity, dateKey) {
    if (!CAPACITIES.includes(capacity)) {
      return { ok: false, error: "Daily capacity is invalid." };
    }

    const key = dateKey || getDateKey();
    const dailyState = ensureState(state);
    const entry = {
      capacity,
      checkedAt: Date.now()
    };
    dailyState.checkIns[key] = entry;
    return { ok: true, dateKey: key, entry };
  }

  function setToday(state, capacity) {
    return set(state, capacity, getDateKey());
  }

  function getRecommendation(capacity) {
    const profile = LOAD_PROFILES[capacity];
    return profile ? { capacity, ...profile } : null;
  }

  function getTodayRecommendation(state) {
    const entry = getToday(state);
    return entry ? getRecommendation(entry.capacity) : null;
  }

  global.DailyState = {
    capacities: CAPACITIES.slice(),
    get,
    getToday,
    set,
    setToday,
    getRecommendation,
    getTodayRecommendation
  };
})(typeof window !== "undefined" ? window : globalThis);
