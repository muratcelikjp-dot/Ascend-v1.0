# Ascend Skill Tree Design

## 1. New Skill Tree Concept Name

**Abyss Skill Constellation**

The Abyss Skill Constellation is a mobile-first RPG skill tree where personal growth feels like lighting nodes in a deep ocean star map. The user earns skill points through progression, then chooses which skills to unlock.

The tree should feel intentional, calm, and rewarding. It should not become a huge feature maze.

## 2. Attribute System

The redesigned main attribute system should use four core attributes:

- Strength
- Intelligence
- Charisma
- Willpower

These should become the primary pillars of the Skill Tree and the main tabs in the skill interface.

## 3. Attribute Consolidation

Discipline and Creativity should no longer be main attributes in the redesigned model.

- Discipline conceptually merges into **Willpower**.
- Creativity conceptually merges into **Intelligence** and **Charisma**.

This is a design direction only. Runtime migration must be handled separately and safely.

## 4. Future Migration Safety

Old localStorage saves must not be broken when this redesign is implemented later.

Future implementation must include a deliberate migration plan for existing users:

- Preserve existing user progress.
- Map old Discipline data into Willpower safely.
- Map old Creativity data into Intelligence and/or Charisma safely.
- Avoid deleting old fields until migration behavior is tested.
- Avoid resetting localStorage.
- Keep a backup or reversible migration path if possible.
- Test old saves from previous versions before release.

No attribute migration should be implemented during this planning-only phase.

## 5. Skill Tree Mechanics

Core mechanics:

- Skills do not unlock automatically.
- The user chooses what to unlock.
- Level ups give skill points.
- Unlocking skills costs skill points.
- Ranking up a skill may cost additional skill points.
- Keep a fixed skill count for the MVP.
- Do not create a large generated skill library.
- Skill effects should support the existing real-life RPG loop without overwhelming it.

Suggested MVP economy:

- Gain `1` skill point per level.
- Each skill has `maxRank` of `1` to `3`.
- Cost can be a flat value or per-rank cost.
- Requirements should be simple: attribute level, previous skill, or total level.

## 6. Skill Node States

Each skill node should have one clear state:

- **locked**: Requirements are not met. Node is dim and not unlockable.
- **available**: Requirements are met, but the user has not unlocked it yet.
- **unlocked**: User has spent skill points and gained at least rank 1.
- **maxed**: User has reached the skill's max rank.

State clarity is more important than visual complexity.

## 7. Visual Style

The tree should look like a constellation under the abyss.

- Dark abyss background.
- Aqua/blue connection lines.
- Gold unlocked nodes.
- Dim locked nodes.
- Available nodes glow softly in aqua.
- Maxed nodes use stronger gold and a quiet aura.
- Each skill should have a unique icon or picture.
- Unlocking a node should trigger a short glow animation.
- Connection lines should brighten when both connected nodes are unlocked.

Avoid noisy motion, oversized effects, and generic neon cyberpunk styling.

## 8. Mobile-First Layout

The Skill Tree must be usable on a phone as the primary experience.

Recommended layout:

- Four attribute tabs at the top: Strength, Intelligence, Charisma, Willpower.
- Selected attribute tree in the center.
- Selected skill detail panel at the bottom.
- Skill points visible near the top or in the detail panel.
- Nodes should fit without pinch zoom.
- Horizontal panning can be considered later, but MVP should avoid requiring it.

The selected skill detail panel should show:

- Skill name
- Icon
- Current rank and max rank
- Cost
- Requirement status
- Effect summary
- Unlock or rank-up action

## 9. Suggested Fixed Skill List

The MVP should use exactly 20 skills:

- 5 Strength skills
- 5 Intelligence skills
- 5 Charisma skills
- 5 Willpower skills

This keeps the system understandable while still giving meaningful choice.

## 10. Skill Definitions

### Strength Skills

| id | name | attribute | iconId | maxRank | cost | requirement idea | effect idea | short RPG flavor text |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `str_power_form` | Power Form | Strength | `icon_strength_fist` | 3 | 1 point per rank | Strength level 2 | Slightly increases XP from physical or body-related quests | Train the body until effort becomes armor. |
| `str_enduring_frame` | Enduring Frame | Strength | `icon_strength_shield` | 3 | 1 point per rank | Power Form rank 1 | Adds a small bonus to streak protection or hard-day recovery rewards | Stand firm when the day pushes back. |
| `str_momentum_strike` | Momentum Strike | Strength | `icon_strength_bolt` | 2 | 2 points per rank | Strength level 5 | Completing multiple Strength quests in one day gives bonus boss damage | Chain action into force. |
| `str_vital_reserve` | Vital Reserve | Strength | `icon_strength_heart` | 2 | 2 points per rank | Strength level 8 | Improves rewards from health, movement, or recovery habits | Build the reserve that carries the climb. |
| `str_titan_core` | Titan Core | Strength | `icon_strength_core` | 1 | 3 points | Strength level 12 and two Strength skills unlocked | Major Strength milestone bonus | Become difficult to move from your path. |

### Intelligence Skills

| id | name | attribute | iconId | maxRank | cost | requirement idea | effect idea | short RPG flavor text |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `int_deep_focus` | Deep Focus | Intelligence | `icon_intelligence_eye` | 3 | 1 point per rank | Intelligence level 2 | Slightly increases XP from study, planning, or deep work quests | Sink below distraction and see clearly. |
| `int_pattern_sense` | Pattern Sense | Intelligence | `icon_intelligence_nodes` | 3 | 1 point per rank | Deep Focus rank 1 | Improves insight from repeated quest categories or stat tracking | Find the signal beneath the surface. |
| `int_clear_strategy` | Clear Strategy | Intelligence | `icon_intelligence_map` | 2 | 2 points per rank | Intelligence level 5 | Planning actions give a small XP or consistency bonus | A mapped path is easier to follow. |
| `int_arcane_memory` | Arcane Memory | Intelligence | `icon_intelligence_book` | 2 | 2 points per rank | Intelligence level 8 | Rewards consecutive learning days or completed study quests | Knowledge returns when called. |
| `int_luminous_mind` | Luminous Mind | Intelligence | `icon_intelligence_star` | 1 | 3 points | Intelligence level 12 and two Intelligence skills unlocked | Major Intelligence milestone bonus | Light the dark with earned understanding. |

### Charisma Skills

| id | name | attribute | iconId | maxRank | cost | requirement idea | effect idea | short RPG flavor text |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `cha_open_signal` | Open Signal | Charisma | `icon_charisma_signal` | 3 | 1 point per rank | Charisma level 2 | Slightly increases XP from social, communication, or expression quests | Let your presence reach the room. |
| `cha_warm_presence` | Warm Presence | Charisma | `icon_charisma_sun` | 3 | 1 point per rank | Open Signal rank 1 | Gives small bonuses for relationship or outreach streaks | Strength can be gentle and still be felt. |
| `cha_command_voice` | Command Voice | Charisma | `icon_charisma_voice` | 2 | 2 points per rank | Charisma level 5 | Social courage quests deal bonus boss damage | Speak with the weight of choice. |
| `cha_resonance_field` | Resonance Field | Charisma | `icon_charisma_orbit` | 2 | 2 points per rank | Charisma level 8 | Improves rewards from teamwork, sharing, or creative communication | What you send out shapes what returns. |
| `cha_royal_aura` | Royal Aura | Charisma | `icon_charisma_crown` | 1 | 3 points | Charisma level 12 and two Charisma skills unlocked | Major Charisma milestone bonus | Carry yourself like a promise kept. |

### Willpower Skills

| id | name | attribute | iconId | maxRank | cost | requirement idea | effect idea | short RPG flavor text |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `wil_iron_vow` | Iron Vow | Willpower | `icon_willpower_chain` | 3 | 1 point per rank | Willpower level 2 | Slightly increases XP from discipline, consistency, or difficult-task quests | Make the promise heavier than the excuse. |
| `wil_streak_guard` | Streak Guard | Willpower | `icon_willpower_guard` | 3 | 1 point per rank | Iron Vow rank 1 | Supports streak protection or recovery mechanics | Guard the flame when the wind rises. |
| `wil_last_stand` | Last Stand | Willpower | `icon_willpower_sword` | 2 | 2 points per rank | Willpower level 5 | Completing a hard quest late in the day gives bonus boss damage | The final move still counts. |
| `wil_calm_under_pressure` | Calm Under Pressure | Willpower | `icon_willpower_wave` | 2 | 2 points per rank | Willpower level 8 | Improves rewards for recovery after missed or low-output days | Breathe, return, continue. |
| `wil_abyss_oath` | Abyss Oath | Willpower | `icon_willpower_oath` | 1 | 3 points | Willpower level 12 and two Willpower skills unlocked | Major Willpower milestone bonus | The deep does not frighten what has chosen to descend. |

## 11. MVP vs Later

### MVP

- Four attribute tabs.
- Fixed 20-skill list.
- Skill point balance.
- Manual unlock and rank-up flow.
- Clear node states.
- Basic requirements.
- Selected skill detail panel.
- Mobile-first layout.
- Safe read-only planning of future migration needs before implementation starts.

### Later

- Skill respec.
- Animated constellation background.
- Rich unlock cinematic.
- Custom skill art for every node.
- Advanced branching requirements.
- Attribute-specific passive formulas.
- Recommended build paths.
- Achievement links.
- Boss-specific skill synergies.

## 12. What Not To Implement Yet

- Do not change runtime app behavior during planning.
- Do not expose Discipline or Creativity as separate attribute tabs or XP bars.
- Keep their migrated quest tags invisible until a concrete skill or boss mechanic uses them.
- Do not add a huge skill list.
- Do not add random skill generation.
- Do not add respec before the basic unlock flow exists.
- Do not add complex combat formulas before the skill economy is stable.
- Do not build the full visual redesign before the data migration plan is tested.
- Do not make skills unlock automatically.
- Do not make the Skill Tree depend on desktop-only interactions.
