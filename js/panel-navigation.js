(function () {
  const PANELS = {
    quests: { label: "Quests", previous: null, next: "stats" },
    stats: { label: "Stats", previous: "quests", next: "boss" },
    boss: { label: "Boss", previous: "stats", next: "rewards" },
    rewards: { label: "Rewards", previous: "boss", next: "hero" },
    hero: { label: "Hero", previous: "rewards", next: null }
  };

  const URLS = {
    quests: "quests.html",
    stats: "stats.html",
    boss: "boss.html",
    rewards: "rewards.html",
    hero: "hero.html"
  };

  const TRANSITION_KEY = "rpg-panel-transition";
  const EDGE_GUARD = 24;
  const INTENT_DISTANCE = 10;
  const COMPLETE_DISTANCE = 72;
  const COMPLETE_VELOCITY = 0.45;
  const BLOCKED_TARGETS = "a,button,input,textarea,select,canvas,dialog,[onclick],.qc,.modal-overlay,.time-picker,.boss-confirm-overlay,.sheet-overlay,.failure-overlay,.victory-overlay,.defeat-overlay,.confirm-overlay,.detail-overlay,.profile-overlay,.ach-popup-overlay,[data-panel-swipe-ignore]";

  let active = null;
  let navigating = false;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getTransition() {
    try {
      const value = JSON.parse(sessionStorage.getItem(TRANSITION_KEY) || "null");
      sessionStorage.removeItem(TRANSITION_KEY);
      return value;
    } catch (error) {
      return null;
    }
  }

  function saveTransition(target, direction) {
    try {
      sessionStorage.setItem(TRANSITION_KEY, JSON.stringify({ target, direction }));
    } catch (error) {
      // Navigation still works when sessionStorage is unavailable.
    }
  }

  function targetForDelta(panel, deltaX) {
    return deltaX < 0 ? PANELS[panel].next : PANELS[panel].previous;
  }

  function resetDrag(shell, animate) {
    shell.classList.toggle("panel-snap-back", animate);
    shell.style.transform = "";
    shell.style.opacity = "";
    window.setTimeout(function () { shell.classList.remove("panel-snap-back"); }, animate ? 230 : 0);
    active = null;
  }

  function navigate(panel, shell, target, direction) {
    if (!target || navigating) {
      resetDrag(shell, true);
      return;
    }

    navigating = true;
    saveTransition(target, direction);
    document.documentElement.classList.add("panel-transitioning");

    if (prefersReducedMotion()) {
      window.location.href = URLS[target];
      return;
    }

    shell.style.transform = "";
    shell.style.opacity = "";
    shell.classList.add(direction === "next" ? "panel-exit-left" : "panel-exit-right");
    window.setTimeout(function () { window.location.href = URLS[target]; }, 280);
  }

  function initIncoming(panel, shell) {
    const transition = getTransition();
    if (!transition || transition.target !== panel || prefersReducedMotion()) return;
    shell.classList.add(transition.direction === "next" ? "panel-enter-from-right" : "panel-enter-from-left");
    window.setTimeout(function () {
      shell.classList.remove("panel-enter-from-right", "panel-enter-from-left");
    }, 360);
  }

  function init() {
    const panel = document.body.dataset.panel;
    const panelConfig = PANELS[panel];
    const shell = document.querySelector(".panel-nav-shell");
    if (!panelConfig || !shell) return;

    initIncoming(panel, shell);

    shell.addEventListener("pointerdown", function (event) {
      if (navigating || event.pointerType === "mouse" && event.button !== 0) return;
      if (event.clientX <= EDGE_GUARD || event.clientX >= window.innerWidth - EDGE_GUARD) return;
      if (event.target.closest(BLOCKED_TARGETS)) return;

      active = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: performance.now(),
        horizontal: false,
        cancelled: false
      };
      shell.setPointerCapture(event.pointerId);
    });

    shell.addEventListener("pointermove", function (event) {
      if (!active || active.pointerId !== event.pointerId || active.cancelled) return;
      const deltaX = event.clientX - active.startX;
      const deltaY = event.clientY - active.startY;

      if (!active.horizontal) {
        if (Math.abs(deltaX) < INTENT_DISTANCE && Math.abs(deltaY) < INTENT_DISTANCE) return;
        if (Math.abs(deltaY) >= Math.abs(deltaX) * 0.8) {
          active.cancelled = true;
          resetDrag(shell, false);
          return;
        }
        active.horizontal = true;
      }

      const target = targetForDelta(panel, deltaX);
      const resistance = target ? 1 : 0.18;
      const travel = Math.max(-118, Math.min(118, deltaX * resistance));
      shell.style.transform = "translate3d(" + travel + "px,0,0)";
      shell.style.opacity = String(1 - Math.min(Math.abs(travel) / 520, 0.18));

    });

    function finish(event) {
      if (!active || active.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - active.startX;
      const elapsed = Math.max(1, performance.now() - active.startTime);
      const velocity = Math.abs(deltaX) / elapsed;
      const target = targetForDelta(panel, deltaX);
      const shouldNavigate = active.horizontal && target && (Math.abs(deltaX) >= COMPLETE_DISTANCE || velocity >= COMPLETE_VELOCITY);
      const direction = deltaX < 0 ? "next" : "previous";

      if (shouldNavigate) navigate(panel, shell, target, direction);
      else resetDrag(shell, true);
    }

    shell.addEventListener("pointerup", finish);
    shell.addEventListener("pointercancel", function () { if (active) resetDrag(shell, true); });
    shell.addEventListener("lostpointercapture", function () {
      if (active && !navigating) resetDrag(shell, true);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
