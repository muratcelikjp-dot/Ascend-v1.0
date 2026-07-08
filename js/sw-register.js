// js/sw-register.js
//
// Registers the service worker for offline PWA support. Service workers
// only work over HTTPS or on localhost (a browser security requirement) —
// this is expected to work fine under VS Code Live Server (localhost) or
// any HTTPS-hosted deployment, but will silently no-op under a plain
// file:// URL, which doesn't meet the secure-context requirement.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(err => {
      // Non-fatal: the app still works fully without offline support,
      // this just means installability/offline caching won't be active.
      console.warn("Service worker registration failed:", err);
    });
  });
}
