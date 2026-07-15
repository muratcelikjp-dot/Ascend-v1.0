(function () {
  const boundInputs = new WeakSet();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  function renderedValue(input) {
    const styles = window.getComputedStyle(input);
    const value = input.value || "";
    return styles.textTransform === "uppercase" ? value.toUpperCase() : value;
  }

  function measure(input) {
    const shell = input.parentElement;
    if (!shell || !context) return;

    const styles = window.getComputedStyle(input);
    const value = renderedValue(input);
    const caretIndex = typeof input.selectionStart === "number" ? input.selectionStart : value.length;
    const beforeCaret = value.slice(0, caretIndex);
    const letterSpacing = Number.parseFloat(styles.letterSpacing) || 0;
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const contentWidth = Math.max(0, input.clientWidth - paddingLeft - paddingRight);

    context.font = styles.font;
    const fullWidth = context.measureText(value).width + letterSpacing * Math.max(0, value.length - 1);
    const caretWidth = context.measureText(beforeCaret).width + letterSpacing * Math.max(0, beforeCaret.length - 1);
    let textStart = input.offsetLeft + paddingLeft;

    if (styles.textAlign === "center") textStart += Math.max(0, (contentWidth - fullWidth) / 2);
    else if (styles.textAlign === "right" || styles.textAlign === "end") textStart += Math.max(0, contentWidth - fullWidth);

    const rawLeft = textStart + caretWidth - input.scrollLeft + 2;
    const left = Math.max(6, Math.min(shell.clientWidth - 14, rawLeft));
    shell.style.setProperty("--terminal-caret-left", Math.round(left) + "px");
  }

  function pulse(shell) {
    shell.classList.remove("terminal-keyed");
    void shell.offsetWidth;
    shell.classList.add("terminal-keyed");
  }

  function bind(input) {
    if (!input || boundInputs.has(input)) return;
    const shell = input.parentElement;
    if (!shell) return;
    boundInputs.add(input);

    input.addEventListener("input", () => {
      measure(input);
      if (input.value) pulse(shell);
    });
    input.addEventListener("focus", () => requestAnimationFrame(() => measure(input)));
    input.addEventListener("keyup", () => measure(input));
    input.addEventListener("click", () => measure(input));
    input.addEventListener("scroll", () => measure(input));
    window.addEventListener("resize", () => measure(input));
    measure(input);
  }

  window.TerminalCaret = { bind, measure };
})();
