// sw.js - Service Worker for offline PWA support.
//
// Strategy:
// - Precache the app shell under an explicit versioned cache name.
// - Use network-first for page navigations so deployed HTML is picked up
//   as soon as the app is online.
// - Use stale-while-revalidate for same-origin static assets so the app
//   stays fast/offline-capable while refreshing cached files.
//
// CACHE_VERSION must be bumped on any meaningful app-shell file change.
const CACHE_PREFIX = "rpg-app-";
const CACHE_VERSION = "v50";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

const PRECACHE_URLS = [
  "./",
  "index.html",
  "quests.html",
  "hero.html",
  "stats.html",
  "boss.html",
  "rewards.html",
  "achievements.html",
  "plan.html",
  "css/index.css",
  "css/attribute-icons.css",
  "css/plan-modal.css",
  "manifest.json",
  "data/seed-data.js",
  "js/gamestate.js",
  "js/leveling.js",
  "js/attributes.js",
  "js/skills.js",
  "js/achievements.js",
  "js/date-utils.js",
  "js/profile.js",
  "js/profile-onboarding.js",
  "js/bosses.js",
  "js/streak.js",
  "js/quests.js",
  "js/rewards.js",
  "js/shield.js",
  "js/ranks.js",
  "js/prestige.js",
  "js/gameloop.js",
  "js/index-effects.js",
  "js/index-ui.js",
  "js/index.js",
  "js/attribute-icons.js",
  "js/plan-modal.js",
  "js/sw-register.js",
  "js/app-version.js",
  "js/stats.js",
  "icons/icon-72.png",
  "icons/icon-96.png",
  "icons/icon-128.png",
  "icons/icon-144.png",
  "icons/icon-152.png",
  "icons/icon-192.png",
  "icons/icon-384.png",
  "icons/icon-512.png",
  "icons/icon-maskable-192.png",
  "icons/icon-maskable-512.png",
  "icons/attribute-intelligence.svg",
  "icons/attribute-strength.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(
        PRECACHE_URLS.map(url => new Request(url, { cache: "reload" }))
      ))
      .then(() => self.skipWaiting()) // activate the new SW immediately, don't wait for all tabs to close
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // take control of already-open tabs immediately
  );
});

function fetchAndCache(request, cache) {
  const freshRequest = new Request(request, { cache: "reload" });
  return fetch(freshRequest).then(networkResponse => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
}

function cachedPageFallback(cache, request) {
  return cache.match(request)
    .then(cachedResponse => cachedResponse || cache.match("index.html"))
    .then(cachedResponse => cachedResponse || cache.match("./"))
    .then(cachedResponse => cachedResponse || Response.error());
}

self.addEventListener("fetch", event => {
  // Only handle GET requests for same-origin app-shell files. External
  // requests (e.g. the Tabler icon font CDN, Chart.js CDN) are left to
  // the browser's normal network handling — this service worker doesn't
  // try to cache third-party CDN assets, to avoid stale-CDN issues.
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      if (event.request.mode === "navigate") {
        return fetchAndCache(event.request, cache)
          .catch(() => cachedPageFallback(cache, event.request));
      }

      return cache.match(event.request).then(cachedResponse => {
        const networkFetch = fetchAndCache(event.request, cache)
          .catch(() => cachedResponse || Response.error()); // offline: fall back to cache if network fails

        // Serve cached version immediately if present (fast + offline-capable),
        // while the network fetch above updates the cache in the background
        // for the NEXT load. If nothing is cached yet, wait for the network.
        return cachedResponse || networkFetch;
      });
    })
  );
});
