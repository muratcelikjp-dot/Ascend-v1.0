// sw.js — Service Worker for offline PWA support.
//
// Strategy: stale-while-revalidate for everything in the app shell.
// This serves cached content instantly (fast load, works offline), while
// ALWAYS fetching a fresh copy in the background and updating the cache
// for next time. This is a deliberate choice given a past debugging
// session where stale cached JS files caused real confusion — a pure
// cache-first strategy would risk the exact same problem forever after
// every future update. stale-while-revalidate means a user is at most
// ONE reload behind the latest deployed version, never permanently stuck.
//
// CACHE_VERSION must be bumped on any meaningful file change so old
// caches get cleaned up and clients pick up new content promptly.
const CACHE_VERSION = "rpg-app-v3";

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
  "manifest.json",
  "data/seed-data.js",
  "js/gamestate.js",
  "js/leveling.js",
  "js/attributes.js",
  "js/skills.js",
  "js/achievements.js",
  "js/bosses.js",
  "js/streak.js",
  "js/quests.js",
  "js/rewards.js",
  "js/shield.js",
  "js/ranks.js",
  "js/prestige.js",
  "js/gameloop.js",
  "js/index.js",
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
  "icons/icon-maskable-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // activate the new SW immediately, don't wait for all tabs to close
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // take control of already-open tabs immediately
  );
});

self.addEventListener("fetch", event => {
  // Only handle GET requests for same-origin app-shell files. External
  // requests (e.g. the Tabler icon font CDN, Chart.js CDN) are left to
  // the browser's normal network handling — this service worker doesn't
  // try to cache third-party CDN assets, to avoid stale-CDN issues.
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(event.request).then(cachedResponse => {
        const networkFetch = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse); // offline: fall back to cache if network fails

        // Serve cached version immediately if present (fast + offline-capable),
        // while the network fetch above updates the cache in the background
        // for the NEXT load. If nothing is cached yet, wait for the network.
        return cachedResponse || networkFetch;
      })
    )
  );
});
