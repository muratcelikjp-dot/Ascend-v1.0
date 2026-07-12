const HOME_GATE_NODE_SELECTOR = ".gated-node";
let homeGateTimers = [];

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

function bindHomeGateInteractions() {
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
}

function showUnbrokenGate(state) {
  clearHomeGateTimers();
  const gate = getHomeGate();
  if (!gate) return;

  gate.classList.remove("is-breaking", "is-core-awake", "is-activating", "is-awake", "is-settled", "wave-fired");
  gate.classList.add("is-locked");
  document.querySelectorAll(HOME_GATE_NODE_SELECTOR).forEach(node => {
    node.classList.remove("is-node-awake");
    setNodeInteractive(node, false);
  });
  setShieldInteractive(true);
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
  renderQuestAlert(state);
  setGateStatus("Navigation active");
}

function initializeHomeGate(state) {
  bindHomeGateInteractions();
  updateHpBar(state);

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
