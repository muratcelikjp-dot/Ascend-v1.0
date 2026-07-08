# Refactor Notes

## Current working state before refactor

Date: 2026-07-08

## Working
- Home screen opens.
- Quest board opens.
- Mobile PWA opens.
- App seems usable on mobile.

## Uncertain
- Data persistence is not fully confirmed.
- A JavaScript console error appeared once, but it did not repeat.

## Known issue
- PWA does not seem to update automatically after deploying new files.
- I had to delete files, upload updated files, open the new link on phone, and re-add the app to home screen.

## Refactor rule
Before changing architecture, preserve current behavior.
First refactor steps should be:
1. Move index.html CSS into css/index.css.
2. Move inline index JavaScript into js/index.js.
3. Then investigate PWA update/cache behavior.