(function (global) {
  const OPTIONS = [
    { id: "low", label: "Low", description: "Essential focus", load: "1 quest", icon: "ti-battery-1", color: "#8defff" },
    { id: "steady", label: "Steady", description: "Balanced deployment", load: "3 quests", icon: "ti-activity", color: "#35f4e6" },
    { id: "strong", label: "Strong", description: "Expanded deployment", load: "5 quests", icon: "ti-bolt", color: "#f7c948" }
  ];
  let overlay = null;
  let onboardingObserver = null;

  function getTodayEntry() {
    if (!global.GameState || !global.DailyState) return null;
    return global.DailyState.getToday(global.GameState.get());
  }

  function build() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.className = "daily-checkin-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "daily-checkin-title");
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = '<section class="daily-checkin-card">' +
      '<header class="daily-checkin-head">' +
        '<div class="daily-checkin-protocol"><span>DAILY SYNC // 01</span><span><i></i>LOCAL CYCLE</span></div>' +
        '<div class="daily-checkin-title"><span class="daily-checkin-title-icon"><i class="ti ti-heart-rate-monitor" aria-hidden="true"></i></span><div><h2 id="daily-checkin-title">Daily State</h2><p>Calibrate today\'s capacity</p></div></div>' +
      '</header>' +
      '<div class="daily-checkin-options">' + OPTIONS.map(option =>
        '<button class="daily-checkin-option" type="button" data-capacity="' + option.id + '" style="--checkin-color:' + option.color + '">' +
          '<span class="daily-checkin-option-icon"><i class="ti ' + option.icon + '" aria-hidden="true"></i></span>' +
          '<span class="daily-checkin-option-copy"><strong>' + option.label + '</strong><span>' + option.description + '</span></span>' +
          '<span class="daily-checkin-option-load">' + option.load + '</span>' +
        '</button>'
      ).join("") + '</div>' +
      '<footer class="daily-checkin-foot">One check-in / locked until the next local cycle</footer>' +
    '</section>';
    overlay.querySelectorAll("[data-capacity]").forEach(button => {
      button.addEventListener("click", () => commit(button.dataset.capacity, button));
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("daily-checkin-open");
    setTimeout(() => {
      if (overlay && !overlay.classList.contains("open")) {
        overlay.remove();
        overlay = null;
      }
    }, 320);
  }

  function commit(capacity, button) {
    if (!overlay || overlay.classList.contains("committing")) return;
    let result = null;
    const state = global.GameState.set(current => {
      result = global.DailyState.setToday(current, capacity);
    });
    if (!result || !result.ok) {
      if (result && result.reason === "already-checked-in") close();
      return;
    }

    overlay.classList.add("committing");
    overlay.querySelectorAll("[data-capacity]").forEach(option => {
      option.disabled = true;
      option.classList.toggle("selected", option === button);
    });
    global.dispatchEvent(new CustomEvent("daily-state:checked-in", { detail: { entry: result.entry, state } }));
    setTimeout(close, global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420);
  }

  function openIfNeeded() {
    if (!global.GameState || !global.DailyState || getTodayEntry()) return;
    const onboarding = document.getElementById("profile-onboarding");
    if (onboarding && onboarding.classList.contains("open")) {
      if (!onboardingObserver) {
        onboardingObserver = new MutationObserver(() => {
          if (!onboarding.classList.contains("open")) {
            onboardingObserver.disconnect();
            onboardingObserver = null;
            openIfNeeded();
          }
        });
        onboardingObserver.observe(onboarding, { attributes: true, attributeFilter: ["class"] });
      }
      return;
    }

    const element = build();
    document.body.classList.add("daily-checkin-open");
    requestAnimationFrame(() => {
      element.classList.add("open");
      element.setAttribute("aria-hidden", "false");
      const firstOption = element.querySelector("[data-capacity]");
      if (firstOption) firstOption.focus();
    });
  }

  global.addEventListener("storage", () => {
    if (getTodayEntry()) close();
  });

  global.DailyCheckIn = { openIfNeeded };
  openIfNeeded();
})(typeof window !== "undefined" ? window : globalThis);
