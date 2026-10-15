# Development Workflow

## Normal change

1. Start from an up-to-date `main` and create a focused branch such as `feature/quest-filter` or `fix/save-migration`.
2. Ask Codex to inspect the relevant files and `AGENTS.md`, then implement the smallest complete change.
3. Run `npm run verify`.
4. For visual work, inspect the changed page on the required mobile widths and check the console.
5. Push the branch and open a pull request.
6. Merge only after the Verify check passes and the manual visual check is satisfactory.
7. GitHub Pages publishes after the verified change reaches `main`.

## Emergency rule

Do not bypass verification for a quick production fix. Make the smallest fix on a branch, run `npm run verify`, and merge through the same path.

## Branch names

- `feature/<short-name>` for product work
- `fix/<short-name>` for defects
- `chore/<short-name>` for tooling and maintenance
- `docs/<short-name>` for documentation-only changes

Delete merged branches when they are no longer useful. Keep long-lived experimental branches only when they still contain active work.

## What remains manual

Automated checks protect syntax and saved-game logic. Visual quality, touch behavior, service-worker update behavior, and actual iPhone PWA behavior still need intentional testing.
