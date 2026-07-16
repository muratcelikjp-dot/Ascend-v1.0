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

  function validate(name, birthDate) {
    const cleanName = String(name || "").trim().replace(/\s+/g, " ").slice(0, 32);
    const cleanBirthDate = String(birthDate || "");
    const age = calculateAge(cleanBirthDate);

    if (!cleanName) return { ok: false, error: "Enter your name." };
    if (age === null) return { ok: false, error: "Enter a valid birth date." };
    if (age < 0 || cleanBirthDate > getTodayKey()) {
      return { ok: false, error: "Birth date cannot be in the future." };
    }

    return { ok: true, profile: { name: cleanName, birthDate: cleanBirthDate } };
  }

  function save(name, birthDate) {
    const validation = validate(name, birthDate);
    if (!validation.ok) return validation;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validation.profile));
      return validation;
    } catch (error) {
      console.error("Could not save local profile.", error);
      return { ok: false, error: "Profile could not be saved on this device." };
    }
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return { ok: true, profile: null };
    } catch (error) {
      console.error("Could not clear local profile.", error);
      return { ok: false, error: "Profile could not be cleared on this device." };
    }
  }

  function replace(profile) {
    if (profile === null) return clear();
    if (!profile || typeof profile !== "object") {
      return { ok: false, error: "Backup profile is invalid." };
    }
    return save(profile.name, profile.birthDate);
  }

  global.UserProfile = {
    storageKey: STORAGE_KEY,
    get,
    validate,
    save,
    clear,
    replace,
    calculateAge,
    getTodayKey
  };
})(typeof window !== "undefined" ? window : globalThis);
