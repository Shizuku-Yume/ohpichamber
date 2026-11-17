# 01: Bring dead code to zero

**Effort:** tech-debt-sweep
**Task type:** refactor
**Blocked by:** 02, 03, 05, 06, 07, 08
**Covers:** W1
**Files:** `knip.json`; every file `bun run dead-code` reports on the integration tip
**Read first:** `.workflow/specs/tech-debt-sweep.md` (item 1); `.agents/skills/openchamber-change-discipline/SKILL.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task13/gate/final-07-dead-code.log`; `AGENTS.md` Validation
**Check:** `bun run dead-code && bun run type-check && bun run lint && VITEST_MAX_WORKERS=2 bun run --cwd packages/ui test && bun run --cwd packages/web test` → all exit 0; `dead-code` prints no unused file, export, type or hint.

- [ ] Rerun `bun run dead-code` on the integration tip after tasks 02-08 landed; that list, not the old log, is the work list.
- [ ] Each unused file is checked for dynamic imports, string-addressed loaders, tests and docs before deletion; retired relics (OpenCode, VS Code, old workflow cards) are deleted with their tests and stale doc mentions.
- [ ] Each unused export is un-exported or deleted. Exports that are a real public contract (`@openchamber/sdk`, `@openchamber/agent-contract` consumers, package entrypoints) are declared as entries in `knip.json`, one named path each; no blanket ignore globs.
- [ ] The 7 configuration hints are resolved.
- [ ] Exports flagged in files other tasks just added (pins, unread, warming) are checked against their callers; a real caller wins over deletion.
