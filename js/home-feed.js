(function (global) {
  "use strict";

  const STORAGE_KEY = "rpg-home-feed-v1";
  const MAX_AGE_MS = 6 * 60 * 60 * 1000;
  const MAX_EVENTS = 3;
  const MAX_REPEAT_COUNT = 6;
  const SUPPORTED_SOURCES = ["quest", "rewards", "boss", "hero", "stats", "skill"];

  function removePending() {
    try {
      global.sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Could not clear the pending home feed effect.", error);
    }
  }

  function normalizeEvent(value) {
    if (!value || !SUPPORTED_SOURCES.includes(value.source) || !Number.isFinite(value.queuedAt)) return null;
    return {
      source: value.source,
      count: Math.max(1, Math.min(MAX_REPEAT_COUNT, Number(value.count) || 1)),
      queuedAt: value.queuedAt
    };
  }

  function readQueue() {
    try {
      const value = JSON.parse(global.sessionStorage.getItem(STORAGE_KEY) || "null");
      if (!value) return [];
      const queue = (Array.isArray(value) ? value : [value])
        .map(normalizeEvent)
        .filter(event => event && Date.now() - event.queuedAt <= MAX_AGE_MS)
        .slice(0, MAX_EVENTS);
      if (!queue.length) removePending();
      return queue;
    } catch (error) {
      removePending();
      return [];
    }
  }

  function writeQueue(queue) {
    if (!queue.length) {
      removePending();
      return;
    }
    global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }

  function queue(source) {
    if (!SUPPORTED_SOURCES.includes(source)) return false;
    try {
      const pending = readQueue();
      const existing = pending.find(event => event.source === source);
      if (existing) {
        existing.count = Math.min(MAX_REPEAT_COUNT, existing.count + 1);
        existing.queuedAt = Date.now();
      } else {
        if (pending.length >= MAX_EVENTS) pending.shift();
        pending.push({ source, count: 1, queuedAt: Date.now() });
      }
      writeQueue(pending);
      return true;
    } catch (error) {
      console.warn("Could not queue the home feed effect.", error);
      return false;
    }
  }

  function queueQuestCompletion() {
    return queue("quest");
  }

  function queueRewardPurchase() {
    return queue("rewards");
  }

  function queueBossImpact() {
    return queue("boss");
  }

  function consumePending() {
    const queue = readQueue();
    if (!queue.length) return null;
    const pending = queue.shift();
    writeQueue(queue);
    return {
      source: pending.source,
      count: pending.count,
      strength: pending.count > 1 ? 2 : 1,
      waves: pending.count > 1 ? 3 : 2
    };
  }

  global.HomeFeed = {
    queue,
    queueQuestCompletion,
    queueRewardPurchase,
    queueBossImpact,
    consumePending
  };
})(typeof window !== "undefined" ? window : globalThis);
