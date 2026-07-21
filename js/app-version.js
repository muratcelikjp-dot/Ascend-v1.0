(function () {
  const APP_VERSION = "v1.5.16-test";
  const BADGE_ID = "app-version-badge";

  function positionBadge(badge) {
    const appShell = document.querySelector(".screen, .app");
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;

    if (!appShell || !viewportWidth) {
      badge.style.right = "calc(env(safe-area-inset-right, 0px) + 8px)";
      return;
    }

    const rect = appShell.getBoundingClientRect();
    const rightOffset = Math.max(8, Math.round(viewportWidth - rect.right + 8));
    badge.style.right = "calc(" + rightOffset + "px + env(safe-area-inset-right, 0px))";
  }

  function showVersionBadge() {
    if (document.getElementById(BADGE_ID)) return;

    const badge = document.createElement("div");
    badge.id = BADGE_ID;
    badge.textContent = APP_VERSION;
    badge.style.cssText = [
      "position:fixed",
      "bottom:calc(env(safe-area-inset-bottom, 0px) + 8px)",
      "z-index:9999",
      "padding:3px 6px",
      "border:1px solid rgba(255,255,255,0.16)",
      "border-radius:4px",
      "background:rgba(2,13,24,0.72)",
      "color:rgba(210,240,250,0.62)",
      "font:10px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      "letter-spacing:0",
      "pointer-events:none",
      "user-select:none"
    ].join(";");

    document.body.appendChild(badge);
    positionBadge(badge);
    window.addEventListener("resize", () => positionBadge(badge));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showVersionBadge);
  } else {
    showVersionBadge();
  }
})();
