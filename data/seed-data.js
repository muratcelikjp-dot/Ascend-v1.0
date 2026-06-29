// data/seed-data.js
// Pure content. No logic here — only definitions that the engine modules read.
// Adding a new boss/achievement/skill/quest-template should only ever require
// editing this file.

const SEED_DATA = {

  // Default state for a brand new player with no save file yet.
  defaultState: {
    version: 1,
    level: 1,
    xp: 0,
    lifetimeXp: 0,
    streak: 0,
    lastActiveDate: null,

    attributes: {
      intelligence: { xp: 0, lifetimeXp: 0, level: 1 },
      strength:     { xp: 0, lifetimeXp: 0, level: 1 },
      charisma:     { xp: 0, lifetimeXp: 0, level: 1 },
      discipline:   { xp: 0, lifetimeXp: 0, level: 1 },
      creativity:   { xp: 0, lifetimeXp: 0, level: 1 },
      willpower:    { xp: 0, lifetimeXp: 0, level: 1 }
    },

    // Tracks whether today's "shield break" opening ritual has already
    // been completed, so reloading the page mid-session doesn't force the
    // player through it again. Resets naturally via Quests.ensureDailyReset
    // comparing this date against today.
    shieldRitual: {
      lastCompletedDate: null,
      maxHp: 100,
      currentHp: 100
    },

    quests: {
      active: [],
      completedToday: 0,
      totalCompletedEver: 0,
      lastResetDate: null
    },

    skills: {
      unlocked: []
    },

    achievements: {
      unlocked: [],
      progress: {},
      _hadPenaltyEver: false
    },

    bosses: {
      currentBossId: "procrastination",
      currentHp: null,   // null = not yet initialized, engine fills in from boss roster on first load
      defeated: [],
      titlesEarned: [],
      damageHistory: {}  // { "2026-06-23": 145 } total boss damage dealt per day
    },

    rewards: {
      custom: [
        { id: "r_watch_anime", name: "Watch anime episode", cost: 250, category: "entertainment", requiredLevel: 1, isPremium: false, createdAt: null },
        { id: "r_play_games",  name: "Play games for 1 hour", cost: 500, category: "entertainment", requiredLevel: 1, isPremium: false, createdAt: null },
        { id: "r_eat_burger",  name: "Eat a burger", cost: 1200, category: "food", requiredLevel: 1, isPremium: false, createdAt: null },
        { id: "r_new_game",    name: "Buy that game you've been eyeing", cost: 4000, category: "shopping", requiredLevel: 5, isPremium: true, createdAt: null },
        { id: "r_day_off",     name: "Guilt-free full day off", cost: 6000, category: "rest", requiredLevel: 8, isPremium: true, createdAt: null }
      ],
      purchased: []
    },

    // Category metadata lives here, separate from individual rewards, so
    // adding a new category is a one-line data change, same philosophy as
    // the boss/achievement rosters.
    rewardCategories: [
      { id: "entertainment", label: "Entertainment", icon: "ti-device-tv" },
      { id: "food",          label: "Food",          icon: "ti-burger" },
      { id: "shopping",      label: "Shopping",       icon: "ti-shopping-cart" },
      { id: "rest",          label: "Rest",           icon: "ti-bed" },
      { id: "social",        label: "Social",         icon: "ti-users" },
      { id: "other",         label: "Other",          icon: "ti-dots" }
    ],

    // Used by the daily planning ritual (Willpower goals + fixed activities)
    planning: {
      tomorrowGoals: [],       // self-set Willpower goals for the next day: {text, xp, priority, scheduledTime}
      tomorrowFixed: [],       // fixed activity plans for the next day: {templateId, priority, scheduledTime}
      tomorrowTargetXp: null,  // optional self-set XP goal for tomorrow
      tomorrowTargetAttribute: null, // optional self-set "focus attribute" for tomorrow
      _activeTargetXp: null,   // internal: promoted from tomorrowTargetXp once that day begins
      _activeTargetAttribute: null, // internal: promoted from tomorrowTargetAttribute once that day begins
      missedDayLog: {},       // { "2026-06-20": true/false } completion record per date
      dayReports: {}          // { "2026-06-20": { targetXp, actualXp, targetAttribute, actualAttributeXp, questsPlanned, questsCompleted } }
    }
  },

  // Quest templates the user can quickly add from, organized by attribute.
  // These are starting suggestions, not a locked list — the user can still
  // free-type custom quests in the UI.
  questTemplates: [
    { id: "tmpl_coding",       title: "Complete a coding assignment", attribute: "intelligence", difficulty: "normal", xp: 100 },
    { id: "tmpl_reading",      title: "Read 15 pages of a book",        attribute: "intelligence", difficulty: "easy",   xp: 50  },
    { id: "tmpl_run",          title: "Go for a 30-minute run",          attribute: "strength",     difficulty: "easy",   xp: 50  },
    { id: "tmpl_gym",          title: "Full gym workout",                 attribute: "strength",     difficulty: "hard",   xp: 200 },
    { id: "tmpl_social",       title: "Have a real conversation with someone new", attribute: "charisma", difficulty: "normal", xp: 100 },
    { id: "tmpl_meditate",     title: "10 minutes of meditation",         attribute: "discipline",   difficulty: "easy",   xp: 50  },
    { id: "tmpl_plan",         title: "Plan tomorrow before bed",          attribute: "discipline",   difficulty: "easy",   xp: 50  },
    { id: "tmpl_project",      title: "Build/ship a small project feature", attribute: "creativity", difficulty: "hard",   xp: 200 },
    { id: "tmpl_resist",       title: "Resist a known bad habit today",    attribute: "willpower",    difficulty: "normal", xp: 100 }
  ],

  // Attribute leveling thresholds reused by leveling.js (kept here so content
  // tuning doesn't require touching engine code).
  attributeLevelExamples: {
    1: 0,
    2: 100,
    3: 250,
    4: 500,
    5: 1000
  },

  // Skill tree definitions per attribute. `requiredLevel` is the attribute
  // level needed to auto-unlock — no perk-point spending in this version,
  // per the "skills unlock automatically based on attribute levels" requirement.
  // Each skill now carries:
  //   icon          - distinct Tabler icon per skill (previously all skills
  //                   shared one generic icon, which is part of why the
  //                   skill screen didn't feel like a real tree)
  //   tier          - 1/2/3, purely for display grouping/connecting lines
  //   passiveBonus  - { attribute, multiplier } - a real, automatic,
  //                   always-on numeric effect once unlocked. This is a
  //                   deliberate reconciliation: skills still auto-unlock
  //                   purely by attribute level (no perk-point spending,
  //                   per the earlier "no perk points system" rule) but
  //                   now actually DO something mechanically once
  //                   unlocked, rather than being purely narrative text.
  skillTree: {
    intelligence: [
      { id: "intel_active_reader", name: "Active Reader", icon: "ti-eye", tier: 1, requiredLevel: 2, description: "You question what you read instead of passively consuming it.", passiveBonus: { attribute: "intelligence", multiplier: 0.05 } },
      { id: "intel_deep_focus",    name: "Deep Focus",     icon: "ti-brain", tier: 2, requiredLevel: 4, description: "You can sustain attention on hard problems far longer than before.", passiveBonus: { attribute: "intelligence", multiplier: 0.08 } },
      { id: "intel_fast_learner",  name: "Fast Learner",   icon: "ti-bolt", tier: 3, requiredLevel: 6, description: "New concepts click faster because you've built real study habits.", passiveBonus: { attribute: "intelligence", multiplier: 0.12 } }
    ],
    strength: [
      { id: "str_daily_energy",   name: "Daily Energy",    icon: "ti-battery-charging", tier: 1, requiredLevel: 2, description: "Consistent training gives you steady energy through the day.", passiveBonus: { attribute: "strength", multiplier: 0.05 } },
      { id: "str_iron_will",      name: "Iron Will",       icon: "ti-shield", tier: 2, requiredLevel: 4, description: "You don't skip workouts just because you don't feel like it.", passiveBonus: { attribute: "strength", multiplier: 0.08 } },
      { id: "str_athlete_identity", name: "Athlete Identity", icon: "ti-trophy", tier: 3, requiredLevel: 6, description: "Training is now part of who you are, not a chore.", passiveBonus: { attribute: "strength", multiplier: 0.12 } }
    ],
    charisma: [
      { id: "cha_comfortable_presence", name: "Comfortable Presence", icon: "ti-user-check", tier: 1, requiredLevel: 2, description: "Small talk and new social settings no longer feel draining.", passiveBonus: { attribute: "charisma", multiplier: 0.05 } },
      { id: "cha_real_listener",  name: "Real Listener",   icon: "ti-ear", tier: 2, requiredLevel: 4, description: "People feel heard around you because you actually listen.", passiveBonus: { attribute: "charisma", multiplier: 0.08 } },
      { id: "cha_natural_authority", name: "Natural Authority", icon: "ti-crown", tier: 3, requiredLevel: 6, description: "People turn to you in uncertain moments.", passiveBonus: { attribute: "charisma", multiplier: 0.12 } }
    ],
    discipline: [
      { id: "disc_no_zero_days",  name: "No Zero Days",    icon: "ti-calendar-check", tier: 1, requiredLevel: 2, description: "You do at least something toward your goals every day.", passiveBonus: { attribute: "discipline", multiplier: 0.05 } },
      { id: "disc_iron_discipline", name: "Iron Discipline", icon: "ti-lock", tier: 2, requiredLevel: 4, description: "Your routines hold even when motivation is low.", passiveBonus: { attribute: "discipline", multiplier: 0.08 } },
      { id: "disc_long_game",     name: "Long Game Player", icon: "ti-hourglass", tier: 3, requiredLevel: 6, description: "You optimize for who you'll be in a year, not instant comfort.", passiveBonus: { attribute: "discipline", multiplier: 0.12 } }
    ],
    creativity: [
      { id: "cre_maker_mindset",  name: "Maker Mindset",   icon: "ti-tool", tier: 1, requiredLevel: 2, description: "You default to building solutions instead of waiting for one.", passiveBonus: { attribute: "creativity", multiplier: 0.05 } },
      { id: "cre_ship_it",        name: "Ship It",         icon: "ti-rocket", tier: 2, requiredLevel: 4, description: "You release work before it's perfect and iterate from there.", passiveBonus: { attribute: "creativity", multiplier: 0.08 } },
      { id: "cre_signature_style", name: "Signature Style", icon: "ti-feather", tier: 3, requiredLevel: 6, description: "Your work has a recognizable voice that's distinctly yours.", passiveBonus: { attribute: "creativity", multiplier: 0.12 } }
    ],
    willpower: [
      { id: "wil_do_it_anyway",   name: "Do It Anyway",    icon: "ti-sword", tier: 1, requiredLevel: 2, description: "You act before you feel ready instead of waiting for motivation.", passiveBonus: { attribute: "willpower", multiplier: 0.05 } },
      { id: "wil_comfort_breaker", name: "Comfort Breaker", icon: "ti-flame", tier: 2, requiredLevel: 4, description: "You deliberately seek out discomfort because you know it builds you.", passiveBonus: { attribute: "willpower", multiplier: 0.08 } },
      { id: "wil_unbreakable",    name: "Unbreakable",     icon: "ti-infinity", tier: 3, requiredLevel: 6, description: "Setbacks don't shake you — you know you can rebuild.", passiveBonus: { attribute: "willpower", multiplier: 0.12 } }
    ]
  },

  // Achievement roster. `check` describes the condition in plain data form;
  // achievements.js interprets these types generically so new ones can be
  // added here without writing new unlock-checking code for most cases.
  // Each achievement now carries:
  //   category  - quest / xp / boss / streak / attribute / reward / secret
  //   icon      - distinct Tabler icon per achievement
  //   secret    - if true, name/description are hidden until unlocked
  //               (the UI shows "???" instead) — these are meant to be
  //               discovered, not grinded toward on purpose.
  achievements: [
    // --- Quest achievements ---
    { id: "first_blood",   name: "First Blood",   description: "Complete your first quest.", category: "quest", icon: "ti-sword", type: "counter", stat: "quests.totalCompletedEver", threshold: 1 },
    { id: "machine",       name: "Machine",        description: "Complete 100 quests.",        category: "quest", icon: "ti-robot", type: "counter", stat: "quests.totalCompletedEver", threshold: 100 },
    { id: "quest_500",     name: "Relentless",     description: "Complete 500 quests.",        category: "quest", icon: "ti-infinity", type: "counter", stat: "quests.totalCompletedEver", threshold: 500 },

    // --- XP achievements ---
    { id: "xp_1000",       name: "Rising",         description: "Earn 1,000 lifetime XP.",     category: "xp", icon: "ti-bolt", type: "counter", stat: "lifetimeXp", threshold: 1000 },
    { id: "xp_10000",      name: "Veteran",        description: "Earn 10,000 lifetime XP.",    category: "xp", icon: "ti-bolt-filled", type: "counter", stat: "lifetimeXp", threshold: 10000 },

    // --- Streak achievements ---
    { id: "iron_will_streak", name: "Iron Will",   description: "Maintain a 7-day streak.",    category: "streak", icon: "ti-flame", type: "counter", stat: "streak", threshold: 7 },
    { id: "streak_30",     name: "Unstoppable",    description: "Maintain a 30-day streak.",   category: "streak", icon: "ti-flame-filled", type: "counter", stat: "streak", threshold: 30 },

    // --- Attribute achievements ---
    { id: "scholar",       name: "Scholar",        description: "Earn 1,000 Intelligence XP (lifetime).", category: "attribute", icon: "ti-book", type: "counter", stat: "attributes.intelligence.lifetimeXp", threshold: 1000 },
    { id: "iron_body",     name: "Iron Body",      description: "Earn 1,000 Strength XP (lifetime).",     category: "attribute", icon: "ti-run", type: "counter", stat: "attributes.strength.lifetimeXp", threshold: 1000 },
    { id: "social_butterfly", name: "Social Butterfly", description: "Earn 1,000 Charisma XP (lifetime).", category: "attribute", icon: "ti-messages", type: "counter", stat: "attributes.charisma.lifetimeXp", threshold: 1000 },

    // --- Boss achievements ---
    { id: "first_kill",    name: "First Kill",     description: "Defeat your first boss.",     category: "boss", icon: "ti-skull", type: "counter", stat: "bosses.defeated.length", threshold: 1 },
    { id: "boss_slayer",   name: "Boss Slayer",    description: "Defeat 3 bosses.",            category: "boss", icon: "ti-crown", type: "counter", stat: "bosses.defeated.length", threshold: 3 },

    // --- Reward achievements ---
    { id: "first_purchase", name: "Treat Yourself", description: "Make your first reward purchase.", category: "reward", icon: "ti-gift", type: "counter", stat: "rewards.purchased.length", threshold: 1 },
    { id: "big_spender",   name: "Big Spender",    description: "Spend 5,000 lifetime XP on rewards.", category: "reward", icon: "ti-credit-card", type: "counter", stat: "rewards.totalXpSpent", threshold: 5000 },

    // --- Secret achievements (hidden until unlocked) ---
    { id: "secret_night_owl", name: "Night Owl", description: "Break the daily seal after midnight.", category: "secret", icon: "ti-moon", secret: true, type: "event" },
    { id: "secret_comeback", name: "The Comeback", description: "Rebuild a streak to 7 days after a penalty reset it to 0.", category: "secret", icon: "ti-rotate", secret: true, type: "event" }
  ],

  // Boss roster — data-driven as requested. `damageMap` keys are quest title
  // substrings (case-insensitive) or attribute names; engine checks both.
  // `nextBossId: null` means this is currently the last boss in the roster.
  bosses: {
    procrastination: {
      id: "procrastination",
      name: "Procrastination",
      icon: "ti-clock-pause",
      lore: "It doesn't attack you directly. It just whispers 'later' until your day is gone and nothing got done. It has been winning by default for as long as you've let it.",
      ability: "Drains your Willpower the moment you sit down to start something hard, replacing urgency with comfort.",
      description: "The voice that always says 'later.'",
      maxHp: 1000,
      damageRules: [
        { matchType: "attribute", match: "willpower", damagePerXp: 1 },
        { matchType: "attribute", match: "discipline", damagePerXp: 0.5 },
        { matchType: "titleContains", match: "study", damage: 50 }
      ],
      rewards: { xp: 500, title: "Procrastination Slayer" },
      nextBossId: "social_anxiety"
    },
    social_anxiety: {
      id: "social_anxiety",
      name: "Social Anxiety",
      icon: "ti-mask-off",
      lore: "It convinces you the room is watching, judging, waiting for you to slip. The truth is most people are too busy worrying about themselves to notice you at all — but this boss needs you to believe otherwise.",
      ability: "Makes silence feel safer than speaking, even when speaking is exactly what would move your life forward.",
      description: "The fear that keeps you quiet when you shouldn't be.",
      maxHp: 1200,
      damageRules: [
        { matchType: "attribute", match: "charisma", damagePerXp: 1 },
        { matchType: "titleContains", match: "stranger", damage: 100 },
        { matchType: "titleContains", match: "conversation", damage: 75 }
      ],
      rewards: { xp: 600, title: "Voice Reclaimed" },
      nextBossId: "phone_addiction"
    },
    phone_addiction: {
      id: "phone_addiction",
      name: "Phone Addiction",
      icon: "ti-device-mobile-off",
      lore: "It doesn't need to be loud. A single buzz is enough to pull your attention away from anything — your studying, your training, your sleep, your actual life. It feeds on the half-second of boredom right before something good was about to happen.",
      ability: "Hijacks idle moments before your willpower has a chance to redirect them toward something real.",
      description: "The reflex to reach for distraction instead of doing the work.",
      maxHp: 1400,
      damageRules: [
        { matchType: "attribute", match: "willpower", damagePerXp: 0.75 },
        { matchType: "titleContains", match: "phone", damage: 100 },
        { matchType: "titleContains", match: "focus", damage: 75 }
      ],
      rewards: { xp: 700, title: "Present Mind" },
      nextBossId: null
    }
  }

};

// Expose for non-module script usage across plain <script> tags.
if (typeof window !== "undefined") window.SEED_DATA = SEED_DATA;
