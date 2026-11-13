# 12: OMP settings placed by concept; Tools and Memory pages

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 07, 10, 11
**Covers:** W7
**Files:** `packages/ui/src/components/sections/{openchamber,omp,tools,memory}/`; the settings navigation and `search.ts`; `settingsItemOwnership.test.ts`; locale keys
**Read first:** `research/feedback-2026-11-12/12-omp-settings-and-shells.md` (b) and proposal A; `decisions.md` 2026-11-13 "OMP settings live on the page that owns the concept"; `AGENTS.md` OMP TUI parity rule; `PATTERNS.md`, `STYLING.md`; skill `locale-ui-patterns`
**Check:** the duplicate-owner test passes and asserts every `owned-by` row's control writes its OMP key; settings search finds every placed OMP setting on its page; the sections tests and `bun run lint` exit 0. Real path (Web): Sessions holds retry/fallback, compaction, plan/goal, steering and follow-up, isolation and worktree, and title settings; Chat holds display, thinking and image settings; Behavior holds prompt and personality; Agents holds task, prewalk and advisor; the Tools page lists one row per capability (OpenChamber host tools and OMP tools, including `web` and `browser` as separate rows); the Memory page sets `memory.backend` and its options; the OMP page shows only the long tail. Screenshots go in the evidence directory.

- [ ] Move each placed setting onto its owning page using task 10's renderer for OMP rows.
- [ ] Create the Tools page in the Agent group; it replaces General → OpenChamber Tools.
- [ ] Create the Memory page.
- [ ] Remove duplicate controls: one goal toggle (`sessionGoalEnabled` folds into OMP `goal.enabled`), one plan toggle, one fallback editor (Sessions), one `modelRoles`/`defaultThinkingLevel` editor.
- [ ] Deletes: General → OpenChamber Tools, and every control the move makes a duplicate.
