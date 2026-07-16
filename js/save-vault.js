(function (global) {
  const FORMAT = "rpg-save-backup";
  const FORMAT_VERSION = 1;
  const RECOVERY_PREFIX = "rpg_restore_backup_";
  const MAX_RECOVERY_BACKUPS = 3;

  function getRecoveryKeys() {
    const keys = [];
    try {
      for (let index = 0; index < global.localStorage.length; index += 1) {
        const key = global.localStorage.key(index);
        if (key && key.startsWith(RECOVERY_PREFIX)) keys.push(key);
      }
    } catch (error) {
      console.error("SaveVault: recovery backups could not be listed.", error);
    }
    return keys.sort().reverse();
  }

  function createBackup() {
    const gameState = global.GameState.exportState();
    return {
      format: FORMAT,
      formatVersion: FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      appStateVersion: gameState.version,
      gameState,
      profile: global.UserProfile.get()
    };
  }

  function validateBackup(candidate) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return { ok: false, error: "This is not a valid RPG save file." };
    }
    if (candidate.format !== FORMAT || Number(candidate.formatVersion) !== FORMAT_VERSION) {
      return { ok: false, error: "This save format is not supported." };
    }

    const stateResult = global.GameState.validateImport(candidate.gameState);
    if (!stateResult.ok) return stateResult;

    let profile = null;
    if (candidate.profile !== null && candidate.profile !== undefined) {
      const profileResult = global.UserProfile.validate(
        candidate.profile && candidate.profile.name,
        candidate.profile && candidate.profile.birthDate
      );
      if (!profileResult.ok) return { ok: false, error: "Backup profile is invalid." };
      profile = profileResult.profile;
    }

    return {
      ok: true,
      backup: {
        format: FORMAT,
        formatVersion: FORMAT_VERSION,
        exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : null,
        appStateVersion: stateResult.state.version,
        gameState: stateResult.state,
        profile
      }
    };
  }

  function parseBackup(text) {
    try {
      return validateBackup(JSON.parse(String(text || "")));
    } catch (error) {
      return { ok: false, error: "The selected file is not valid JSON." };
    }
  }

  function serializeBackup() {
    return JSON.stringify(createBackup(), null, 2);
  }

  function preserveCurrentBackup() {
    try {
      const timestamp = Date.now();
      let key = RECOVERY_PREFIX + timestamp;
      let suffix = 1;
      while (global.localStorage.getItem(key) !== null) {
        key = RECOVERY_PREFIX + timestamp + "_" + suffix;
        suffix += 1;
      }
      global.localStorage.setItem(key, serializeBackup());
      getRecoveryKeys().slice(MAX_RECOVERY_BACKUPS).forEach(oldKey => {
        global.localStorage.removeItem(oldKey);
      });
      return true;
    } catch (error) {
      console.error("SaveVault: recovery backup could not be created.", error);
      return false;
    }
  }

  function applyBackup(backup) {
    const previousProfile = global.UserProfile.get();
    const profileResult = global.UserProfile.replace(backup.profile);
    if (!profileResult.ok) return profileResult;

    const stateResult = global.GameState.importState(backup.gameState);
    if (!stateResult.ok) {
      global.UserProfile.replace(previousProfile);
      return stateResult;
    }

    return { ok: true, state: stateResult.state, profile: profileResult.profile };
  }

  function restoreBackup(text, options) {
    const parsed = parseBackup(text);
    if (!parsed.ok) return parsed;

    const shouldPreserve = !options || options.preserveCurrent !== false;
    if (shouldPreserve && !preserveCurrentBackup()) {
      return { ok: false, error: "A recovery copy could not be created, so restore was cancelled." };
    }

    return applyBackup(parsed.backup);
  }

  function restoreLatestRecovery() {
    const latestKey = getRecoveryKeys()[0];
    if (!latestKey) return { ok: false, error: "No recovery copy is available." };

    try {
      const raw = global.localStorage.getItem(latestKey);
      if (!raw) return { ok: false, error: "The recovery copy is unavailable." };
      return restoreBackup(raw);
    } catch (error) {
      console.error("SaveVault: recovery backup could not be read.", error);
      return { ok: false, error: "The recovery copy could not be read." };
    }
  }

  function hasRecoveryBackup() {
    return getRecoveryKeys().length > 0;
  }

  function downloadBackup() {
    const blob = new Blob([serializeBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    anchor.href = url;
    anchor.download = "rpg-save-" + date + ".json";
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return { ok: true };
  }

  global.SaveVault = {
    createBackup,
    serializeBackup,
    parseBackup,
    restoreBackup,
    restoreLatestRecovery,
    hasRecoveryBackup,
    downloadBackup
  };
})(typeof window !== "undefined" ? window : globalThis);
