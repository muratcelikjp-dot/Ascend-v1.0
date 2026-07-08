(function (global) {
  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function getLocalDateKey(date = new Date()) {
    return [
      date.getFullYear(),
      pad2(date.getMonth() + 1),
      pad2(date.getDate())
    ].join("-");
  }

  function parseLocalDateKey(dateKey) {
    const parts = String(dateKey || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }

  function localNoon(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  }

  function addDaysLocal(dateOrKey, days) {
    const date = typeof dateOrKey === "string"
      ? parseLocalDateKey(dateOrKey)
      : localNoon(dateOrKey || new Date());
    if (!date) return null;
    date.setDate(date.getDate() + days);
    return date;
  }

  function getLocalDateKeysBetween(startKey, endKey) {
    const end = parseLocalDateKey(endKey);
    let current = addDaysLocal(startKey, 1);
    const keys = [];

    while (current && end && current < end) {
      keys.push(getLocalDateKey(current));
      current = addDaysLocal(current, 1);
    }

    return keys;
  }

  global.getLocalDateKey = getLocalDateKey;
  global.DateUtils = { getLocalDateKey, parseLocalDateKey, addDaysLocal, getLocalDateKeysBetween };
})(typeof window !== "undefined" ? window : globalThis);
