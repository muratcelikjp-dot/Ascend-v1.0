# Ascend UI Direction

## 1. Visual Concept Name

**Abyss UI**

Abyss UI is the new visual foundation for Ascend: a calm, immersive, deep-ocean-meets-blue-space RPG interface for real-life self-improvement.

It should feel focused, powerful, and slightly mysterious. The user is not opening a productivity app; they are entering a personal command deck beneath the surface, where quests, stats, streaks, rewards, bosses, and skills all feel connected to one progression system.

## 2. Overall Mood

- Deep ocean, blue space, and quiet RPG HUD.
- Calm before intensity, not loud cyberpunk.
- Immersive, atmospheric, and polished without becoming visually noisy.
- Mature and aspirational, not childish or cartoonish.
- Magical-tech, but restrained: soft glow, glass, particles, depth, and subtle motion.
- Mobile-first and tactile, designed for repeated daily use.

The interface should make progress feel valuable, but it should never overwhelm the user when they open the app to complete a simple daily action.

## 3. Color Palette

### Core Backgrounds

- Abyss Black: `#020713`
- Deep Navy: `#071326`
- Ocean Void: `#091B2F`
- Rift Blue: `#0B2744`

### Primary Glow Colors

- Neon Blue: `#2F9DFF`
- Aqua Core: `#35F4E6`
- Cyan Mist: `#8DEFFF`
- Arcane Purple: `#8B5CF6`

### Accent Colors

- Ascend Gold: `#F7C948`
- Reward Amber: `#F59E0B`
- Vital Green: `#41E6A4`
- Danger Coral: `#FF5C7A`

### Text Colors

- Primary Text: `#EAF8FF`
- Secondary Text: `#A7C7D9`
- Muted Text: `#6F8EA3`
- Disabled Text: `#3F5A6F`

### Surface Colors

- Glass Surface: `rgba(10, 28, 48, 0.58)`
- Glass Surface Strong: `rgba(13, 38, 64, 0.76)`
- Border Soft: `rgba(141, 239, 255, 0.18)`
- Border Active: `rgba(53, 244, 230, 0.52)`
- Shadow Blue: `rgba(47, 157, 255, 0.22)`

## 4. Typography Direction

- Use a clean modern sans-serif for the base UI.
- Headings should feel like RPG HUD labels: compact, readable, slightly technical, but not sci-fi novelty.
- Avoid decorative fantasy fonts. They will make Ascend feel childish and reduce readability.
- Keep body text calm and readable on dark surfaces.
- Use uppercase sparingly for labels, badges, tabs, and stat headers.
- Use numeric hierarchy for RPG stats: level, XP, streaks, ranks, boss HP, and skill points should be visually easy to scan.

Suggested font direction:

- Primary UI: `Inter`, `System UI`, or a similar high-readability sans-serif.
- Optional display accent: a restrained geometric font for page titles and HUD labels only.

## 5. Background Style

The global background should be a deep abyss field with layered depth:

- Dark radial depth from black/navy into deep blue.
- Subtle aqua and purple glow zones.
- Sparse floating particles or star-like motes.
- Slow ambient movement when performance allows.
- Optional faint grid, constellation, or wave patterns at very low opacity.

The background should feel alive, but it must stay behind the content. It should never compete with quests, buttons, or stats.

Avoid:

- Bright full-screen gradients.
- Heavy animated canvases on every page.
- Dense particle storms.
- Repeating cyberpunk grid tropes.
- Backgrounds that make text harder to read.

## 6. Glass Card Style

Cards should feel like floating glass HUD panels suspended in the abyss.

Recommended style:

- Background: `rgba(10, 28, 48, 0.58)` to `rgba(13, 38, 64, 0.76)`.
- Border: `1px solid rgba(141, 239, 255, 0.18)`.
- Active border: `rgba(53, 244, 230, 0.52)`.
- Border radius: `8px` for most cards.
- Blur: light backdrop blur only where performance is acceptable.
- Shadow: soft blue shadow, never heavy black blocks.
- Inner highlight: subtle top edge glow for premium depth.

Cards should organize information, not decorate every section. Avoid card-inside-card layouts.

## 7. Button Style

Buttons should feel tactile and game-like, but still practical.

Primary buttons:

- Dark glass base.
- Aqua or neon blue border.
- Soft glow on hover, focus, or press.
- Clear active/disabled states.
- Compact mobile-friendly height.

Secondary buttons:

- Lower contrast glass.
- Muted border.
- No large glow unless selected.

Danger or reset-like buttons:

- Use coral/red sparingly.
- Require clear intent.
- Never look like a normal progression action.

Button interactions should be quick and responsive. Press states should feel like HUD controls activating.

## 8. Badge / Stat Pill Style

Badges and stat pills should communicate compact RPG information.

Use them for:

- Level
- XP
- Streak
- Skill points
- Rank
- Attribute labels
- Boss phase
- Reward status

Recommended style:

- Small glass pill or compact rectangle.
- Aqua, blue, purple, or gold accent depending on meaning.
- Thin border with subtle glow.
- Clear icon plus short label when space allows.
- Numeric values should be visually stronger than labels.

Avoid large pill clusters that make the app feel busy.

## 9. Progress Bar Style

Progress bars are core to the RPG feeling.

Recommended style:

- Dark recessed track.
- Fill with aqua/blue gradient.
- Gold fill only for rare completion or reward moments.
- Soft inner glow on fill.
- Clear value text nearby or inside only when legible.
- Boss HP bars may use danger coral, purple, or phase-specific colors.

Animation:

- Fill changes should ease smoothly.
- XP gain can briefly shimmer.
- Completion can pulse once, not loop forever.

## 10. Animation Principles

Animations should make the app feel alive without draining attention or battery.

Use:

- Subtle floating panels.
- Light particle drift.
- Small glow pulses for completed actions.
- Smooth progress bar updates.
- One-shot unlock effects for rewards, achievements, and skills.
- Page transitions that feel like moving between HUD panels.

Avoid:

- Constant bouncing.
- Large looping animations.
- Heavy blur or canvas effects on every screen.
- Long animations that delay input.
- Motion that makes daily use feel slower.

Respect reduced-motion preferences. The app should remain polished with animations disabled.

## 11. iPhone PWA Performance Rules

Ascend must feel fast as an installed iPhone PWA.

Rules:

- Keep animation layers limited.
- Prefer CSS transforms and opacity for motion.
- Avoid large fixed background images unless optimized.
- Avoid expensive full-screen blur on many nested elements.
- Do not run particle systems on every screen by default.
- Use low particle counts and pause hidden/offscreen animations.
- Keep DOM structure simple on mobile.
- Avoid layout shifts when stats update.
- Keep touch targets comfortable.
- Test on narrow iPhone widths, including safe-area insets.
- Respect low-power mode where possible.
- Prefer one immersive hero/background layer over many competing decorative layers.

## 12. First Launch: Motivation OFF / Discipline ON

On the first launch, Ascend should show a short onboarding ritual where the user turns off **Motivation** and turns on **Discipline**.

This is not a normal settings toggle. It is a symbolic identity switch that communicates the product philosophy before the user enters the app.

Purpose:

- Communicate that Ascend is not a motivation app.
- Show that Ascend is about building discipline, systems, and the ability to show up even on bad days.
- Preserve Discipline as a product philosophy, even though Discipline is no longer a main attribute in the redesigned attribute model.
- Mechanically, Discipline maps conceptually to Willpower.

Visual direction:

- Use a dark abyss background with calm depth and minimal particles.
- Show a Motivation toggle in a grey/off state.
- Show a Discipline toggle in an aqua-blue/on state.
- When Discipline turns on, use a soft glow and one restrained pulse.
- Keep the screen quiet, ritual-like, and mature.
- Do not make it feel like a generic settings page.

Suggested copy:

- "Motivation fades. Discipline remains."
- "Ascend is built for the days you show up anyway."

CTA:

- "Begin Ascension"

Implementation note:

This should later be implemented as a lightweight first-launch onboarding screen. In the MVP, it should only save onboarding completion state. It should not change XP, streak, quests, skills, boss logic, rewards, achievements, or daily reset behavior.

## 13. Page-by-Page Direction

### Home

Home should feel like the command deck.

- Show current level, XP, streak, daily focus, and quick quest progress.
- Use one strong central progress module.
- Surface the next meaningful action without clutter.
- Include subtle ambient abyss background.
- Keep daily check-in actions reachable with one thumb.

### Quests

Quests should feel like a mission board.

- Quest cards are glass panels with attribute color accents.
- Completed quests get a brief glow and then settle into a calm completed state.
- Daily and repeatable quests should be easy to scan.
- Avoid making quest cards too tall.
- Important actions should be sticky or reachable near the bottom on mobile.

### Hero / Character

Hero should feel like the character sheet.

- Strong display of level, title, attributes, and progression.
- Attribute stats should feel like RPG meters, not plain numbers.
- Character identity can be represented through portrait, class-like title, aura, or rank panel.
- Use gold sparingly for milestone status.
- Keep it personal, mature, and motivational.

### Skill Tree

Skill Tree should be the most visually distinctive page.

- Use the Abyss Skill Constellation direction.
- Four attribute tabs.
- Selected tree in the center.
- Skill nodes connected with aqua/blue lines.
- Locked nodes dim, available nodes glowing, unlocked nodes gold-accented.
- Selected skill detail panel at the bottom.
- Must be usable on mobile without pinch zoom.

### Boss

Boss should feel like a focused battle screen.

- Boss panel should dominate the page.
- HP bar should be clear and dramatic.
- Damage feedback should be satisfying but not noisy.
- Boss state, phase, and next target should be understandable.
- Use purple/coral accents for danger and gold for victory.
- Keep quest-to-damage relationship clear.

### Rewards

Rewards should feel like an armory or treasure vault.

- Reward cards can use gold and aqua accents.
- Purchased or claimed rewards should have a settled completed state.
- Costs and available XP should be highly visible.
- Avoid making rewards look like generic shopping cards.
- Redemption should feel intentional and satisfying.

### Stats

Stats should feel like an analytics HUD.

- Use compact charts, meters, and stat rows.
- Keep the background calmer than Home or Skill Tree.
- Prioritize readability over spectacle.
- Use color consistently by attribute.
- Avoid chart clutter on mobile.

## 14. Navigation Direction

Navigation should feel like moving between RPG HUD modules.

Mobile-first direction:

- Bottom navigation remains the primary structure.
- Icons should be recognizable and consistent.
- Active tab should glow with aqua or blue.
- Avoid excessive labels or oversized nav items.
- Keep safe-area padding correct for iPhone PWA.
- Navigation should never cover important action buttons.

Desktop or wider screens:

- Bottom navigation can remain, or shift to a compact side/HUD rail later if needed.
- The visual language should stay consistent across sizes.

## 15. What Not To Do

- Do not make the redesign childish, cartoonish, or toy-like.
- Do not use generic cyberpunk styling as the main identity.
- Do not fill every screen with neon outlines.
- Do not make the palette only blue; use purple, aqua, and rare gold for depth.
- Do not overuse blur or glass effects where they hurt performance.
- Do not add heavy animations that slow down daily actions.
- Do not make decorative particles more important than app content.
- Do not use cards inside cards.
- Do not reduce readability for atmosphere.
- Do not change data behavior as part of visual redesign planning.
- Do not add redesign implementation into this document phase.
