// js/sw-register.js
//
// Registers the service worker for offline PWA support. Service workers
// only work over HTTPS or on localhost (a browser security requirement).
// This is expected to work under GitHub Pages or local HTTPS/localhost,
// but will no-op under a plain file:// URL.
if ("serviceWorker" in navigator) {
  let refreshing = false;
  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
      .then(registration => {
        registration.update().catch(err => {
          console.warn("Service worker update check failed:", err);
        });
      })
      .catch(err => {
        // Non-fatal: the app still works fully without offline support,
        // this just means installability/offline caching won't be active.
        console.warn("Service worker registration failed:", err);
      });
  });
}
