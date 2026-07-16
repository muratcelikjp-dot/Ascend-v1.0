const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const seedSource = fs.readFileSync(path.join(ROOT, "data", "seed-data.js"), "utf8");
const levelingSource = fs.readFileSync(path.join(ROOT, "js", "leveling.js"), "utf8");
const dateUtilsSource = fs.readFileSync(path.join(ROOT, "js", "date-utils.js"), "utf8");
const gameStateSource = fs.readFileSync(path.join(ROOT, "js", "gamestate.js"), "utf8");
const attributesSource = fs.readFileSync(path.join(ROOT, "js", "attributes.js"), "utf8");
const skillsSource = fs.readFileSync(path.join(ROOT, "js", "skills.js"), "utf8");
const achievementsSource = fs.readFileSync(path.join(ROOT, "js", "achievements.js"), "utf8");
const activeEffectsSource = fs.readFileSync(path.join(ROOT, "js", "active-effects.js"), "utf8");
const weeklyRecapSource = fs.readFileSync(path.join(ROOT, "js", "weekly-recap.js"), "utf8");
const progressiveUnlocksSource = fs.readFileSync(path.join(ROOT, "js", "progressive-unlocks.js"), "utf8");
const journeyTimelineSource = fs.readFileSync(path.join(ROOT, "js", "journey-timeline.js"), "utf8");
const bossesSource = fs.readFileSync(path.join(ROOT, "js", "bosses.js"), "utf8");
const ranksSource = fs.readFileSync(path.join(ROOT, "js", "ranks.js"), "utf8");
const dailyStateSource = fs.readFileSync(path.join(ROOT, "js", "daily-state.js"), "utf8");
const questsSource = fs.readFileSync(path.join(ROOT, "js", "quests.js"), "utf8");
const proofSource = fs.readFileSync(path.join(ROOT, "js", "proof.js"), "utf8");
const profileSource = fs.readFileSync(path.join(ROOT, "js", "profile.js"), "utf8");
const saveVaultSource = fs.readFileSync(path.join(ROOT, "js", "save-vault.js"), "utf8");

class MemoryStorage {
  constructor(entries = {}, options = {}) {
    this.values = new Map(Object.entries(entries));
    this.throwOnRead = Boolean(options.throwOnRead);
    this.throwOnWrite = Boolean(options.throwOnWrite);
  }

  getItem(key) {
    if (this.throwOnRead) throw new Error("storage read unavailable");
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    if (this.throwOnWrite) throw new Error("storage write unavailable");
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  get length() {
    return this.values.size;
  }

  key(index) {
    return [...this.values.keys()][index] ?? null;
  }

  keys() {
    return [...this.values.keys()];
  }
}

function createRuntime(storage) {
  const errors = [];
  const context = {
    localStorage: storage,
    console: {
      error: (...args) => errors.push(args),
      warn: () => {},
      log: () => {}
    },
    Date,
    JSON,
    Math,
    setTimeout,
    clearTimeout
  };

  vm.createContext(context);
  vm.runInContext(seedSource + ";globalThis.SEED_DATA=SEED_DATA;", context);
  vm.runInContext(levelingSource + ";globalThis.Leveling=Leveling;", context);
  vm.runInContext(dateUtilsSource, context);
  vm.runInContext(gameStateSource + ";globalThis.GameState=GameState;", context);
  vm.runInContext(attributesSource + ";globalThis.Attributes=Attributes;", context);
  vm.runInContext(skillsSource + ";globalThis.Skills=Skills;", context);
  vm.runInContext(achievementsSource + ";globalThis.Achievements=Achievements;", context);
  vm.runInContext(activeEffectsSource, context);
  vm.runInContext(weeklyRecapSource, context);
  vm.runInContext(progressiveUnlocksSource, context);
  vm.runInContext(proofSource, context);
  vm.runInContext(journeyTimelineSource, context);
  vm.runInContext(bossesSource + ";globalThis.Bosses=Bosses;", context);
  vm.runInContext(ranksSource + ";globalThis.Ranks=Ranks;", context);
  vm.runInContext(dailyStateSource, context);
  vm.runInContext(questsSource + ";globalThis.Quests=Quests;", context);
  vm.runInContext(profileSource, context);
  vm.runInContext(saveVaultSource, context);

  return {
    GameState: context.GameState,
    DateUtils: context.DateUtils,
    ActiveEffects: context.ActiveEffects,
    WeeklyRecap: context.WeeklyRecap,
    ProgressiveUnlocks: context.ProgressiveUnlocks,
    JourneyTimeline: context.JourneyTimeline,
    DailyState: context.DailyState,
    Quests: context.Quests,
    Proof: context.Proof,
    UserProfile: context.UserProfile,
    SaveVault: context.SaveVault,
    SEED_DATA: context.SEED_DATA,
    errors
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("fresh state is created and persisted", () => {
  const storage = new MemoryStorage();
  const { GameState, SEED_DATA } = createRuntime(storage);

  const state = GameState.get();
  const persisted = JSON.parse(storage.getItem("rpg_state"));

  assert.equal(state.version, SEED_DATA.defaultState.version);
  assert.equal(persisted.version, SEED_DATA.defaultState.version);
  assert.equal(persisted.level, 1);
  assert.equal(persisted.bosses.currentBossId, "procrastination");
});

test("nested progress survives a new app runtime", () => {
  const storage = new MemoryStorage();
  const firstRuntime = createRuntime(storage);

  firstRuntime.GameState.set(state => {
    state.xp = 275;
    state.lifetimeXp = 640;
    state.attributes.intelligence.xp = 180;
    state.quests.active.push({ id: "persisted-quest", title: "Keep this quest", done: false });
  });

  const secondRuntime = createRuntime(storage);
  const reloaded = secondRuntime.GameState.get();

  assert.equal(reloaded.xp, 275);
  assert.equal(reloaded.lifetimeXp, 640);
  assert.equal(reloaded.attributes.intelligence.xp, 180);
  assert.equal(reloaded.quests.active[0].id, "persisted-quest");
});

test("older saves migrate without losing player progress", () => {
  const bootstrapStorage = new MemoryStorage();
  const bootstrap = createRuntime(bootstrapStorage);
  const legacyState = clone(bootstrap.SEED_DATA.defaultState);

  legacyState.version = 8;
  legacyState.xp = 432;
  legacyState.lifetimeXp = 987;
  legacyState.goals.selected = ["fitness", "career"];
  legacyState.goals.onboardingComplete = true;
  delete legacyState.goals.lastSuggestionDate;

  const storage = new MemoryStorage({ rpg_state: JSON.stringify(legacyState) });
  const { GameState, SEED_DATA } = createRuntime(storage);
  const migrated = GameState.get();
  const persisted = JSON.parse(storage.getItem("rpg_state"));

  assert.equal(migrated.version, SEED_DATA.defaultState.version);
  assert.equal(migrated.xp, 432);
  assert.equal(migrated.lifetimeXp, 987);
  assert.deepEqual([...migrated.goals.selected], ["fitness", "career"]);
  assert.equal(migrated.goals.lastSuggestionDate, null);
  assert.equal(persisted.version, SEED_DATA.defaultState.version);
});

test("corrupted JSON is preserved before a fresh save is created", () => {
  const corrupted = "{not-valid-json";
  const storage = new MemoryStorage({ rpg_state: corrupted });
  const { GameState, errors } = createRuntime(storage);

  const recovered = GameState.get();
  const backupKey = storage.keys().find(key => key.startsWith("rpg_state_corrupt_backup_"));

  assert.ok(backupKey, "a corrupted save backup should exist");
  assert.equal(storage.getItem(backupKey), corrupted);
  assert.equal(recovered.level, 1);
  assert.doesNotThrow(() => JSON.parse(storage.getItem("rpg_state")));
  assert.ok(errors.some(args => String(args[0]).includes("corrupted save detected")));
});

test("progress remains available for the session when storage is unavailable", () => {
  const storage = new MemoryStorage({}, { throwOnRead: true, throwOnWrite: true });
  const { GameState, errors } = createRuntime(storage);

  GameState.get();
  GameState.set(state => {
    state.xp = 150;
    state.quests.active.push({ id: "volatile-quest", title: "Session only", done: false });
  });
  const sessionState = GameState.get();

  assert.equal(sessionState.xp, 150);
  assert.equal(sessionState.quests.active[0].id, "volatile-quest");
  assert.ok(errors.some(args => String(args[0]).includes("progress will remain available only for this session")));
});

test("exported state is detached from the live save", () => {
  const storage = new MemoryStorage();
  const { GameState } = createRuntime(storage);
  GameState.set(state => { state.xp = 220; });

  const exported = GameState.exportState();
  exported.xp = 9999;
  exported.attributes.intelligence.xp = 9999;

  const saved = GameState.get();
  assert.equal(saved.xp, 220);
  assert.notEqual(saved.attributes.intelligence.xp, 9999);
});

test("invalid imported state is rejected without changing the save", () => {
  const storage = new MemoryStorage();
  const { GameState } = createRuntime(storage);
  GameState.set(state => { state.xp = 345; });
  const before = storage.getItem("rpg_state");
  const invalid = GameState.exportState();
  delete invalid.planning;

  const result = GameState.importState(invalid);

  assert.equal(result.ok, false);
  assert.equal(storage.getItem("rpg_state"), before);
  assert.equal(GameState.get().xp, 345);
});

test("save vault restores game state and profile while preserving a recovery copy", () => {
  const storage = new MemoryStorage();
  const { GameState, UserProfile, SaveVault } = createRuntime(storage);
  GameState.set(state => { state.xp = 125; });
  UserProfile.save("Murat", "2000-04-12");
  const backup = SaveVault.serializeBackup();

  GameState.set(state => { state.xp = 780; });
  UserProfile.save("Changed", "1999-02-01");
  const result = SaveVault.restoreBackup(backup);

  assert.equal(result.ok, true);
  assert.equal(GameState.get().xp, 125);
  assert.equal(UserProfile.get().name, "Murat");
  assert.ok(storage.keys().some(key => key.startsWith("rpg_restore_backup_")));
});

test("invalid save vault files never replace current progress", () => {
  const storage = new MemoryStorage();
  const { GameState, UserProfile, SaveVault } = createRuntime(storage);
  GameState.set(state => { state.xp = 510; });
  UserProfile.save("Murat", "2000-04-12");
  const beforeState = storage.getItem("rpg_state");
  const beforeProfile = storage.getItem(UserProfile.storageKey);

  const result = SaveVault.restoreBackup('{"format":"wrong"}');

  assert.equal(result.ok, false);
  assert.equal(storage.getItem("rpg_state"), beforeState);
  assert.equal(storage.getItem(UserProfile.storageKey), beforeProfile);
  assert.equal(storage.keys().filter(key => key.startsWith("rpg_restore_backup_")).length, 0);
});

test("latest recovery copy can undo a completed restore", () => {
  const storage = new MemoryStorage();
  const { GameState, UserProfile, SaveVault } = createRuntime(storage);
  GameState.set(state => { state.xp = 100; });
  UserProfile.save("Backup", "2000-04-12");
  const backup = SaveVault.serializeBackup();

  GameState.set(state => { state.xp = 900; });
  UserProfile.save("Current", "1999-02-01");
  assert.equal(SaveVault.restoreBackup(backup).ok, true);
  assert.equal(GameState.get().xp, 100);

  const recoveryResult = SaveVault.restoreLatestRecovery();
  assert.equal(recoveryResult.ok, true);
  assert.equal(GameState.get().xp, 900);
  assert.equal(UserProfile.get().name, "Current");
});

test("version 9 saves gain daily state and explicit quest types", () => {
  const bootstrap = createRuntime(new MemoryStorage());
  const legacy = clone(bootstrap.SEED_DATA.defaultState);
  legacy.version = 9;
  delete legacy.dailyState;
  legacy.quests.active = [
    { id: "old-main", title: "Main", priority: "high", done: false },
    { id: "old-side", title: "Side", priority: "normal", done: false },
    { id: "fixed_old", title: "Routine", priority: "normal", done: false }
  ];

  const storage = new MemoryStorage({ rpg_state: JSON.stringify(legacy) });
  const { GameState } = createRuntime(storage);
  const migrated = GameState.get();

  assert.equal(migrated.version, bootstrap.SEED_DATA.defaultState.version);
  assert.deepEqual(Object.keys(migrated.dailyState.checkIns), []);
  assert.equal(migrated.quests.active[0].questType, "main");
  assert.equal(migrated.quests.active[1].questType, "side");
  assert.equal(migrated.quests.active[2].questType, "routine");
});

test("daily capacity check-ins persist under their local date key", () => {
  const storage = new MemoryStorage();
  const first = createRuntime(storage);
  first.GameState.set(state => {
    first.DailyState.set(state, "steady", "2026-07-15");
  });

  const second = createRuntime(storage);
  const reloaded = second.GameState.get();
  assert.equal(second.DailyState.get(reloaded, "2026-07-15").capacity, "steady");
  assert.equal(second.DailyState.get(reloaded, "2026-07-16"), null);
});

test("tomorrow planning promotes one explicit main quest during daily reset", () => {
  const storage = new MemoryStorage();
  const runtime = createRuntime(storage);
  const today = runtime.DateUtils.getLocalDateKey();
  const yesterday = runtime.DateUtils.getLocalDateKey(runtime.DateUtils.addDaysLocal(today, -1));

  runtime.GameState.set(state => {
    state.quests.lastResetDate = yesterday;
    state.quests.active = [];
    state.planning.tomorrowGoals = [
      { text: "Finish the key project", attribute: "willpower", difficulty: "hard", xp: 200, questType: "main", priority: "high" },
      { text: "Read ten pages", attribute: "intelligence", difficulty: "easy", xp: 50, questType: "side", priority: "normal" }
    ];
  });
  runtime.GameState.set(state => { runtime.Quests.ensureDailyReset(state); });
  const state = runtime.GameState.get();

  assert.equal(state.quests.lastResetDate, today);
  assert.equal(state.quests.active.filter(quest => quest.questType === "main").length, 1);
  assert.equal(runtime.Quests.getMainQuest(state).title, "Finish the key project");
  assert.equal(state.quests.active.find(quest => quest.title === "Read ten pages").questType, "side");
});

test("adding a second main quest safely demotes it to a side quest", () => {
  const storage = new MemoryStorage();
  const runtime = createRuntime(storage);
  runtime.GameState.set(state => {
    runtime.Quests.addQuest(state, { title: "First", attribute: "willpower", difficulty: "normal", xp: 100, questType: "main" });
    runtime.Quests.addQuest(state, { title: "Second", attribute: "strength", difficulty: "normal", xp: 100, questType: "main" });
  });

  const quests = runtime.GameState.get().quests.active;
  assert.equal(quests[0].questType, "main");
  assert.equal(quests[1].questType, "side");
  assert.equal(quests.filter(quest => quest.questType === "main").length, 1);
});

test("minimum quest derives a five-minute fallback from the main quest and remains unique", () => {
  const storage = new MemoryStorage();
  const runtime = createRuntime(storage);
  let firstOutcome;
  let secondOutcome;
  runtime.GameState.set(state => {
    const main = runtime.Quests.addQuest(state, { title: "Finish portfolio", attribute: "intelligence", difficulty: "hard", xp: 200, questType: "main" });
    firstOutcome = runtime.Quests.addMinimumQuest(state);
    secondOutcome = runtime.Quests.addMinimumQuest(state);
    assert.equal(firstOutcome.quest.sourceMainQuestId, main.id);
  });

  const state = runtime.GameState.get();
  const minimumQuests = state.quests.active.filter(quest => quest.questType === "minimum");
  assert.equal(firstOutcome.added, true);
  assert.equal(secondOutcome.added, false);
  assert.equal(secondOutcome.reason, "already-active");
  assert.equal(minimumQuests.length, 1);
  assert.equal(minimumQuests[0].title, 'Work on "Finish portfolio" for 5 minutes');
  assert.equal(minimumQuests[0].attribute, "intelligence");
  assert.equal(minimumQuests[0].difficulty, "easy");
  assert.equal(minimumQuests[0].xp, 50);
  assert.deepEqual([...minimumQuests[0].tags], ["minimum", "no-zero-day"]);
});

test("minimum quest cannot be deployed after progress has already secured the day", () => {
  const storage = new MemoryStorage();
  const runtime = createRuntime(storage);
  let outcome;
  runtime.GameState.set(state => {
    state.quests.completedToday = 1;
    outcome = runtime.Quests.addMinimumQuest(state);
  });

  assert.equal(outcome.added, false);
  assert.equal(outcome.reason, "day-secured");
  assert.equal(runtime.Quests.getMinimumQuest(runtime.GameState.get()), null);
});

test("an unfinished minimum quest never carries into the next local day", () => {
  const storage = new MemoryStorage();
  const runtime = createRuntime(storage);
  const today = runtime.DateUtils.getLocalDateKey();
  const yesterday = runtime.DateUtils.getLocalDateKey(runtime.DateUtils.addDaysLocal(today, -1));
  runtime.GameState.set(state => {
    state.quests.lastResetDate = yesterday;
    runtime.Quests.addMinimumQuest(state);
  });

  runtime.GameState.set(state => { runtime.Quests.ensureDailyReset(state); });
  const state = runtime.GameState.get();
  assert.equal(state.quests.lastResetDate, today);
  assert.equal(runtime.Quests.getMinimumQuest(state), null);
});

test("daily state returns detached load recommendations for each capacity", () => {
  const runtime = createRuntime(new MemoryStorage());
  const low = runtime.DailyState.getRecommendation("low");
  const steady = runtime.DailyState.getRecommendation("steady");
  const strong = runtime.DailyState.getRecommendation("strong");

  assert.equal(low.recommendedQuestCount, 1);
  assert.equal(steady.recommendedQuestCount, 3);
  assert.equal(strong.recommendedQuestCount, 5);
  assert.equal(runtime.DailyState.getRecommendation("unknown"), null);

  low.recommendedQuestCount = 99;
  assert.equal(runtime.DailyState.getRecommendation("low").recommendedQuestCount, 1);
});

test("selecting a new main quest demotes the previous main and moves the new focus first", () => {
  const storage = new MemoryStorage();
  const runtime = createRuntime(storage);
  let first;
  let second;
  let outcome;
  runtime.GameState.set(state => {
    first = runtime.Quests.addQuest(state, { title: "Old focus", attribute: "willpower", difficulty: "normal", xp: 100, questType: "main" });
    second = runtime.Quests.addQuest(state, { title: "New focus", attribute: "intelligence", difficulty: "hard", xp: 200 });
    outcome = runtime.Quests.setMainQuest(state, second.id);
  });

  const state = runtime.GameState.get();
  assert.equal(outcome.ok, true);
  assert.equal(outcome.changed, true);
  assert.equal(runtime.Quests.getMainQuest(state).id, second.id);
  assert.equal(state.quests.active[0].id, second.id);
  assert.equal(state.quests.active.find(quest => quest.id === first.id).questType, "side");
  assert.equal(state.quests.active.filter(quest => quest.questType === "main").length, 1);

  const reloaded = createRuntime(storage);
  assert.equal(reloaded.Quests.getMainQuest(reloaded.GameState.get()).id, second.id);
});

test("a cleared main quest is locked for the rest of the day", () => {
  const runtime = createRuntime(new MemoryStorage());
  let main;
  let side;
  let outcome;
  runtime.GameState.set(state => {
    main = runtime.Quests.addQuest(state, { title: "Finished focus", attribute: "willpower", difficulty: "normal", xp: 100, questType: "main" });
    side = runtime.Quests.addQuest(state, { title: "Replacement", attribute: "strength", difficulty: "normal", xp: 100 });
    main.done = true;
    outcome = runtime.Quests.setMainQuest(state, side.id);
  });

  const state = runtime.GameState.get();
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, "main-cleared");
  assert.equal(runtime.Quests.getMainQuest(state).id, main.id);
  assert.equal(state.quests.active.find(quest => quest.id === side.id).questType, "side");
});

test("routine, minimum and completed quests are excluded from main quest candidates", () => {
  const runtime = createRuntime(new MemoryStorage());
  runtime.GameState.set(state => {
    const side = runtime.Quests.addQuest(state, { title: "Eligible", attribute: "charisma", difficulty: "easy", xp: 50 });
    const done = runtime.Quests.addQuest(state, { title: "Done", attribute: "charisma", difficulty: "easy", xp: 50 });
    done.done = true;
    state.quests.active.push({ id: "fixed_test", title: "Routine", questType: "routine", priority: "normal", done: false });
    runtime.Quests.addMinimumQuest(state);
    assert.equal(runtime.Quests.getMainQuestCandidates(state).map(quest => quest.id).includes(side.id), true);
  });

  const candidates = runtime.Quests.getMainQuestCandidates(runtime.GameState.get());
  assert.deepEqual(candidates.map(quest => quest.title), ["Eligible"]);
});

test("daily reset records the ending main quest result in the day report", () => {
  const runtime = createRuntime(new MemoryStorage());
  const today = runtime.DateUtils.getLocalDateKey();
  const yesterday = runtime.DateUtils.getLocalDateKey(runtime.DateUtils.addDaysLocal(today, -1));
  runtime.GameState.set(state => {
    state.quests.lastResetDate = yesterday;
    const main = runtime.Quests.addQuest(state, { title: "Ship the portfolio", attribute: "intelligence", difficulty: "hard", xp: 200, questType: "main" });
    main.done = true;
    state.quests.completedToday = 1;
    if (!state.dailyLog) state.dailyLog = {};
    state.dailyLog[yesterday] = { xp: 200, questsCompleted: 1, questsMissed: 0, attributeXp: { intelligence: 200 } };
  });

  runtime.GameState.set(state => { runtime.Quests.ensureDailyReset(state); });
  const report = runtime.GameState.get().planning.dayReports[yesterday];

  assert.equal(report.mainQuest.id.startsWith("q_"), true);
  assert.equal(report.mainQuest.title, "Ship the portfolio");
  assert.equal(report.mainQuest.completed, true);
  assert.equal(report.questsCompleted, 1);
  assert.equal(report.actualXp, 200);
});

test("older saves gain an empty active effects collection without losing progress", () => {
  const bootstrap = createRuntime(new MemoryStorage());
  const legacy = clone(bootstrap.SEED_DATA.defaultState);
  legacy.version = 10;
  legacy.xp = 640;
  delete legacy.activeEffects;

  const storage = new MemoryStorage({ rpg_state: JSON.stringify(legacy) });
  const runtime = createRuntime(storage);
  const migrated = runtime.GameState.get();

  assert.equal(migrated.xp, 640);
  assert.deepEqual([...migrated.activeEffects.active], []);
  assert.equal(migrated.version, runtime.SEED_DATA.defaultState.version);
});

test("version 11 saves gain an empty proof archive without losing progress", () => {
  const bootstrap = createRuntime(new MemoryStorage());
  const legacy = clone(bootstrap.SEED_DATA.defaultState);
  legacy.version = 11;
  legacy.xp = 720;
  delete legacy.proofs;

  const storage = new MemoryStorage({ rpg_state: JSON.stringify(legacy) });
  const runtime = createRuntime(storage);
  const migrated = runtime.GameState.get();

  assert.equal(migrated.xp, 720);
  assert.deepEqual([...migrated.proofs.records], []);
  assert.equal(migrated.version, runtime.SEED_DATA.defaultState.version);
});

test("completing the main quest activates one Momentum effect for the local day", () => {
  const runtime = createRuntime(new MemoryStorage());
  let main;
  let outcome;
  runtime.GameState.set(state => {
    main = runtime.Quests.addQuest(state, {
      title: "Ship the important work",
      attribute: "willpower",
      difficulty: "normal",
      xp: 100,
      questType: "main"
    });
    outcome = runtime.Quests.toggleQuest(state, main.id);
  });

  const effects = runtime.ActiveEffects.getActive(runtime.GameState.get());
  assert.equal(outcome.completed, true);
  assert.equal(outcome.activatedEffects.length, 1);
  assert.equal(effects.length, 1);
  assert.equal(effects[0].id, "momentum");
  assert.equal(effects[0].sourceQuestId, main.id);
});

test("Momentum does not duplicate and expires at the next local date reset", () => {
  const runtime = createRuntime(new MemoryStorage());
  const today = runtime.DateUtils.getLocalDateKey();
  let first;
  let second;
  runtime.GameState.set(state => {
    first = runtime.ActiveEffects.activate(state, "momentum", { id: "main-1", title: "Main" });
    second = runtime.ActiveEffects.activate(state, "momentum", { id: "main-1", title: "Main" });
    state.quests.lastResetDate = today;
  });

  assert.equal(first.activated, true);
  assert.equal(second.activated, false);
  assert.equal(runtime.ActiveEffects.getActive(runtime.GameState.get()).length, 1);

  runtime.GameState.set(state => {
    state.activeEffects.active[0].dateKey = runtime.DateUtils.getLocalDateKey(runtime.DateUtils.addDaysLocal(today, -1));
    runtime.Quests.ensureDailyReset(state);
  });
  assert.equal(runtime.GameState.get().activeEffects.active.length, 0);
});

test("Momentum grants ten percent bonus XP to the next Side Quest and is consumed", () => {
  const runtime = createRuntime(new MemoryStorage());
  let sideOutcome;
  runtime.GameState.set(state => {
    const main = runtime.Quests.addQuest(state, {
      title: "Secure the priority",
      attribute: "willpower",
      difficulty: "normal",
      xp: 100,
      questType: "main"
    });
    runtime.Quests.toggleQuest(state, main.id);

    const side = runtime.Quests.addQuest(state, {
      title: "Continue with one useful action",
      attribute: "charisma",
      difficulty: "normal",
      xp: 100,
      questType: "side"
    });
    sideOutcome = runtime.Quests.toggleQuest(state, side.id);
  });

  const state = runtime.GameState.get();
  assert.equal(sideOutcome.bonusXpFromEffects, 10);
  assert.equal(sideOutcome.consumedEffects.length, 1);
  assert.equal(sideOutcome.consumedEffects[0].id, "momentum");
  assert.equal(state.xp, 210);
  assert.equal(runtime.ActiveEffects.getActive(state).length, 0);
});

test("Momentum ignores routine quests and keeps its charge", () => {
  const runtime = createRuntime(new MemoryStorage());
  runtime.GameState.set(state => {
    runtime.ActiveEffects.activate(state, "momentum", { id: "main-1", title: "Main" });
  });

  const state = runtime.GameState.get();
  const routineBonus = runtime.ActiveEffects.getQuestXpBonus(state, { questType: "routine", xp: 50 });
  assert.equal(routineBonus.multiplier, 0);
  assert.equal(runtime.ActiveEffects.getActive(state).length, 1);
});

test("weekly recap returns a calm empty-state story without mutating progress", () => {
  const runtime = createRuntime(new MemoryStorage());
  const state = runtime.GameState.get();
  const before = JSON.stringify(state);
  const recap = runtime.WeeklyRecap.build(state);

  assert.equal(recap.activeDays, 0);
  assert.equal(recap.questsCompleted, 0);
  assert.equal(recap.xpEarned, 0);
  assert.equal(recap.headline, "The campaign is waiting");
  assert.equal(JSON.stringify(state), before);
});

test("weekly recap combines local daily logs and Main Quest reports", () => {
  const runtime = createRuntime(new MemoryStorage());
  const today = runtime.DateUtils.getLocalDateKey();
  const yesterday = runtime.DateUtils.getLocalDateKey(runtime.DateUtils.addDaysLocal(today, -1));
  const twoDaysAgo = runtime.DateUtils.getLocalDateKey(runtime.DateUtils.addDaysLocal(today, -2));
  runtime.GameState.set(state => {
    if (!state.dailyLog) state.dailyLog = {};
    state.dailyLog[today] = {
      xp: 100,
      questsCompleted: 1,
      attributeXp: { intelligence: 100 },
      growthEvents: [{ type: "level", value: 2 }]
    };
    state.dailyLog[yesterday] = {
      xp: 200,
      questsCompleted: 2,
      attributeXp: { strength: 200 },
      growthEvents: [{ type: "skill", value: "A" }, { type: "title", value: "B" }]
    };
    state.planning.dayReports[yesterday] = { mainQuest: { title: "Ship it", completed: true } };
    state.planning.dayReports[twoDaysAgo] = { mainQuest: { title: "Prepare it", completed: false } };
  });

  const recap = runtime.WeeklyRecap.build(runtime.GameState.get(), runtime.DateUtils.parseLocalDateKey(today));
  assert.equal(recap.activeDays, 2);
  assert.equal(recap.questsCompleted, 3);
  assert.equal(recap.xpEarned, 300);
  assert.equal(recap.mainQuestsSecured, 1);
  assert.equal(recap.mainQuestsMissed, 1);
  assert.equal(recap.growthEvents, 3);
  assert.equal(recap.strongestAttribute.id, "strength");
  assert.equal(recap.strongestAttribute.xp, 200);
  assert.match(recap.narrative, /1 of 2 recorded Main Quests were secured/);
});

test("journey timeline stays empty until meaningful progress exists", () => {
  const runtime = createRuntime(new MemoryStorage());
  assert.deepEqual([...runtime.JourneyTimeline.build(runtime.GameState.get())], []);
});

test("journey timeline unlocks after the first completed quest", () => {
  const runtime = createRuntime(new MemoryStorage());
  const locked = runtime.ProgressiveUnlocks.getStatus(runtime.GameState.get(), "journey_timeline");

  assert.equal(locked.unlocked, false);
  assert.equal(locked.current, 0);
  assert.equal(locked.required, 1);
  assert.equal(locked.remaining, 1);
  assert.equal(locked.progress, 0);

  runtime.GameState.set(state => {
    state.quests.totalCompletedEver = 1;
  });

  const unlocked = runtime.ProgressiveUnlocks.getStatus(runtime.GameState.get(), "journey_timeline");
  assert.equal(unlocked.unlocked, true);
  assert.equal(unlocked.current, 1);
  assert.equal(unlocked.remaining, 0);
  assert.equal(unlocked.progress, 1);
});

test("unknown progressive unlock ids fail safely", () => {
  const runtime = createRuntime(new MemoryStorage());
  assert.equal(runtime.ProgressiveUnlocks.getStatus(runtime.GameState.get(), "unknown"), null);
});

test("journey timeline merges reports and growth events in reverse date order", () => {
  const runtime = createRuntime(new MemoryStorage());
  const today = runtime.DateUtils.getLocalDateKey();
  const yesterday = runtime.DateUtils.getLocalDateKey(runtime.DateUtils.addDaysLocal(today, -1));
  runtime.GameState.set(state => {
    if (!state.dailyLog) state.dailyLog = {};
    state.dailyLog[today] = {
      xp: 150,
      questsCompleted: 2,
      growthEvents: [{ type: "level", value: 3 }, { type: "unknown", value: "ignored" }]
    };
    state.dailyLog[yesterday] = { xp: 80, questsCompleted: 1, growthEvents: [] };
    state.planning.dayReports[yesterday] = {
      mainQuest: { title: "Finish the key chapter", completed: true }
    };
  });

  const entries = runtime.JourneyTimeline.build(runtime.GameState.get(), 14);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].dateKey, today);
  assert.equal(entries[0].title, "Level reached");
  assert.equal(entries[0].growthEvents.length, 1);
  assert.equal(entries[1].dateKey, yesterday);
  assert.equal(entries[1].title, "Finish the key chapter");
  assert.equal(entries[1].tone, "secured");
  assert.equal(entries[1].mainQuest.completed, true);
});

test("journey timeline includes report-only missed Main Quests and respects its limit", () => {
  const runtime = createRuntime(new MemoryStorage());
  const today = runtime.DateUtils.getLocalDateKey();
  runtime.GameState.set(state => {
    for (let offset = 0; offset < 3; offset++) {
      const dateKey = runtime.DateUtils.getLocalDateKey(runtime.DateUtils.addDaysLocal(today, -offset));
      state.planning.dayReports[dateKey] = {
        mainQuest: { title: "Priority " + offset, completed: offset !== 1 }
      };
    }
  });

  const entries = runtime.JourneyTimeline.build(runtime.GameState.get(), 2);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].title, "Priority 0");
  assert.equal(entries[1].title, "Priority 1");
  assert.equal(entries[1].tone, "missed");
  assert.equal(entries[1].xp, 0);
});

test("journey timeline includes proof-only dates", () => {
  const runtime = createRuntime(new MemoryStorage());
  const today = runtime.DateUtils.getLocalDateKey();
  runtime.GameState.set(state => {
    const quest = runtime.Quests.addQuest(state, {
      title: "Submit the portfolio",
      attribute: "charisma",
      difficulty: "normal",
      xp: 100
    });
    quest.done = true;
    quest.dateAssigned = today;
    runtime.Proof.setQuestProof(state, quest.id, "Portfolio link sent to the reviewer.");
  });

  const entries = runtime.JourneyTimeline.build(runtime.GameState.get());
  assert.equal(entries.length, 1);
  assert.equal(entries[0].dateKey, today);
  assert.equal(entries[0].title, "Submit the portfolio");
  assert.equal(entries[0].tone, "proof");
  assert.equal(entries[0].proofs.length, 1);
  assert.equal(entries[0].proofs[0].note, "Portfolio link sent to the reviewer.");
});

test("journey timeline merges proof with existing daily progress", () => {
  const runtime = createRuntime(new MemoryStorage());
  const today = runtime.DateUtils.getLocalDateKey();
  runtime.GameState.set(state => {
    if (!state.dailyLog) state.dailyLog = {};
    state.dailyLog[today] = { xp: 200, questsCompleted: 1, growthEvents: [] };
    state.planning.dayReports[today] = {
      mainQuest: { title: "Finish the key project", completed: true }
    };
    const quest = runtime.Quests.addQuest(state, {
      title: "Finish the key project",
      attribute: "willpower",
      difficulty: "hard",
      xp: 200
    });
    quest.done = true;
    quest.dateAssigned = today;
    runtime.Proof.setQuestProof(state, quest.id, "Final build deployed.");
  });

  const entry = runtime.JourneyTimeline.build(runtime.GameState.get())[0];
  assert.equal(entry.title, "Finish the key project");
  assert.equal(entry.tone, "secured");
  assert.equal(entry.xp, 200);
  assert.equal(entry.proofs.length, 1);
});

test("proof records can only be attached to completed quests", () => {
  const runtime = createRuntime(new MemoryStorage());
  let quest;
  runtime.GameState.set(state => {
    quest = runtime.Quests.addQuest(state, {
      title: "Finish the report",
      attribute: "intelligence",
      difficulty: "easy",
      xp: 50
    });
  });

  let outcome;
  runtime.GameState.set(state => {
    outcome = runtime.Proof.setQuestProof(state, quest.id, "Report submitted.");
  });

  assert.equal(outcome.saved, false);
  assert.equal(outcome.reason, "quest-incomplete");
  assert.equal(runtime.Proof.getQuestProof(runtime.GameState.get().quests.active[0]), null);
});

test("proof records persist, update and remove without changing progression", () => {
  const runtime = createRuntime(new MemoryStorage());
  let questId;
  runtime.GameState.set(state => {
    const quest = runtime.Quests.addQuest(state, {
      title: "Complete the workout",
      attribute: "strength",
      difficulty: "normal",
      xp: 100
    });
    quest.done = true;
    questId = quest.id;
  });
  const before = runtime.GameState.get();
  const progressionBefore = {
    xp: before.xp,
    lifetimeXp: before.lifetimeXp,
    completedToday: before.quests.completedToday,
    totalCompletedEver: before.quests.totalCompletedEver
  };

  runtime.GameState.set(state => {
    runtime.Proof.setQuestProof(state, questId, "  Session logged in training journal.  ");
  });
  let proof = runtime.Proof.getQuestProof(runtime.GameState.get().quests.active[0]);
  let archive = runtime.Proof.getArchive(runtime.GameState.get());
  assert.equal(proof.note, "Session logged in training journal.");
  assert.equal(archive.length, 1);
  assert.equal(archive[0].questTitle, "Complete the workout");
  assert.equal(archive[0].note, proof.note);
  const createdAt = proof.createdAt;

  runtime.GameState.set(state => {
    runtime.Proof.setQuestProof(state, questId, "Updated completion record.");
  });
  proof = runtime.Proof.getQuestProof(runtime.GameState.get().quests.active[0]);
  archive = runtime.Proof.getArchive(runtime.GameState.get());
  assert.equal(proof.note, "Updated completion record.");
  assert.equal(proof.createdAt, createdAt);
  assert.equal(archive.length, 1);
  assert.equal(archive[0].note, "Updated completion record.");

  const afterUpdate = runtime.GameState.get();
  assert.deepEqual({
    xp: afterUpdate.xp,
    lifetimeXp: afterUpdate.lifetimeXp,
    completedToday: afterUpdate.quests.completedToday,
    totalCompletedEver: afterUpdate.quests.totalCompletedEver
  }, progressionBefore);

  runtime.GameState.set(state => {
    runtime.Proof.removeQuestProof(state, questId);
  });
  assert.equal(runtime.Proof.getQuestProof(runtime.GameState.get().quests.active[0]), null);
  assert.deepEqual([...runtime.Proof.getArchive(runtime.GameState.get())], []);
});

test("proof archive survives the daily quest reset and a new runtime", () => {
  const storage = new MemoryStorage();
  const runtime = createRuntime(storage);
  const today = runtime.DateUtils.getLocalDateKey();
  const yesterday = runtime.DateUtils.getLocalDateKey(runtime.DateUtils.addDaysLocal(today, -1));
  let questId;

  runtime.GameState.set(state => {
    state.quests.lastResetDate = yesterday;
    const quest = runtime.Quests.addQuest(state, {
      title: "Ship the delayed project",
      attribute: "willpower",
      difficulty: "hard",
      xp: 200
    });
    quest.dateAssigned = yesterday;
    quest.done = true;
    questId = quest.id;
    runtime.Proof.setQuestProof(state, quest.id, "Final build delivered.");
  });

  runtime.GameState.set(state => {
    runtime.Quests.ensureDailyReset(state);
  });

  const reloaded = createRuntime(storage);
  const state = reloaded.GameState.get();
  const archive = reloaded.Proof.getArchive(state);
  assert.equal(state.quests.active.some(quest => quest.id === questId), false);
  assert.equal(archive.length, 1);
  assert.equal(archive[0].questId, questId);
  assert.equal(archive[0].dateKey, yesterday);
  assert.equal(archive[0].note, "Final build delivered.");

  let removal;
  reloaded.GameState.set(current => {
    removal = reloaded.Proof.removeQuestProof(current, questId);
  });
  assert.equal(removal.removed, true);
  assert.deepEqual([...reloaded.Proof.getArchive(reloaded.GameState.get())], []);
});
