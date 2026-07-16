// data/seed-data.js
// Pure content. No logic here — only definitions that the engine modules read.
// Adding a new boss/achievement/skill/quest-template should only ever require
// editing this file.

const SEED_DATA = {

  // Prestige configuration. Reaching levelThreshold unlocks the option to
  // prestige: level and current xp reset to 1/0, but the player
  // permanently keeps every skill, achievement, title, and boss defeat
  // already earned, PLUS gains a permanent XP multiplier bonus that stacks
  // across multiple prestiges. This is the "why keep playing after
  // reaching the level cap" answer — there's always a next prestige to
  // chase, and each one makes future leveling faster.
  prestigeConfig: {
    levelThreshold: 30,
    xpBonusPerPrestige: 0.15 // +15% XP per prestige, stacking additively
  },

  // Rank system: the player's displayed "class" scales with level
  // indefinitely (not capped at 5 tiers like the old hardcoded array each
  // page used to duplicate). Beyond the last named tier, ranks continue
  // generating procedurally (see Ranks.getRank in ranks.js) so there's
  // always a next rank to reach, however high level goes.
  ranks: [
    { minLevel: 1,  name: "Coder Apprentice" },
    { minLevel: 5,  name: "Coder Journeyman" },
    { minLevel: 10, name: "Coder Knight" },
    { minLevel: 15, name: "Coder Champion" },
    { minLevel: 20, name: "Coder Legend" },
    { minLevel: 25, name: "Coder Mythic" },
    { minLevel: 30, name: "Coder Ascendant" }
  ],

  // Milestone titles — distinct from boss-defeat titles (which already
  // exist in state.bosses.titlesEarned). These are earned by crossing
  // thresholds in level, achievement count, or boss-defeat count, giving
  // the player recognition beyond just "you did the thing," reinforcing
  // identity growth over time.
  milestoneTitles: [
    { id: "title_level_10",  name: "The Persistent",   condition: { type: "level", threshold: 10 } },
    { id: "title_level_20",  name: "The Unrelenting",  condition: { type: "level", threshold: 20 } },
    { id: "title_ach_5",     name: "Collector",         condition: { type: "achievementCount", threshold: 5 } },
    { id: "title_ach_10",    name: "The Decorated",     condition: { type: "achievementCount", threshold: 10 } },
    { id: "title_boss_all",  name: "Threat Hunter",     condition: { type: "bossCount", threshold: 3 } }
  ],

  // NOTE: endgame bosses (self_doubt, the_plateau) are NOT a separate
  // gated system — they're simply the later entries in the single linear
  // `bosses` chain below, encountered through normal nextBossId
  // progression once phone_addiction is defeated. This is a deliberate
  // simplification: the boss engine (bosses.js) has no concept of a
  // second, prestige-gated unlock track, and building one would add a
  // meaningful amount of new plumbing for a benefit (a hard "no farming
  // early bosses forever" gate) the linear chain already delivers well
  // enough on its own.

  // Default state for a brand new player with no save file yet.
  defaultState: {
    version: 12,
    level: 1,
    xp: 0,
    lifetimeXp: 0,
    streak: 0,
    lastActiveDate: null,

    goals: {
      selected: [],
      details: {},
      onboardingComplete: false,
      suggestionsAccepted: false,
      lastSuggestionDate: null
    },

    dailyState: {
      checkIns: {}
    },

    activeEffects: {
      active: []
    },

    proofs: {
      records: []
    },

    attributes: {
      intelligence: { xp: 0, lifetimeXp: 0, level: 1 },
      strength:     { xp: 0, lifetimeXp: 0, level: 1 },
      charisma:     { xp: 0, lifetimeXp: 0, level: 1 },
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
      unlocked: [],
      legacyUnlocked: []
    },

    achievements: {
      unlocked: [],
      progress: {},
      _hadPenaltyEver: false
    },

    milestoneTitlesEarned: [],

    prestige: {
      count: 0,           // how many times the player has prestiged
      permanentXpBonus: 0 // cumulative XP multiplier from all past prestiges (e.g. 0.15 = +15%)
    },

    bosses: {
      currentBossId: "procrastination",
      currentHp: null,   // null = not yet initialized, engine fills in from boss roster on first load
      dominance: null,   // 0-100 pressure meter; initialized from the active boss definition
      lastDominanceUpdatedAt: null,
      defeated: [],
      titlesEarned: [],
      damageHistory: {}, // { "2026-06-23": 145 } total boss damage dealt per day
      contracts: {},     // legacy Boss Contracts, preserved for save compatibility
      activeMission: null,
      missionHistory: [],
      weakPointStates: {},
      pendingFailureReasonMissionId: null,
      encounterStatus: "active",
      encounterAttempt: 1,
      encounterStartedAt: null,
      encounterDefeatedAt: null,
      retreatedAt: null,
      rematchAvailableDate: null,
      encounterLosses: [],
      pendingDefeatNoticeId: null,
      legacyContractsMigrated: true
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

    // Used by the daily planning ritual (one Main Quest, Side Quests, and routines)
    planning: {
      tomorrowGoals: [],       // custom next-day quests: {text, attribute, difficulty, xp, priority, scheduledTime}
      tomorrowFixed: [],       // fixed activity plans for the next day: {templateId, priority, scheduledTime}
      tomorrowTargetXp: null,  // optional self-set XP goal for tomorrow
      tomorrowTargetAttribute: null, // optional self-set "focus attribute" for tomorrow
      _activeTargetXp: null,   // internal: promoted from tomorrowTargetXp once that day begins
      _activeTargetAttribute: null, // internal: promoted from tomorrowTargetAttribute once that day begins
      missedDayLog: {},       // { "2026-06-20": true/false } completion record per date
      dayReports: {}          // { "2026-06-20": { targetXp, actualXp, targetAttribute, actualAttributeXp, questsPlanned, questsCompleted } }
    }
  },

  // Category metadata for the rewards shop, separate from individual
  // rewards, so adding a new category is a one-line data change, same
  // philosophy as the boss/achievement rosters. Lives at the top level
  // (content/config), NOT inside defaultState (per-player state) — reward
  // category definitions apply to every player identically.
  rewardCategories: [
    { id: "entertainment", label: "Entertainment", icon: "ti-device-tv" },
    { id: "food",          label: "Food",          icon: "ti-burger" },
    { id: "shopping",      label: "Shopping",       icon: "ti-shopping-cart" },
    { id: "rest",          label: "Rest",           icon: "ti-bed" },
    { id: "social",        label: "Social",         icon: "ti-users" },
    { id: "other",         label: "Other",          icon: "ti-dots" }
  ],

  goalCategories: [
    { id: "fitness", label: "Forge Your Body", description: "Strength, fitness, and recovery", icon: "ti-barbell", attributes: ["strength", "willpower"] },
    { id: "education", label: "Master New Knowledge", description: "Study, reading, and practical skills", icon: "ti-book-2", attributes: ["intelligence", "willpower"] },
    { id: "career", label: "Advance Your Career", description: "Work, portfolio, and income", icon: "ti-briefcase", attributes: ["intelligence", "charisma"] },
    { id: "social", label: "Expand Your Circle", description: "New connections and social confidence", icon: "ti-users", attributes: ["charisma"] },
    { id: "discipline", label: "Build Discipline", description: "Focus, order, and better habits", icon: "ti-shield-check", attributes: ["willpower"] },
    { id: "personal-project", label: "Complete Your Project", description: "Finish what you started", icon: "ti-bulb", attributes: ["intelligence", "willpower"] }
  ],

  // Quest templates the user can quickly add from, organized by attribute.
  // These are starting suggestions, not a locked list — the user can still
  // free-type custom quests in the UI.
  questTemplates: [
    { id: "tmpl_coding",       title: "Complete a coding assignment", attribute: "intelligence", goalTags: ["education", "career"], difficulty: "normal", xp: 100 },
    { id: "tmpl_reading",      title: "Read 15 pages of a book",        attribute: "intelligence", goalTags: ["education"], difficulty: "easy",   xp: 50  },
    { id: "tmpl_run",          title: "Go for a 30-minute run",          attribute: "strength",     goalTags: ["fitness"], difficulty: "easy",   xp: 50  },
    { id: "tmpl_gym",          title: "Full gym workout",                 attribute: "strength",     goalTags: ["fitness"], difficulty: "hard",   xp: 200 },
    { id: "tmpl_social",       title: "Have a real conversation with someone new", attribute: "charisma", goalTags: ["social"], difficulty: "normal", xp: 100 },
    { id: "tmpl_meditate",     title: "10 minutes of meditation",         attribute: "willpower",    tags: ["discipline"], goalTags: ["discipline"], difficulty: "easy", xp: 50  },
    { id: "tmpl_plan",         title: "Plan tomorrow before bed",          attribute: "willpower",    tags: ["discipline"], goalTags: ["discipline", "career", "personal-project"], difficulty: "easy", xp: 50  },
    { id: "tmpl_project",      title: "Build/ship a small project feature", attribute: "intelligence", tags: ["creativity"], goalTags: ["career", "personal-project"], difficulty: "hard", xp: 200 },
    { id: "tmpl_resist",       title: "Resist a known bad habit today",    attribute: "willpower",    goalTags: ["discipline"], difficulty: "normal", xp: 100 }
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
      { id: "intel_fast_learner",  name: "Fast Learner",   icon: "ti-bolt", tier: 3, requiredLevel: 6, description: "New concepts click faster because you've built real study habits.", passiveBonus: { attribute: "intelligence", multiplier: 0.12 } },
      { id: "intel_master", name: "Polymath", icon: "ti-atom", tier: 4, requiredLevel: 10, description: "You move fluently between fields, connecting ideas nobody else thinks to connect. This is what mastery of learning itself looks like.", passiveBonus: { attribute: "intelligence", multiplier: 0.2 } }
    ],
    strength: [
      { id: "str_daily_energy",   name: "Daily Energy",    icon: "ti-battery-charging", tier: 1, requiredLevel: 2, description: "Consistent training gives you steady energy through the day.", passiveBonus: { attribute: "strength", multiplier: 0.05 } },
      { id: "str_iron_will",      name: "Iron Will",       icon: "ti-shield", tier: 2, requiredLevel: 4, description: "You don't skip workouts just because you don't feel like it.", passiveBonus: { attribute: "strength", multiplier: 0.08 } },
      { id: "str_athlete_identity", name: "Athlete Identity", icon: "ti-trophy", tier: 3, requiredLevel: 6, description: "Training is now part of who you are, not a chore.", passiveBonus: { attribute: "strength", multiplier: 0.12 } },
      { id: "str_master", name: "Unbreakable Body", icon: "ti-barbell", tier: 4, requiredLevel: 10, description: "Physical limits you used to respect are now just numbers you occasionally beat. Your body does what you ask of it, reliably.", passiveBonus: { attribute: "strength", multiplier: 0.2 } }
    ],
    charisma: [
      { id: "cha_comfortable_presence", name: "Comfortable Presence", icon: "ti-user-check", tier: 1, requiredLevel: 2, description: "Small talk and new social settings no longer feel draining.", passiveBonus: { attribute: "charisma", multiplier: 0.05 } },
      { id: "cha_real_listener",  name: "Real Listener",   icon: "ti-ear", tier: 2, requiredLevel: 4, description: "People feel heard around you because you actually listen.", passiveBonus: { attribute: "charisma", multiplier: 0.08 } },
      { id: "cha_natural_authority", name: "Natural Authority", icon: "ti-crown", tier: 3, requiredLevel: 6, description: "People turn to you in uncertain moments.", passiveBonus: { attribute: "charisma", multiplier: 0.12 } },
      { id: "cha_master", name: "Magnetic Presence", icon: "ti-sparkles", tier: 4, requiredLevel: 10, description: "Rooms shift when you enter them — not because you demand it, but because your presence has become genuinely compelling.", passiveBonus: { attribute: "charisma", multiplier: 0.2 } }
    ],
    willpower: [
      { id: "wil_do_it_anyway",   name: "Do It Anyway",    icon: "ti-sword", tier: 1, requiredLevel: 2, description: "You act before you feel ready instead of waiting for motivation.", passiveBonus: { attribute: "willpower", multiplier: 0.05 } },
      { id: "wil_comfort_breaker", name: "Comfort Breaker", icon: "ti-flame", tier: 2, requiredLevel: 4, description: "You deliberately seek out discomfort because you know it builds you.", passiveBonus: { attribute: "willpower", multiplier: 0.08 } },
      { id: "wil_unbreakable",    name: "Unbreakable",     icon: "ti-infinity", tier: 3, requiredLevel: 6, description: "Setbacks don't shake you — you know you can rebuild.", passiveBonus: { attribute: "willpower", multiplier: 0.12 } },
      { id: "wil_master", name: "Iron Mind", icon: "ti-shield-lock", tier: 4, requiredLevel: 10, description: "There is no version of discomfort left that surprises you. You have tested yourself enough times to trust exactly what you can endure.", passiveBonus: { attribute: "willpower", multiplier: 0.2 } }
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
    { id: "secret_comeback", name: "The Comeback", description: "Rebuild a streak to 7 days after a penalty reset it to 0.", category: "secret", icon: "ti-rotate", secret: true, type: "event" },

    // --- Legendary achievements (very high thresholds, long-term play only) ---
    { id: "legend_xp_100000",  name: "Living Legend",  description: "Earn 100,000 lifetime XP.", category: "legendary", icon: "ti-diamond", type: "counter", stat: "lifetimeXp", threshold: 100000 },
    { id: "legend_prestige_1", name: "Reborn",          description: "Prestige for the first time.", category: "legendary", icon: "ti-refresh-dot", type: "counter", stat: "prestige.count", threshold: 1 },
    { id: "legend_prestige_3", name: "Cycle Breaker",   description: "Prestige 3 times.", category: "legendary", icon: "ti-infinity", type: "counter", stat: "prestige.count", threshold: 3 },
    { id: "legend_streak_100", name: "Immovable",       description: "Maintain a 100-day streak.", category: "legendary", icon: "ti-shield-lock", type: "counter", stat: "streak", threshold: 100 },
    { id: "legend_quest_2000", name: "The Long Game",   description: "Complete 2,000 quests.", category: "legendary", icon: "ti-hourglass-high", type: "counter", stat: "quests.totalCompletedEver", threshold: 2000 },
    { id: "legend_campaign_complete", name: "Beyond The Campaign", description: "Defeat every boss in the full campaign, including the endgame.", category: "legendary", icon: "ti-crown", type: "counter", stat: "bosses.defeated.length", threshold: 5 }
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
      startingDominance: 20,
      passiveDominancePerDay: 4,
      normalQuestDominanceReduction: 1,
      cancellationDominancePenalty: 10,
      expirationDominancePenalty: 25,
      baseDamagePerXp: 0.2,
      damageRules: [
        { matchType: "attribute", match: "willpower", damagePerXp: 0.8 },
        { matchType: "tag", match: "discipline", damagePerXp: 0.4 }
      ],
      weakPoints: [
        {
          id: "focus_lens",
          name: "Focus Lens",
          shortName: "Attention sensor",
          color: "#8DEFFF",
          icon: "ti-eye",
          description: "The sensor array that redirects attention toward easier, lower-value work.",
          missionTitle: "Start Before Ready",
          missionDescription: "Choose one delayed task and begin before comfort creates another excuse.",
          completionCondition: "Start within five minutes and finish one meaningful work block.",
          durationMinutes: null,
          dominanceReduction: 12,
          target: { x: 50, y: 38 },
          callout: { x: 4, y: 18, side: "left" },
          breakDamagePct: 0.2
        },
        {
          id: "delay_core",
          name: "Delay Core",
          shortName: "Central reactor",
          color: "#FF5C7A",
          icon: "ti-power",
          description: "The central reactor that turns hesitation into lost time.",
          missionTitle: "Priority Override",
          missionDescription: "Confront the highest-impact task you have been avoiding.",
          completionCondition: "Complete and deliver one clearly defined outcome.",
          durationMinutes: null,
          dominanceReduction: 18,
          target: { x: 50, y: 56 },
          callout: { x: 66, y: 47, side: "right" },
          breakDamagePct: 0.35
        },
        {
          id: "rear_leg",
          name: "Execution Claw",
          shortName: "Golden claw",
          color: "#F7C948",
          icon: "ti-target-arrow",
          description: "The reinforced claw that keeps unfinished work trapped in Procrastination's grip.",
          missionTitle: "Close the Open Loop",
          missionDescription: "Bind one project you have delayed for too long and finish it completely.",
          completionCondition: "Finish the selected project and deliver its final result.",
          durationMinutes: null,
          dominanceReduction: 15,
          target: { x: 86, y: 87 },
          callout: { x: 5, y: 76, side: "left" },
          contractPrompt: "Name one project you have delayed for too long.",
          contractPlaceholder: "e.g. Finish and submit my portfolio",
          breakDamagePct: 0.3
        }
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
      startingDominance: 20,
      passiveDominancePerDay: 4,
      normalQuestDominanceReduction: 1,
      cancellationDominancePenalty: 10,
      expirationDominancePenalty: 25,
      baseDamagePerXp: 0.2,
      damageRules: [
        { matchType: "attribute", match: "charisma", damagePerXp: 0.8 }
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
      startingDominance: 20,
      passiveDominancePerDay: 4,
      normalQuestDominanceReduction: 1,
      cancellationDominancePenalty: 10,
      expirationDominancePenalty: 25,
      baseDamagePerXp: 0.2,
      damageRules: [
        { matchType: "attribute", match: "willpower", damagePerXp: 0.8 }
      ],
      rewards: { xp: 700, title: "Present Mind" },
      nextBossId: "self_doubt"
    },

    // --- Endgame bosses: unlocked only after the original 3-boss campaign
    // is cleared. Meaningfully higher HP, and damage rules that reward
    // consistency across MULTIPLE attributes rather than one dominant
    // stat — reflecting that late-game challenges aren't beaten by
    // over-training one skill, but by being genuinely well-rounded.
    self_doubt: {
      id: "self_doubt",
      name: "Self-Doubt",
      icon: "ti-cloud-storm",
      lore: "The original three were external distractions. This one is internal — the voice that says your progress doesn't count, that you got lucky, that real growth is happening to someone else. It only shows up once you've actually built something worth doubting.",
      ability: "Quietly discounts every real win, making consistent effort feel invisible even as it compounds.",
      description: "The endgame boss — only appears after the original three are defeated.",
      maxHp: 2200,
      startingDominance: 20,
      passiveDominancePerDay: 4,
      normalQuestDominanceReduction: 1,
      cancellationDominancePenalty: 10,
      expirationDominancePenalty: 25,
      baseDamagePerXp: 0.2,
      damageRules: [
        { matchType: "attribute", match: "willpower", damagePerXp: 0.3 },
        { matchType: "tag", match: "discipline", damagePerXp: 0.4 }
      ],
      rewards: { xp: 1200, title: "Self-Assured" },
      nextBossId: "the_plateau"
    },
    the_plateau: {
      id: "the_plateau",
      name: "The Plateau",
      icon: "ti-trending-up-2",
      lore: "True endgame: the moment progress stops feeling exciting and starts feeling like maintenance. Most people quit here, mistaking a slower curve for no curve at all. This boss doesn't attack — it just waits for you to decide you're done growing.",
      ability: "Makes consistent, unglamorous effort feel pointless by removing the dopamine of visible, fast progress.",
      description: "The final boss of the current campaign — beating this is what prestige is built to prepare you for.",
      maxHp: 3000,
      startingDominance: 20,
      passiveDominancePerDay: 4,
      normalQuestDominanceReduction: 1,
      cancellationDominancePenalty: 10,
      expirationDominancePenalty: 25,
      baseDamagePerXp: 0.2,
      damageRules: [
        { matchType: "attribute", match: "willpower", damagePerXp: 0.2 },
        { matchType: "tag", match: "discipline", damagePerXp: 0.4 },
        { matchType: "attribute", match: "intelligence", damagePerXp: 0.2 },
        { matchType: "attribute", match: "strength", damagePerXp: 0.2 },
        { matchType: "tag", match: "creativity", damagePerXp: 0.2 },
        { matchType: "attribute", match: "charisma", damagePerXp: 0.2 }
      ],
      rewards: { xp: 2000, title: "Unplateaued" },
      nextBossId: null
    }
  }

};

// Expose for non-module script usage across plain <script> tags.
if (typeof window !== "undefined") window.SEED_DATA = SEED_DATA;
