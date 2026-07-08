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

  global.getLocalDateKey = getLocalDateKey;
  global.DateUtils = { getLocalDateKey };
})(typeof window !== "undefined" ? window : globalThis);
