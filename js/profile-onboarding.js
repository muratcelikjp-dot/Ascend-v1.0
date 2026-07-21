(function () {
  const overlay = document.getElementById("profile-onboarding");
  const form = document.getElementById("profile-onboarding-form");
  const nameInput = document.getElementById("onboarding-name");
  const birthInput = document.getElementById("onboarding-birth");
  const error = document.getElementById("onboarding-error");
  const status = document.getElementById("onboarding-status");
  const callsign = document.getElementById("onboarding-callsign");
  const ageOutput = document.getElementById("onboarding-age");
  const submit = document.getElementById("onboarding-save");
  const goalsStep = document.getElementById("onboarding-goals-step");
  const goalGrid = document.getElementById("onboarding-goal-grid");
  const goalCount = document.getElementById("onboarding-goal-count");
  const goalStatus = document.getElementById("onboarding-goal-status");
  const goalSave = document.getElementById("onboarding-goal-save");
  const welcome = document.getElementById("onboarding-welcome");
  const welcomeName = document.getElementById("onboarding-welcome-name");
  const dateButtons = Array.from(document.querySelectorAll("[data-date-part]"));
  const dateDragSurfaces = Array.from(document.querySelectorAll(".birth-counter-display"));
  const dateOutputs = {
    day: document.getElementById("birth-day"),
    month: document.getElementById("birth-month"),
    year: document.getElementById("birth-year")
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (
    !overlay || !form || !goalsStep || !goalGrid || !goalCount || !goalStatus || !goalSave ||
    !window.UserProfile || !window.GameState || !window.Goals
  ) return;

  const maxBirthYear = Number(UserProfile.getTodayKey().slice(0, 4));
  const birthParts = { day: null, month: null, year: null };
  let activeStep = "identity";
  let selectedGoals = [];
  if (window.TerminalCaret) TerminalCaret.bind(nameInput);

  function markReady() {
    overlay.classList.remove("booting");
    overlay.classList.add("ready");
    status.textContent = activeStep === "goals" ? "Directive matrix ready" : "Identity core ready";
    if (activeStep === "goals") {
      const firstGoal = goalGrid.querySelector("button");
      if (firstGoal) firstGoal.focus();
    } else {
      nameInput.focus();
    }
  }

  function open() {
    error.textContent = "";
    overlay.classList.add("open", "booting");
    overlay.setAttribute("aria-hidden", "false");
    status.textContent = "Initializing identity core";
    setTimeout(markReady, reducedMotion ? 0 : 980);
  }

  function close() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    const shield = document.getElementById("shield-wrap");
    if (shield && shield.getAttribute("aria-disabled") !== "true") shield.focus();
  }

  function updateCallsign() {
    const name = nameInput.value.trim();
    callsign.textContent = name ? 'IDENTITY.NAME = "' + name.toUpperCase() + '";' : "PLAYER // UNLINKED";
    callsign.classList.toggle("linked", !!name);
  }

  function goalColor(goal) {
    const colors = {
      fitness: "#69e9b7",
      education: "#65c7ff",
      career: "#b69cff",
      social: "#ff72bd",
      discipline: "#ff667d",
      "personal-project": "#f7c948"
    };
    return colors[goal.id] || "#35f4e6";
  }

  function renderGoals() {
    goalGrid.innerHTML = Goals.definitions().map(goal => {
      const selected = selectedGoals.includes(goal.id);
      const description = goal.description || goal.attributes.map(attribute => attribute.toUpperCase()).join(" + ");
      return `<button class="onboarding-goal-option${selected ? " selected" : ""}" type="button" data-goal-id="${goal.id}" aria-label="${goal.label}" aria-pressed="${selected}" style="--goal-color:${goalColor(goal)}">
        <span class="onboarding-goal-icon"><i class="ti ${goal.icon}" aria-hidden="true"></i></span>
        <span class="onboarding-goal-copy"><strong>${goal.label}</strong><span>${description}</span></span>
      </button>`;
    }).join("");
    goalCount.textContent = selectedGoals.length + " / " + Goals.maxSelected;
    goalSave.disabled = selectedGoals.length === 0;
  }

  function showGoalStep(profile) {
    activeStep = "goals";
    selectedGoals = Goals.normalizeSelection(GameState.get().goals.selected);
    goalsStep.hidden = false;
    overlay.classList.add("goal-mode");
    status.textContent = "Directive matrix ready";
    document.getElementById("onboarding-title").textContent = "Choose your directives";
    callsign.textContent = profile.name.toUpperCase() + " // LINKED";
    callsign.classList.add("linked");
    goalStatus.textContent = "Select up to three directives";
    goalStatus.classList.remove("error");
    renderGoals();
  }

  function finishOnboarding(profile) {
    error.textContent = "";
    status.textContent = "Directives linked";
    welcomeName.textContent = profile.name;
    welcome.setAttribute("aria-hidden", "false");
    goalSave.disabled = true;
    overlay.classList.add("completing");
    setTimeout(close, reducedMotion ? 120 : 2200);
  }

  function updateAge() {
    const age = UserProfile.calculateAge(birthInput.value);
    ageOutput.textContent = age === null || age < 0 ? "AGE // --" : "AGE // " + age;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function getDaysInSelectedMonth() {
    const month = birthParts.month || 1;
    const year = birthParts.year || 2000;
    return new Date(year, month, 0).getDate();
  }

  function syncBirthValue() {
    if (birthParts.day === null || birthParts.month === null || birthParts.year === null) {
      birthInput.value = "";
      updateAge();
      return;
    }

    const maxDay = getDaysInSelectedMonth();
    if (birthParts.day > maxDay) birthParts.day = maxDay;
    dateOutputs.day.textContent = pad(birthParts.day);
    birthInput.value = birthParts.year + "-" + pad(birthParts.month) + "-" + pad(birthParts.day);
    updateAge();
  }

  function stepBirthPart(part, direction) {
    const defaults = { day: 1, month: 1, year: Math.min(2000, maxBirthYear) };
    const ranges = {
      day: [1, getDaysInSelectedMonth()],
      month: [1, 12],
      year: [1900, maxBirthYear]
    };
    const [min, max] = ranges[part];
    let value = birthParts[part];

    if (value === null) value = defaults[part];
    else if (part === "year") value = Math.max(min, Math.min(max, value + direction));
    else value = value + direction > max ? min : value + direction < min ? max : value + direction;

    birthParts[part] = value;
    dateOutputs[part].textContent = part === "year" ? String(value) : pad(value);

    const unit = document.querySelector('[data-date-unit="' + part + '"]');
    if (unit) {
      unit.classList.remove("roll-up", "roll-down");
      void unit.offsetWidth;
      unit.classList.add(direction > 0 ? "roll-up" : "roll-down");
    }

    syncBirthValue();
  }

  function bindBirthDrag(surface) {
    const unit = surface.closest("[data-date-unit]");
    if (!unit) return;

    const part = unit.dataset.dateUnit;
    const pixelsPerStep = 22;
    let drag = null;

    function resetSurface() {
      unit.classList.remove("dragging");
      surface.style.removeProperty("--birth-drag-offset");
      surface.style.removeProperty("--birth-drag-opacity");
    }

    function finishDrag(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const velocity = drag.velocity;
      drag = null;
      resetSurface();

      if (reducedMotion || Math.abs(velocity) < 0.35) return;
      const direction = velocity < 0 ? 1 : -1;
      const momentumSteps = Math.min(3, Math.max(1, Math.round(Math.abs(velocity) * 2)));
      for (let index = 0; index < momentumSteps; index += 1) {
        setTimeout(() => stepBirthPart(part, direction), index * 70);
      }
    }

    surface.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      drag = {
        pointerId: event.pointerId,
        anchorY: event.clientY,
        sampleY: event.clientY,
        sampleTime: event.timeStamp,
        velocity: 0
      };
      unit.classList.add("dragging");
      try { surface.setPointerCapture(event.pointerId); } catch (captureError) { /* capture is optional */ }
    });

    surface.addEventListener("pointermove", event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();

      const elapsed = Math.max(1, event.timeStamp - drag.sampleTime);
      drag.velocity = (event.clientY - drag.sampleY) / elapsed;
      drag.sampleY = event.clientY;
      drag.sampleTime = event.timeStamp;

      let delta = event.clientY - drag.anchorY;
      const direction = delta < 0 ? 1 : -1;
      const stepCount = Math.floor(Math.abs(delta) / pixelsPerStep);

      if (stepCount > 0) {
        for (let index = 0; index < stepCount; index += 1) stepBirthPart(part, direction);
        drag.anchorY += (direction > 0 ? -1 : 1) * pixelsPerStep * stepCount;
        delta = event.clientY - drag.anchorY;
      }

      const offset = Math.max(-10, Math.min(10, delta * 0.42));
      surface.style.setProperty("--birth-drag-offset", offset + "px");
      surface.style.setProperty("--birth-drag-opacity", String(1 - Math.min(0.28, Math.abs(offset) / 42)));
    }, { passive: false });

    surface.addEventListener("pointerup", finishDrag);
    surface.addEventListener("pointercancel", finishDrag);
    surface.addEventListener("lostpointercapture", event => {
      if (drag && event.pointerId === drag.pointerId) {
        drag = null;
        resetSurface();
      }
    });
  }

  nameInput.addEventListener("input", updateCallsign);
  dateButtons.forEach(button => {
    button.addEventListener("click", () => {
      stepBirthPart(button.dataset.datePart, Number(button.dataset.dateDirection));
    });
  });
  dateDragSurfaces.forEach(bindBirthDrag);

  goalGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-goal-id]");
    if (!button) return;
    const goalId = button.dataset.goalId;
    if (selectedGoals.includes(goalId)) {
      selectedGoals = selectedGoals.filter(id => id !== goalId);
    } else if (selectedGoals.length < Goals.maxSelected) {
      selectedGoals.push(goalId);
    } else {
      goalStatus.textContent = "Maximum three directives";
      goalStatus.classList.add("error");
      return;
    }
    goalStatus.textContent = selectedGoals.length ? selectedGoals.length + " directives selected" : "Select up to three directives";
    goalStatus.classList.remove("error");
    renderGoals();
  });

  goalSave.addEventListener("click", () => {
    if (selectedGoals.length === 0) {
      goalStatus.textContent = "Select at least one directive";
      goalStatus.classList.add("error");
      return;
    }
    const profile = UserProfile.get();
    if (!profile) {
      goalStatus.textContent = "Profile data unavailable";
      goalStatus.classList.add("error");
      return;
    }
    GameState.set(state => Goals.setSelection(state, selectedGoals, state.goals.details));
    finishOnboarding(profile);
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const result = UserProfile.save(nameInput.value, birthInput.value);
    if (!result.ok) {
      error.textContent = result.error;
      status.textContent = "Identity input rejected";
      overlay.classList.remove("invalid");
      void overlay.offsetWidth;
      overlay.classList.add("invalid");
      return;
    }
    submit.disabled = true;
    showGoalStep(result.profile);
  });

  const existingProfile = UserProfile.get();
  const existingGoals = GameState.get().goals;
  if (!existingProfile) {
    open();
  } else if (!existingGoals.onboardingComplete || existingGoals.selected.length === 0) {
    showGoalStep(existingProfile);
    open();
  }
})();
