(function (global) {
  const STORAGE_KEY = "rpg-user-profile-v1";

  function getTodayKey() {
    if (global.DateUtils && typeof global.DateUtils.getLocalDateKey === "function") {
      return global.DateUtils.getLocalDateKey();
    }

    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
  }

  function parseBirthDate(birthDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDate || ""));
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) return null;

    return { year, month, day };
  }

  function calculateAge(birthDate, now = new Date()) {
    const parsed = parseBirthDate(birthDate);
    if (!parsed) return null;

    let age = now.getFullYear() - parsed.year;
    const birthdayPassed =
      now.getMonth() + 1 > parsed.month ||
      (now.getMonth() + 1 === parsed.month && now.getDate() >= parsed.day);

    if (!birthdayPassed) age -= 1;
    return age;
  }

  function get() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const profile = JSON.parse(raw);
      const name = typeof profile.name === "string" ? profile.name.trim() : "";
      const age = calculateAge(profile.birthDate);
      if (!name || age === null || age < 0) return null;
      return { name, birthDate: profile.birthDate };
    } catch (error) {
      console.error("Could not read local profile.", error);
      return null;
    }
  }

  function save(name, birthDate) {
    const cleanName = String(name || "").trim().replace(/\s+/g, " ").slice(0, 32);
    const age = calculateAge(birthDate);

    if (!cleanName) return { ok: false, error: "Enter your name." };
    if (age === null) return { ok: false, error: "Enter a valid birth date." };
    if (age < 0 || birthDate > getTodayKey()) {
      return { ok: false, error: "Birth date cannot be in the future." };
    }

    const profile = { name: cleanName, birthDate };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return { ok: true, profile };
    } catch (error) {
      console.error("Could not save local profile.", error);
      return { ok: false, error: "Profile could not be saved on this device." };
    }
  }

  global.UserProfile = {
    storageKey: STORAGE_KEY,
    get,
    save,
    calculateAge,
    getTodayKey
  };
})(typeof window !== "undefined" ? window : globalThis);
