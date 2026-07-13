// js/shield.js
//
// Owns the daily shield-breaking ritual's HP logic. Visual feedback lives
// on the home screen; this module only tracks damage and daily completion.

const Shield = (function () {
  function todayDateString() {
    return DateUtils.getLocalDateKey();
  }

  function isTodayAlreadyDone(state) {
    return state.shieldRitual.lastCompletedDate === todayDateString();
  }

  function ensureFreshForToday(state) {
    if (state.shieldRitual.lastCompletedDate !== todayDateString()) {
      state.shieldRitual.currentHp = state.shieldRitual.maxHp;
    }
  }

  function applyHit(state, hitNumber) {
    const baseDamage = 18;
    const scaling = hitNumber * 4;
    const damage = baseDamage + scaling;

    state.shieldRitual.currentHp = Math.max(0, state.shieldRitual.currentHp - damage);

    const broken = state.shieldRitual.currentHp <= 0;
    if (broken) {
      state.shieldRitual.lastCompletedDate = todayDateString();
    }

    return {
      damage,
      broken,
      remainingHp: state.shieldRitual.currentHp,
      maxHp: state.shieldRitual.maxHp
    };
  }

  function getHpPercent(state) {
    return Math.round((state.shieldRitual.currentHp / state.shieldRitual.maxHp) * 100);
  }

  return { isTodayAlreadyDone, ensureFreshForToday, applyHit, getHpPercent, todayDateString };
})();

if (typeof window !== "undefined") window.Shield = Shield;
