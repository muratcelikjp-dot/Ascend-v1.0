# Ascend Development Contract

## Purpose

Ascend is a mobile-first RPG self-improvement PWA built with plain HTML, CSS, and global JavaScript. Preserve its LocalStorage data, GitHub Pages compatibility, offline behavior, script order, mobile usability, and visual identity.

## Before changing code

- Read `HANDOFF.md` when it exists locally, then inspect the relevant product/design document for broad changes.
- Inspect `git status` and do not overwrite or mix unrelated work.
- Work on a focused branch. Do not develop directly on `main`.
- Keep changes small enough to review and revert.

## Required verification

- Run `npm run verify` before calling code ready.
- For UI changes, check the affected page at 320px, 390px, and 430px widths and inspect the browser console.
- For PWA shell changes, keep `js/app-version.js`, the cache version in `sw.js`, and the service-worker precache list consistent.
- Do not claim iPhone PWA behavior was verified unless it was tested on the device.

## Important invariants

- Never reset or silently discard existing LocalStorage data during updates.
- Preserve save migrations and backward compatibility.
- Use `DateUtils.getLocalDateKey()` for local-day logic; do not derive daily keys from UTC ISO dates.
- Preserve GitHub Pages subpath compatibility.
- Do not introduce a framework or rewrite the application unless the user explicitly requests it.

## Delivery

Report the branch, changed files, verification performed, and anything still requiring manual checking. Deployment happens only after verified changes reach `main`.
