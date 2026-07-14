# Boss System Design

## 1. Purpose

The Boss System turns real-life progress into a focused RPG encounter.

Bosses are not passive progress bars. They apply pressure through a growing **Dominance** value while the user weakens them through daily quests and timed Boss Missions.

Core loop:

Quest completion -> small boss damage -> lower Dominance -> accept one Boss Mission -> complete it before the deadline -> break a weak point -> deal major damage -> defeat the boss before Dominance reaches 100

The system must remain understandable on a mobile screen and must not become a second task manager inside the app.

## 2. MVP Principles

- Show one active boss at a time.
- Allow only one active Boss Mission at a time.
- Use three visible weak points per boss as the default.
- Keep the main Boss screen focused on the boss, its weak points, Integrity, and Dominance.
- Keep mission rules data-driven so durations and balance values can change without rewriting the engine.
- Never reset XP, streak, attributes, normal quest history, or unrelated player progress after a boss defeat.
- Completed Boss Missions are final and cannot be undone.
- Avoid additional cooldown, preparation, checkpoint, and proof systems in the first version.

## 3. Boss Screen

The main Boss screen should be a clean encounter view rather than a long information page.

Recommended hierarchy:

1. Back control and encounter status.
2. Large boss name, such as `PROCRASTINATION`.
3. Animated boss artwork.
4. Up to three short callout boxes connected to visible weak points.
5. Boss Integrity bar.
6. Boss Dominance bar.

Tapping a weak-point callout opens a mobile bottom sheet. The sheet shows:

- Weak-point name.
- Mission description.
- Completion condition.
- Time limit when configured.
- Integrity damage.
- Dominance reduction.
- Mission state.
- Accept action when available.

Long damage-channel panels, contract cards, lore, roster, and reward grids should not remain permanently visible on the main encounter screen. Secondary information can move into compact optional views later.

## 4. Boss Integrity

Integrity is the boss HP value.

- Integrity ranges from `0` to the boss definition's `maxHp`.
- Normal quests deal small general Integrity damage.
- Boss Missions deal major Integrity damage.
- Breaking a weak point deals a percentage of maximum Integrity so the system scales across bosses.
- Integrity reaching `0` defeats the boss.
- Damage must be capped at current Integrity before being logged.
- Every completion may apply its Integrity damage only once.

Normal quest damage remains intentionally small. The current XP-based damage foundation can continue, with exact balance controlled by boss data.

## 5. Dominance

Dominance represents how much control the boss has over the encounter.

- Dominance ranges from `0` to `100`.
- It rises slowly as local time passes.
- Normal quest completion lowers it by a small amount.
- Boss Mission completion lowers it by a larger amount.
- Cancelling an active Boss Mission increases it.
- Letting a Boss Mission expire increases it significantly.
- Dominance reaching `100` immediately ends the current encounter as a defeat, regardless of remaining boss Integrity.

Suggested visual thresholds:

| Range | State | Presentation |
| --- | --- | --- |
| `0-39` | Suppressed | Calm lights and slow movement |
| `40-69` | Rising | Stronger lights and slightly faster movement |
| `70-89` | Critical | Warmer warning accents and increased tension |
| `90-99` | Defeat imminent | Clear warning state without blocking normal actions |
| `100` | Encounter lost | Defeat sequence |

Dominance should be computed from timestamps when the app opens or renders. The PWA must not depend on a background interval continuing while iOS suspends the app.

Required time fields:

- `dominance`
- `lastDominanceUpdatedAt`

The engine calculates passive growth from elapsed local time, applies it once, then advances `lastDominanceUpdatedAt`. Reopening the app on the same timestamp range must not apply growth repeatedly.

Exact rates remain configurable. Initial balance ideas, not final requirements:

- Passive growth: approximately `+4` per day.
- Normal quest completion: approximately `-1` Dominance.
- Boss Mission completion: approximately `-15` Dominance.
- Mission cancellation: approximately `+10` Dominance.
- Mission expiration: approximately `+25` Dominance.

Do not add a separate penalty for an entirely empty day in the MVP. Passive growth already represents inactivity.

## 6. Weak Points

Each boss should normally define three visible weak points.

Each weak point contains:

- Stable internal `id`.
- Display name.
- Short label.
- Screen coordinates for its callout and target.
- Mission title and description.
- Optional duration in minutes.
- Integrity damage percentage.
- Dominance reduction.
- Visual state.

Weak-point states:

- `available`: Can be inspected and accepted.
- `active`: Its Boss Mission is currently running.
- `broken`: Mission completed; part remains broken for this encounter.
- `unavailable`: Another Boss Mission is active or required data is not configured.

A broken weak point cannot be repeated during the same encounter.

Existing internal identifiers should be preserved during migration when changing display names. For example, an old saved contract key may remain internally stable even if its visible target changes.

## 7. Boss Missions

Boss Missions are predefined by the app for the initial boss roster. A custom boss and mission editor is a later feature.

For the MVP:

- The developer defines each mission.
- The user may provide the real-life target requested by the mission.
- Only one Boss Mission can be active globally.
- Boss Missions do not consume a normal daily quest slot.
- The active Boss Mission appears above the daily quest list on the Quest Board.
- The Boss screen and Quest Board read the same mission object from GameState.

Mission states:

- `available`
- `active`
- `completed`
- `expired`
- `cancelled`

Required mission fields:

- `bossId`
- `weakPointId`
- `status`
- `userTarget`
- `durationMinutes`
- `acceptedAt`
- `deadlineAt`
- `completedAt`
- `failedAt`
- `failureReason`

`durationMinutes` may remain `null` while a mission is still being designed. A mission with no configured duration cannot be accepted and should display a neutral `Protocol pending` state.

When a duration is later decided, only the data value should need to change. Examples:

- 3 hours: `180`
- 3 days: `4320`

## 8. Mission Acceptance And Timer

Acceptance flow:

1. User taps a weak point.
2. Bottom sheet shows the mission, time limit, damage, and Dominance effect.
3. User supplies any required real-life target.
4. User confirms `Accept Mission`.
5. `acceptedAt` and `deadlineAt` are written in one GameState update.
6. The mission immediately appears on the Quest Board.

The timer is derived from `deadlineAt - current time`.

- Closing the app does not pause the timer.
- Opening multiple screens must not create separate timers.
- Expiration must be processed idempotently.
- The same expired mission must not increase Dominance more than once.
- Local calendar helpers should be used for local-day rules, while mission deadlines should use absolute timestamps.

## 9. Mission Completion

The Quest Board provides a clear `Complete Mission` action.

Before completion, show a short confirmation that explains:

- Completion is final.
- The mission cannot be undone.
- Boss damage and rewards will be applied immediately.

Completion is one transaction:

1. Verify the mission is active and not expired.
2. Mark it completed.
3. Break the weak point.
4. Apply major Integrity damage once.
5. Reduce Dominance once.
6. Apply configured XP or rewards once.
7. Record completion time and encounter history.
8. Render the broken boss part and impact animation.

The UI must not offer an undo control after completion.

The MVP does not require photo proof or multi-step checkpoints. These can be added later without changing the core mission lifecycle.

## 10. Cancellation

An active Boss Mission can be cancelled from the Quest Board after a confirmation.

MVP cancellation behavior:

- Mark mission `cancelled`.
- Apply the configured Dominance increase once.
- Apply no Integrity damage.
- Apply no XP or rewards.
- Clear the active mission slot.
- Keep a history record.
- Do not apply a cooldown or Recalibration state.

A clear confirmation before acceptance and cancellation is sufficient for the MVP. Do not add a separate 60-second undo window.

## 11. Expiration And Failure Reasons

When the deadline passes:

- Mark the active mission `expired` once.
- Apply the configured Dominance increase once.
- Apply no Integrity damage.
- Apply no XP or rewards.
- Clear the active mission slot.
- Prompt for an optional failure reason.

Suggested failure reasons:

- `time_underestimated`
- `task_too_large`
- `forgot_or_lost_focus`
- `external_blocker`
- `wrong_mission`

Failure reasons are informational in the MVP. They do not change the penalty. Later systems may use this history to recommend better mission scope or duration.

The reason prompt must not trap the user. It can be skipped and completed later.

## 12. Quest Board Integration

The active Boss Mission appears as a distinct primary mission above normal daily quests.

It should show:

- Boss and weak-point identity.
- User-defined target.
- Remaining time.
- Integrity damage.
- Dominance effect.
- Complete action.
- Cancel action.

Normal quest completion continues to:

- Grant its existing XP and attribute effects.
- Deal small general boss damage.
- Reduce Dominance by a small configured amount.

Boss Mission completion must use a separate transaction path so normal quest damage and mission damage cannot accidentally apply twice.

## 13. Encounter Defeat

Dominance reaching `100` defeats the current encounter immediately.

Defeat behavior:

1. Expire or close the active Boss Mission without mission rewards.
2. Record the encounter as lost.
3. Record defeat time and boss Integrity at defeat.
4. Show the defeat screen once.
5. Move the boss into a temporary `retreated` state.
6. Preserve all player XP, streak, quest, attribute, skill, reward, and achievement data.

Suggested defeat copy:

> ENCOUNTER LOST
>
> Procrastination withdraws for now. It has seen the gap in your defense and will return prepared.
>
> Your progress remains. Regain control and be ready for its return.

The copy should feel serious without insulting or shaming the user.

## 14. Rematch

Recommended simple MVP behavior:

- The boss remains absent for the rest of the current local day.
- A rematch becomes available on the next local day.
- The user starts it manually with `Begin Rematch`.
- Dominance does not grow while the boss is retreated.
- The returning boss has full Integrity.
- All weak points are repaired and available again.
- Dominance resets to the boss definition's starting value.

Do not require preparation quests for the first version. The rematch delay and complete boss reset are already meaningful consequences.

The exact rematch timing remains configurable if later testing shows that next-local-day recovery is too short or too long.

## 15. Visual Threat Response

Dominance should affect the boss presentation without adding more panels.

As Dominance rises:

- Core and sensor lights become stronger.
- Floating and limb motion become slightly faster.
- Warning accents become warmer.
- The Dominance bar becomes more urgent.
- A single clear warning appears near the final threshold.

Avoid constant flashing, screen shake, noisy particles, or repeated modal warnings.

Respect `prefers-reduced-motion`. Reduced-motion mode may increase color intensity but must not increase animation speed.

## 16. Persistence And Safety

The implementation must include a non-destructive GameState migration.

Rules:

- Never reset localStorage.
- Preserve current boss HP and existing contract history where possible.
- Add missing fields with safe defaults.
- Keep stable boss and weak-point IDs.
- Process passive Dominance, expiration, completion, cancellation, defeat, and rematch idempotently.
- Do not award or penalize twice after reload, navigation, service worker update, or same-day reopening.
- Use local date keys for local-day rematch rules.
- Use absolute timestamps for accepted mission deadlines and elapsed-time Dominance calculations.

Suggested encounter state shape:

```js
{
  bossId: "procrastination",
  status: "active",
  integrity: 1000,
  dominance: 20,
  lastDominanceUpdatedAt: 0,
  activeMission: null,
  weakPointStates: {},
  startedAt: 0,
  defeatedAt: null,
  retreatedAt: null,
  rematchAvailableDate: null,
  attempt: 1
}
```

This is a design target, not permission to replace the current GameState structure without migration planning.

## 17. Boss Definition Shape

Boss-specific values should live in data definitions rather than UI code.

Suggested definition fields:

```js
{
  id: "procrastination",
  maxHp: 1000,
  startingDominance: 20,
  passiveDominancePerDay: 4,
  normalQuestDominanceReduction: 1,
  cancellationDominancePenalty: 10,
  expirationDominancePenalty: 25,
  weakPoints: []
}
```

Each weak point can define its own duration, damage percentage, Dominance reduction, prompt, and visual coordinates.

This data-driven structure prepares the engine for a future Custom Boss editor without building that editor now.

## 18. Deferred Features

Do not include these in the MVP:

- Custom Boss editor.
- User-uploaded boss artwork.
- Multiple simultaneous Boss Missions.
- Mission checkpoints.
- Photo or proof requirements.
- Recalibration and per-weak-point cooldowns.
- Different penalties based on failure reason.
- Preparation quests required for rematch.
- Permanent boss difficulty scaling after every defeat.
- XP or streak loss after encounter defeat.
- Cloud synchronization or cross-device timers.

## 19. Implementation Milestones

### Milestone 1: Dominance Foundation

- GameState migration.
- Data-driven Dominance configuration.
- Elapsed-time calculation.
- Normal quest Dominance reduction.
- Idempotency and multi-day tests.

### Milestone 2: Clean Boss UI

- Large boss identity.
- Three weak-point callouts.
- Integrity and Dominance bars.
- Bottom-sheet mission preview.
- Responsive mobile layout.

### Milestone 3: Boss Mission Lifecycle

- Acceptance.
- Absolute deadline timer.
- Completion confirmation.
- Cancellation.
- Expiration.
- Optional failure reason.

### Milestone 4: Quest Board Integration

- Primary Boss Mission card.
- Shared mission source of truth.
- Completion and cancellation actions.
- One-time progression transaction.

### Milestone 5: Defeat And Rematch

- Dominance 100 defeat.
- Retreat state.
- Full-Integrity return.
- Repaired weak points.
- Next-local-day manual rematch.

### Milestone 6: Visual Response

- Broken-part states.
- Dominance-driven light and motion intensity.
- Defeat presentation.
- Reduced-motion support.

### Milestone 7: Audit

- LocalStorage migration tests.
- Same-day reload tests.
- Multi-day absence tests.
- Expiration and duplicate-processing tests.
- 320px, 390px, and 430px mobile tests.
- iPhone PWA and service worker update tests.

## 20. Open Balance Decisions

The architecture should support these values without requiring them to be finalized now:

- Exact duration of each Procrastination weak-point mission.
- Exact passive Dominance growth rate.
- Exact normal quest damage and Dominance reduction.
- Exact mission damage percentages.
- Exact mission success reduction and failure penalties.
- Exact starting Dominance.
- Exact rematch delay if next-local-day recovery changes after testing.

These are data and tuning decisions, not reasons to duplicate logic or hardcode values in the UI.
