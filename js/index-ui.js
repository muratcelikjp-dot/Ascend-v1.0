const HOME_GATE_NODE_SELECTOR = ".gated-node";
const HOME_NODE_SELECTOR = ".constellation-node";
let homeGateTimers = [];
let homeNodeReleaseBound = false;
let homeTouchPointerId = null;
let homeTouchStartX = 0;
let homeTouchStartY = 0;
let homeTouchMoved = false;
let homeSuppressClickUntil = 0;

function getHomeGate() {
  return document.getElementById("screen-wrap");
}

function setGateStatus(message) {
  const status = document.getElementById("gate-status");
  if (status) status.textContent = message;
}

function clearHomeGateTimers() {
  homeGateTimers.forEach(timer => clearTimeout(timer));
  homeGateTimers = [];
}

function setShieldInteractive(interactive) {
  const shield = document.getElementById("shield-wrap");
  if (!shield) return;

  shield.setAttribute("aria-disabled", interactive ? "false" : "true");
  shield.tabIndex = interactive ? 0 : -1;
}

function setEnergyCoreInteractive(interactive) {
  const core = document.getElementById("energy-core");
  if (!core) return;

  core.setAttribute("aria-disabled", interactive ? "false" : "true");
  core.setAttribute("aria-hidden", interactive ? "false" : "true");
  core.tabIndex = interactive ? 0 : -1;
  if (!interactive) core.classList.remove("is-core-reacting");
}

function setNodeInteractive(node, interactive) {
  node.setAttribute("aria-disabled", interactive ? "false" : "true");
  node.tabIndex = interactive ? 0 : -1;
}

function renderQuestAlert(state) {
  const alert = document.getElementById("quest-alert");
  if (!alert) return;

  const activeQuests = state && state.quests && Array.isArray(state.quests.active)
    ? state.quests.active
    : [];
  const hasIncompleteQuest = activeQuests.some(quest => !quest.done);
  alert.classList.toggle("is-visible", hasIncompleteQuest);
}

function updateEnergyCoreProgress(state) {
  const gate = getHomeGate();
  if (!gate || !state) return;

  const completedQuests = Math.max(0, Number(state.quests && state.quests.totalCompletedEver) || 0);
  const unlockedSkills = state.skills && Array.isArray(state.skills.unlocked)
    ? state.skills.unlocked.length
    : 0;
  const questProgress = Math.min(1, Math.log10(completedQuests + 1) / 3);
  const skillProgress = Math.min(1, unlockedSkills / 20);
  const growthProgress = Math.min(1, (questProgress * 0.75) + (skillProgress * 0.25));

  gate.style.setProperty("--core-surface-size", (29 + (growthProgress * 6)).toFixed(2) + "%");
  gate.style.setProperty("--core-corona-size", (40 + (growthProgress * 5)).toFixed(2) + "%");
  gate.style.setProperty("--core-halo-outer-inset", (18 - (growthProgress * 2)).toFixed(2) + "%");
  gate.style.setProperty("--core-halo-inner-inset", (26 - (growthProgress * 1.5)).toFixed(2) + "%");
}

function isHomeNodeTactile(node) {
  if (node.classList.contains("gated-node")) {
    return node.classList.contains("is-node-awake");
  }

  const gate = getHomeGate();
  return node.classList.contains("node-skill") && Boolean(gate) && (
    gate.classList.contains("is-core-awake") ||
    gate.classList.contains("is-settled")
  );
}

function releaseHomeNodes() {
  document.querySelectorAll(HOME_NODE_SELECTOR).forEach(node => {
    node.classList.remove("is-node-pressed");
  });
}

function updateTouchedHomeNode(clientX, clientY) {
  const element = document.elementFromPoint(clientX, clientY);
  const touchedNode = element && element.closest(HOME_NODE_SELECTOR);

  document.querySelectorAll(HOME_NODE_SELECTOR).forEach(node => {
    node.classList.toggle("is-node-pressed", node === touchedNode && isHomeNodeTactile(node));
  });
}

function finishHomeTouchExploration(event) {
  if (homeTouchPointerId === null || (event && event.pointerId !== homeTouchPointerId)) return;
  if (homeTouchMoved) homeSuppressClickUntil = Date.now() + 350;
  homeTouchPointerId = null;
  homeTouchMoved = false;
  releaseHomeNodes();
}

function bindHomeGateInteractions() {
  const gate = getHomeGate();
  const shield = document.getElementById("shield-wrap");
  if (shield && !shield.dataset.keyboardBound) {
    shield.dataset.keyboardBound = "true";
    shield.addEventListener("keydown", event => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      hitShield(event);
    });
  }

  document.querySelectorAll(HOME_GATE_NODE_SELECTOR).forEach(node => {
    if (node.dataset.gateBound) return;
    node.dataset.gateBound = "true";
    node.addEventListener("click", event => {
      if (!node.classList.contains("is-node-awake")) event.preventDefault();
    });
  });

  document.querySelectorAll(HOME_NODE_SELECTOR).forEach(node => {
    if (node.dataset.tactileBound) return;
    node.dataset.tactileBound = "true";

    node.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (!isHomeNodeTactile(node)) return;
      node.classList.add("is-node-pressed");
    });
    ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"].forEach(eventName => {
      node.addEventListener(eventName, () => node.classList.remove("is-node-pressed"));
    });
  });

  if (!homeNodeReleaseBound) {
    homeNodeReleaseBound = true;
    if (gate) {
      gate.addEventListener("pointerdown", event => {
        if ((event.pointerType !== "touch" && event.pointerType !== "pen") || event.isPrimary === false) return;
        homeTouchPointerId = event.pointerId;
        homeTouchStartX = event.clientX;
        homeTouchStartY = event.clientY;
        homeTouchMoved = false;
        updateTouchedHomeNode(event.clientX, event.clientY);
      }, { passive: true });
      gate.addEventListener("click", event => {
        if (Date.now() >= homeSuppressClickUntil) return;
        event.preventDefault();
        event.stopPropagation();
      }, true);
    }
    document.addEventListener("pointermove", event => {
      if (event.pointerId !== homeTouchPointerId) return;
      if (Math.hypot(event.clientX - homeTouchStartX, event.clientY - homeTouchStartY) > 8) homeTouchMoved = true;
      updateTouchedHomeNode(event.clientX, event.clientY);
    }, { passive: true });
    document.addEventListener("pointerup", finishHomeTouchExploration, { passive: true });
    document.addEventListener("pointercancel", finishHomeTouchExploration, { passive: true });
    window.addEventListener("blur", () => {
      finishHomeTouchExploration();
      releaseHomeNodes();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        finishHomeTouchExploration();
        releaseHomeNodes();
      }
    });
  }

  const core = document.getElementById("energy-core");
  if (core && !core.dataset.reactionBound) {
    core.dataset.reactionBound = "true";
    core.addEventListener("click", event => {
      event.stopPropagation();
      if (core.getAttribute("aria-disabled") === "true") return;
      pulseEnergyCore();
    });
  }
}

function showUnbrokenGate(state) {
  clearHomeGateTimers();
  const gate = getHomeGate();
  if (!gate) return;

  gate.classList.remove("is-breaking", "is-core-awake", "is-core-waking", "is-activating", "is-awake", "is-settled", "wave-fired");
  gate.classList.add("is-locked");
  document.querySelectorAll(HOME_GATE_NODE_SELECTOR).forEach(node => {
    node.classList.remove("is-node-awake");
    setNodeInteractive(node, false);
  });
  releaseHomeNodes();
  setShieldInteractive(true);
  setEnergyCoreInteractive(false);
  renderQuestAlert(state);
  setGateStatus("Daily shield ready");
}

function showAlreadyDoneScreen(state) {
  clearHomeGateTimers();
  const gate = getHomeGate();
  if (!gate) return;

  gate.classList.remove("is-locked", "is-breaking", "is-activating", "wave-fired");
  gate.classList.add("is-core-awake", "is-awake", "is-settled");
  document.querySelectorAll(HOME_GATE_NODE_SELECTOR).forEach(node => {
    node.classList.add("is-node-awake");
    setNodeInteractive(node, true);
  });
  setShieldInteractive(false);
  setEnergyCoreInteractive(true);
  wakeEnergyCore();
  schedulePendingHomeFeed();
  renderQuestAlert(state);
  setGateStatus("Navigation active");
}

function schedulePendingHomeFeed(delay) {
  if (!window.HomeFeed) return;
  const pending = HomeFeed.consumePending();
  if (!pending) return;

  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const timer = setTimeout(() => {
    let duration = 0;
    if (typeof playHomeFeedEvent === "function") duration = playHomeFeedEvent(pending, reducedMotion);
    else if (pending.source === "quest" && typeof playQuestFeedWaves === "function") duration = playQuestFeedWaves(pending.waves) || 3600;
    else pulseEnergyCore();

    const nextTimer = setTimeout(() => schedulePendingHomeFeed(0), (duration || 900) + 220);
    homeGateTimers.push(nextTimer);
  }, delay == null ? (reducedMotion ? 420 : 980) : delay);
  homeGateTimers.push(timer);
}

function initializeHomeGate(state) {
  bindHomeGateInteractions();
  updateHpBar(state);
  updateEnergyCoreProgress(state);

  if (Shield.isTodayAlreadyDone(state)) {
    showAlreadyDoneScreen(state);
  } else {
    showUnbrokenGate(state);
  }
}

function updateHpBar(state) {
  if (!state) return;
  const gate = getHomeGate();
  const shield = document.getElementById("shield-wrap");
  const hpPercent = Shield.getHpPercent(state);

  if (gate) gate.style.setProperty("--shield-integrity", hpPercent / 100);
  if (gate) gate.style.setProperty("--shield-brightness", 0.72 + (hpPercent / 100) * 0.28);
  if (shield && shield.getAttribute("aria-disabled") !== "true") {
    shield.setAttribute("aria-label", "Daily shield, " + hpPercent + " percent integrity");
  }
}

function showBrokenScreenShell() {
  const gate = getHomeGate();
  if (!gate) return;

  gate.classList.remove("is-locked");
  gate.classList.add("is-breaking");
  setShieldInteractive(false);
  setEnergyCoreInteractive(false);
  setGateStatus("Shield breaking");
}

function showBrokenResultScreen() {
  const gate = getHomeGate();
  if (!gate) return;

  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    showAlreadyDoneScreen(gs);
    return;
  }

  gate.classList.add("is-core-awake", "is-activating");
  setEnergyCoreInteractive(true);
  wakeEnergyCore();
  fireConstellationRipple();

  let longestDelay = 0;
  document.querySelectorAll(HOME_GATE_NODE_SELECTOR).forEach(node => {
    const delay = Number(node.dataset.wakeDelay) || 0;
    longestDelay = Math.max(longestDelay, delay);
    const timer = setTimeout(() => {
      node.classList.add("is-node-awake");
      setNodeInteractive(node, true);
    }, delay);
    homeGateTimers.push(timer);
  });

  const settleTimer = setTimeout(() => {
    gate.classList.remove("is-breaking", "is-activating", "wave-fired");
    gate.classList.add("is-awake", "is-settled");
    setGateStatus("Navigation active");
  }, longestDelay + 760);
  homeGateTimers.push(settleTimer);
}

function enterQuestBoard() {
  window.location.href = "quests.html";
}

if (typeof window !== "undefined") {
  window.showAlreadyDoneScreen = showAlreadyDoneScreen;
  window.enterQuestBoard = enterQuestBoard;
}
