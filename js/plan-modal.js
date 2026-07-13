const PlanModal = (function () {
  let state = null;
  let selectedQuestType = "side";
  let selectedAttribute = "willpower";
  let selectedDifficulty = "normal";
  let draftGoalTime = null;
  let pickerHour = 8;
  let pickerMinute = 0;
  let pickerCallback = null;

  const attributes = {
    intelligence: { label: "Intelligence", icon: "ti-brain", color: "#35F4E6", bg: "rgba(53,244,230,.1)", border: "rgba(53,244,230,.3)" },
    strength: { label: "Strength", icon: "ti-barbell", color: "#41E6A4", bg: "rgba(65,230,164,.1)", border: "rgba(65,230,164,.3)" },
    charisma: { label: "Charisma", icon: "ti-messages", color: "#F06AA6", bg: "rgba(240,106,166,.1)", border: "rgba(240,106,166,.3)" },
    willpower: { label: "Willpower", icon: "ti-flame", color: "#FF5C7A", bg: "rgba(255,92,122,.1)", border: "rgba(255,92,122,.3)" }
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
  }

  function ensureDialog() {
    if (document.getElementById("plan-dialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "plan-dialog";
    dialog.className = "plan-dialog";
    dialog.innerHTML = `
      <div class="plan-sheet">
        <header class="plan-sheet-head">
          <div class="plan-sheet-mark"><i class="ti ti-moon-stars"></i></div>
          <div class="plan-sheet-heading"><div class="plan-sheet-kicker">Night protocol</div><h2>Plan Tomorrow</h2></div>
          <div class="plan-sheet-date" id="pm-date"></div>
          <button class="plan-close" type="button" onclick="PlanModal.close()" aria-label="Close plan"><i class="ti ti-x"></i></button>
        </header>
        <div class="plan-sheet-scroll">
          <div class="plan-summary">
            <div class="plan-summary-cell"><strong class="plan-summary-value" id="pm-main-count">0</strong><span class="plan-summary-label">Main Quest</span></div>
            <div class="plan-summary-cell"><strong class="plan-summary-value" id="pm-fixed-count">0</strong><span class="plan-summary-label">Routines</span></div>
            <div class="plan-summary-cell"><strong class="plan-summary-value" id="pm-planned-xp">0</strong><span class="plan-summary-label">Planned XP</span></div>
          </div>
          <section class="plan-block">
            <div class="plan-block-head"><div><div class="plan-block-kicker"><i class="ti ti-swords"></i>Quest deployment</div><h3 class="plan-block-title">Build Tomorrow</h3></div><div class="plan-block-note">One Main Quest and up to three Side Quests</div></div>
            <div class="plan-composer">
              <label class="plan-label" for="pm-goal">Quest name</label><input class="plan-input" id="pm-goal" placeholder="What will move you forward?">
              <div class="plan-quest-options">
                <div><span class="plan-label">Quest type</span><div class="plan-type-grid" id="pm-type-grid"></div></div>
                <div><span class="plan-label">Difficulty</span><div class="plan-difficulty-grid" id="pm-difficulty-grid"></div></div>
              </div>
              <div class="plan-block" style="margin-top:8px"><span class="plan-label">Attribute</span><div class="plan-focus-grid" id="pm-attribute-grid"></div></div>
              <div class="plan-composer-row">
                <div><span class="plan-label">Time (optional)</span><button class="plan-time-trigger" id="pm-time-trigger" type="button" onclick="PlanModal.pickGoalTime()"><i class="ti ti-clock-hour-4"></i><span>Set time</span><i class="ti ti-chevron-right"></i></button></div>
                <div><span class="plan-label">Reward</span><div class="plan-input" id="pm-xp-preview" style="display:flex;align-items:center;color:#8defff">+100 XP</div></div>
              </div>
              <div class="plan-limit" id="pm-limit"></div>
              <button class="plan-add" type="button" onclick="PlanModal.addGoal()"><i class="ti ti-plus"></i>Add quest</button>
            </div>
            <div class="plan-goals" id="pm-goals"></div>
          </section>
          <section class="plan-block">
            <div class="plan-block-head"><div><div class="plan-block-kicker"><i class="ti ti-repeat"></i>Known routines</div><h3 class="plan-block-title">Routine Quests</h3></div><div class="plan-block-note">Repeatable attribute quests</div></div>
            <div class="plan-routines" id="pm-routines"></div>
          </section>
        </div>
        <footer class="plan-sheet-actions"><button class="plan-save" id="pm-save" type="button" onclick="PlanModal.save()"><i class="ti ti-lock"></i><span>Save tomorrow's plan</span></button></footer>
      </div>
      <div class="time-picker" id="pm-time-picker" aria-hidden="true">
        <div class="time-picker-panel" role="dialog" aria-modal="true" aria-label="Choose time">
          <div class="time-picker-head"><div class="time-picker-title"><i class="ti ti-clock-hour-4"></i>Schedule time</div><button class="time-picker-dismiss" type="button" onclick="PlanModal.closeTimePicker()" aria-label="Close time picker"><i class="ti ti-x"></i></button></div>
          <div class="time-picker-clock">
            <div><div class="time-unit"><button class="time-step" type="button" onclick="PlanModal.adjustTime('hour',1)" aria-label="Increase hour"><i class="ti ti-chevron-up"></i></button><div class="time-digit" id="pm-picker-hour">08</div><button class="time-step" type="button" onclick="PlanModal.adjustTime('hour',-1)" aria-label="Decrease hour"><i class="ti ti-chevron-down"></i></button></div><div class="time-unit-label">Hour</div></div>
            <div class="time-colon">:</div>
            <div><div class="time-unit"><button class="time-step" type="button" onclick="PlanModal.adjustTime('minute',5)" aria-label="Increase minute"><i class="ti ti-chevron-up"></i></button><div class="time-digit" id="pm-picker-minute">00</div><button class="time-step" type="button" onclick="PlanModal.adjustTime('minute',-5)" aria-label="Decrease minute"><i class="ti ti-chevron-down"></i></button></div><div class="time-unit-label">Minute</div></div>
          </div>
          <div class="time-presets" id="pm-time-presets"></div>
          <div class="time-picker-actions"><button class="time-clear" type="button" onclick="PlanModal.clearTime()">Clear</button><button class="time-confirm" type="button" onclick="PlanModal.confirmTime()">Confirm time</button></div>
        </div>
      </div>`;
    dialog.addEventListener("click", event => { if (event.target === dialog) close(); });
    dialog.addEventListener("close", () => document.body.classList.remove("plan-modal-open"));
    document.body.appendChild(dialog);
    document.getElementById("pm-time-picker").addEventListener("click", event => { if (event.target.id === "pm-time-picker") closeTimePicker(); });
  }

  function padTime(value) {
    return String(value).padStart(2, "0");
  }

  function currentPickerValue() {
    return padTime(pickerHour) + ":" + padTime(pickerMinute);
  }

  function setPickerValue(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      pickerHour = Math.min(23, Math.max(0, Number(match[1])));
      pickerMinute = Math.min(59, Math.max(0, Number(match[2])));
      return;
    }
    const now = new Date();
    pickerHour = now.getHours();
    pickerMinute = Math.round(now.getMinutes() / 5) * 5;
    if (pickerMinute === 60) { pickerMinute = 0; pickerHour = (pickerHour + 1) % 24; }
  }

  function animateDigit(element) {
    element.classList.remove("changing");
    void element.offsetWidth;
    element.classList.add("changing");
  }

  function renderTimePicker(animate) {
    const hour = document.getElementById("pm-picker-hour");
    const minute = document.getElementById("pm-picker-minute");
    hour.textContent = padTime(pickerHour);
    minute.textContent = padTime(pickerMinute);
    if (animate) { animateDigit(hour); animateDigit(minute); }
    const presets = [
      { label: "Morning", value: "07:00" },
      { label: "Midday", value: "12:00" },
      { label: "Evening", value: "18:00" },
      { label: "Night", value: "22:00" }
    ];
    const current = currentPickerValue();
    document.getElementById("pm-time-presets").innerHTML = presets.map(preset =>
      `<button class="time-preset${current === preset.value ? " active" : ""}" type="button" onclick="PlanModal.selectTimePreset('${preset.value}')">${preset.label}<span>${preset.value}</span></button>`
    ).join("");
  }

  function openTimePicker(value, callback) {
    setPickerValue(value);
    pickerCallback = callback;
    renderTimePicker(false);
    const picker = document.getElementById("pm-time-picker");
    picker.classList.add("open");
    picker.setAttribute("aria-hidden", "false");
  }

  function closeTimePicker() {
    const picker = document.getElementById("pm-time-picker");
    if (!picker) return;
    picker.classList.remove("open");
    picker.setAttribute("aria-hidden", "true");
    pickerCallback = null;
  }

  function adjustTime(unit, amount) {
    let total = pickerHour * 60 + pickerMinute;
    total += unit === "hour" ? amount * 60 : amount;
    total = (total % 1440 + 1440) % 1440;
    pickerHour = Math.floor(total / 60);
    pickerMinute = total % 60;
    renderTimePicker(true);
  }

  function selectTimePreset(value) {
    setPickerValue(value);
    renderTimePicker(true);
  }

  function confirmTime() {
    const callback = pickerCallback;
    const value = currentPickerValue();
    closeTimePicker();
    if (callback) callback(value);
  }

  function clearTime() {
    const callback = pickerCallback;
    closeTimePicker();
    if (callback) callback(null);
  }

  function updateGoalTimeTrigger() {
    const label = document.querySelector("#pm-time-trigger span");
    if (label) label.textContent = draftGoalTime || "Set time";
  }

  function pickGoalTime() {
    openTimePicker(draftGoalTime, value => { draftGoalTime = value; updateGoalTimeTrigger(); });
  }

  function pickRoutineTime(templateId, currentValue) {
    openTimePicker(currentValue, value => {
      state = GameState.set(gs => {
        const entry = gs.planning.tomorrowFixed.find(item => item.templateId === templateId);
        if (entry) entry.scheduledTime = value || null;
      });
      renderRoutines();
    });
  }

  function renderDate() {
    const tomorrow = DateUtils.addDaysLocal(new Date(), 1);
    document.getElementById("pm-date").textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(tomorrow);
  }

  function renderSummary() {
    const goals = state.planning.tomorrowGoals;
    const routineXp = state.planning.tomorrowFixed.reduce((total, item) => {
      const template = SEED_DATA.questTemplates.find(entry => entry.id === item.templateId);
      return total + (template ? template.xp : 0);
    }, 0);
    document.getElementById("pm-main-count").textContent = goals.some(goal => goal.priority === "high") ? "1" : "0";
    document.getElementById("pm-fixed-count").textContent = state.planning.tomorrowFixed.length;
    document.getElementById("pm-planned-xp").textContent = goals.reduce((total, goal) => total + (Number(goal.xp) || 0), routineXp);
  }

  function renderAttribute() {
    document.getElementById("pm-attribute-grid").innerHTML = Object.entries(attributes).map(([id, meta]) =>
      `<button class="plan-focus${selectedAttribute === id ? " selected" : ""}" type="button" style="--focus-color:${meta.color};--focus-bg:${meta.bg};--focus-border:${meta.border}" onclick="PlanModal.selectAttribute('${id}')" aria-label="${meta.label}" title="${meta.label}">${AttributeIcons.markup(id, meta.icon)}</button>`
    ).join("");
  }

  function renderQuestControls() {
    document.getElementById("pm-type-grid").innerHTML = ["main", "side"].map(type =>
      `<button class="plan-type${selectedQuestType === type ? " selected-" + type : ""}" type="button" onclick="PlanModal.selectQuestType('${type}')">${type} quest</button>`
    ).join("");
    document.getElementById("pm-difficulty-grid").innerHTML = ["easy", "normal", "hard"].map(difficulty =>
      `<button class="plan-difficulty${selectedDifficulty === difficulty ? " selected-" + difficulty : ""}" type="button" onclick="PlanModal.selectDifficulty('${difficulty}')">${difficulty}</button>`
    ).join("");
    document.getElementById("pm-xp-preview").textContent = "+" + ({ easy: 50, normal: 100, hard: 200 })[selectedDifficulty] + " XP";
    renderLimit();
  }

  function renderLimit(message) {
    const goals = state.planning.tomorrowGoals;
    const mainCount = goals.filter(goal => goal.priority === "high").length;
    const sideCount = goals.length - mainCount;
    const limit = document.getElementById("pm-limit");
    limit.textContent = message || (mainCount + "/1 Main Quest / " + sideCount + "/3 Side Quests");
    limit.classList.toggle("warning", !!message);
  }

  function renderGoals() {
    const list = document.getElementById("pm-goals");
    if (!state.planning.tomorrowGoals.length) {
      list.innerHTML = '<div class="plan-empty">No custom quests deployed</div>';
      renderSummary();
      return;
    }
    list.innerHTML = state.planning.tomorrowGoals.map((goal, index) => {
      const attributeId = goal.attribute || "willpower";
      const meta = attributes[attributeId] || attributes.willpower;
      const isMain = goal.priority === "high";
      const difficulty = goal.difficulty || "normal";
      return `<article class="plan-item" style="--item-color:${meta.color};--item-bg:${meta.bg};--item-border:${meta.border}">
        <div class="plan-item-icon">${AttributeIcons.markup(attributeId, meta.icon)}</div>
        <div class="plan-item-body"><div class="plan-item-title">${escapeHtml(goal.text)}</div><div class="plan-item-meta"><span class="plan-item-type${isMain ? " main" : ""}">${isMain ? "Main Quest" : "Side Quest"}</span>${meta.label} / ${difficulty}${goal.scheduledTime ? " / " + escapeHtml(goal.scheduledTime) : ""}</div></div>
        <div class="plan-item-xp">+${goal.xp} XP</div>
        <button class="plan-icon-btn" type="button" onclick="PlanModal.removeGoal(${index})" aria-label="Remove quest"><i class="ti ti-x"></i></button>
      </article>`;
    }).join("");
    renderSummary();
  }

  function renderRoutines() {
    const selectedIds = new Set(state.planning.tomorrowFixed.map(item => item.templateId));
    document.getElementById("pm-routines").innerHTML = SEED_DATA.questTemplates.map(template => {
      const selected = selectedIds.has(template.id);
      const entry = state.planning.tomorrowFixed.find(item => item.templateId === template.id);
      const meta = attributes[template.attribute] || attributes.intelligence;
      return `<article class="plan-item${selected ? " selected" : ""}" style="--item-color:${meta.color};--item-bg:${meta.bg};--item-border:${meta.border}">
        <button class="plan-routine-toggle" type="button" onclick="PlanModal.toggleRoutine('${template.id}')" aria-label="${selected ? "Remove" : "Add"} ${escapeHtml(template.title)}">${selected ? '<i class="ti ti-check"></i>' : ""}</button>
        <div class="plan-item-icon">${AttributeIcons.markup(template.attribute, meta.icon)}</div>
        <div class="plan-item-body"><div class="plan-item-title">${escapeHtml(template.title)}</div><div class="plan-item-meta">${meta.label} / +${template.xp} XP</div></div>
        ${selected ? `<button class="plan-routine-time" type="button" onclick="PlanModal.pickRoutineTime('${template.id}','${entry && entry.scheduledTime || ""}')" aria-label="Choose scheduled time"><i class="ti ti-clock"></i><span>${entry && entry.scheduledTime || "--:--"}</span></button>` : ""}
      </article>`;
    }).join("");
    renderSummary();
  }

  function open() {
    ensureDialog();
    state = GameState.get();
    let mainSeen = false;
    state = GameState.set(gs => {
      gs.planning.tomorrowGoals.forEach(goal => {
        if (goal.priority === "high" && !mainSeen) mainSeen = true;
        else goal.priority = "normal";
        goal.attribute = goal.attribute || "willpower";
        goal.difficulty = goal.difficulty || "normal";
        goal.xp = Number(goal.xp) || ({ easy: 50, normal: 100, hard: 200 })[goal.difficulty];
      });
    });
    selectedQuestType = state.planning.tomorrowGoals.some(goal => goal.priority === "high") ? "side" : "main";
    selectedAttribute = "willpower";
    selectedDifficulty = "normal";
    draftGoalTime = null;
    document.getElementById("pm-goal").value = "";
    updateGoalTimeTrigger();
    const saveButton = document.getElementById("pm-save");
    saveButton.innerHTML = '<i class="ti ti-lock"></i><span>Save tomorrow\'s plan</span>';
    saveButton.classList.remove("saved");
    renderDate(); renderAttribute(); renderQuestControls(); renderGoals(); renderRoutines(); renderSummary();
    const dialog = document.getElementById("plan-dialog");
    document.body.classList.add("plan-modal-open");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else { dialog.setAttribute("open", ""); dialog.classList.add("plan-dialog-fallback"); }
  }

  function close() {
    const dialog = document.getElementById("plan-dialog");
    if (!dialog) return;
    closeTimePicker();
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else { dialog.removeAttribute("open"); dialog.classList.remove("plan-dialog-fallback"); document.body.classList.remove("plan-modal-open"); }
  }

  function selectAttribute(attribute) { selectedAttribute = attribute; renderAttribute(); }
  function selectQuestType(type) { selectedQuestType = type; renderQuestControls(); }
  function selectDifficulty(difficulty) { selectedDifficulty = difficulty; renderQuestControls(); }

  function addGoal() {
    const input = document.getElementById("pm-goal");
    const text = input.value.trim();
    if (!text) return;
    const goals = state.planning.tomorrowGoals;
    const mainCount = goals.filter(goal => goal.priority === "high").length;
    const sideCount = goals.length - mainCount;
    if (selectedQuestType === "main" && mainCount >= 1) { renderLimit("Remove the current Main Quest first"); return; }
    if (selectedQuestType === "side" && sideCount >= 3) { renderLimit("Side Quest limit reached"); return; }
    const xp = ({ easy: 50, normal: 100, hard: 200 })[selectedDifficulty];
    state = GameState.set(gs => { gs.planning.tomorrowGoals.push({ text, attribute: selectedAttribute, difficulty: selectedDifficulty, xp, priority: selectedQuestType === "main" ? "high" : "normal", scheduledTime: draftGoalTime || null }); });
    input.value = ""; draftGoalTime = null; updateGoalTimeTrigger();
    if (selectedQuestType === "main") selectedQuestType = "side";
    renderQuestControls(); renderGoals();
  }

  function removeGoal(index) { state = GameState.set(gs => { gs.planning.tomorrowGoals.splice(index, 1); }); renderGoals(); renderQuestControls(); }

  function toggleRoutine(templateId) {
    state = GameState.set(gs => {
      const index = gs.planning.tomorrowFixed.findIndex(item => item.templateId === templateId);
      if (index >= 0) gs.planning.tomorrowFixed.splice(index, 1);
      else gs.planning.tomorrowFixed.push({ templateId, priority: "normal", scheduledTime: null });
    });
    renderRoutines();
  }

  function save() {
    state = GameState.set(gs => { gs.planning.tomorrowTargetXp = null; gs.planning.tomorrowTargetAttribute = null; });
    const button = document.getElementById("pm-save");
    button.innerHTML = '<i class="ti ti-check"></i><span>Tomorrow plan saved</span>';
    button.classList.add("saved");
    setTimeout(close, 650);
  }

  return { open, close, selectAttribute, selectQuestType, selectDifficulty, addGoal, removeGoal, toggleRoutine, pickGoalTime, pickRoutineTime, closeTimePicker, adjustTime, selectTimePreset, confirmTime, clearTime, save };
})();

if (typeof window !== "undefined") window.PlanModal = PlanModal;
