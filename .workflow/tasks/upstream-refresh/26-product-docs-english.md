# 26: Product docs: English

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** The English product documentation and `sidebar.config.json` describe the refreshed UI and OMP behavior, with no OpenCode engine claims.

**Blocked by:** 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/26.tsv` (34 English docs). Main locations: `packages/docs/content/docs/*.mdx` and `packages/docs/sidebar.config.json`; doc assets belong to task 29.

**Read first:** Spec W7; `packages/docs/README.md`; `.workflow/STYLE.md`; the task files of the features whose pages changed; `bun run docs:validate`.
**Covers:** W7

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run docs:validate` exits 0, every changed page renders in the docs build, and a link check finds no broken internal link. Real path: read the changed pages against the running app and correct any claim that does not match.

## Done when

- [ ] Every page describes behavior that exists after the refresh; unverified platform behavior is labelled.
- [ ] No page names OpenCode as the engine or links a removed VS Code surface.
- [ ] Navigation covers the new pages and removes deleted ones.
- [ ] Images and badges resolve locally; no upstream evidence images are restored.
