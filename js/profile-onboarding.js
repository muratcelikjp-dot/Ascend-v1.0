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
  const welcome = document.getElementById("onboarding-welcome");
  const welcomeName = document.getElementById("onboarding-welcome-name");
  const dateButtons = Array.from(document.querySelectorAll("[data-date-part]"));
  const dateOutputs = {
    day: document.getElementById("birth-day"),
    month: document.getElementById("birth-month"),
    year: document.getElementById("birth-year")
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!overlay || !form || !window.UserProfile) return;

  const maxBirthYear = Number(UserProfile.getTodayKey().slice(0, 4));
  const birthParts = { day: null, month: null, year: null };
  if (window.TerminalCaret) TerminalCaret.bind(nameInput);

  function markReady() {
    overlay.classList.remove("booting");
    overlay.classList.add("ready");
    status.textContent = "Identity core ready";
    nameInput.focus();
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

  nameInput.addEventListener("input", updateCallsign);
  dateButtons.forEach(button => {
    button.addEventListener("click", () => {
      stepBirthPart(button.dataset.datePart, Number(button.dataset.dateDirection));
    });
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
    error.textContent = "";
    status.textContent = "Identity linked";
    callsign.textContent = result.profile.name.toUpperCase() + " // LINKED";
    callsign.classList.add("linked");
    welcomeName.textContent = result.profile.name;
    welcome.setAttribute("aria-hidden", "false");
    submit.disabled = true;
    overlay.classList.add("completing");
    setTimeout(close, reducedMotion ? 120 : 2200);
  });

  if (!UserProfile.get()) open();
})();
