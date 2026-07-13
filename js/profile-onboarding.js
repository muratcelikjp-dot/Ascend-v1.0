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
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!overlay || !form || !window.UserProfile) return;

  function markReady() {
    overlay.classList.remove("booting");
    overlay.classList.add("ready");
    status.textContent = "Identity core ready";
    nameInput.focus();
  }

  function open() {
    birthInput.max = UserProfile.getTodayKey();
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
    callsign.textContent = name ? name.toUpperCase() + " // CANDIDATE" : "PLAYER // UNLINKED";
    callsign.classList.toggle("linked", !!name);
  }

  function updateAge() {
    const age = UserProfile.calculateAge(birthInput.value);
    ageOutput.textContent = age === null || age < 0 ? "AGE // --" : "AGE // " + age;
  }

  nameInput.addEventListener("input", updateCallsign);
  birthInput.addEventListener("change", updateAge);

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
    submit.disabled = true;
    overlay.classList.add("completing");
    setTimeout(close, reducedMotion ? 80 : 760);
  });

  if (!UserProfile.get()) open();
})();
