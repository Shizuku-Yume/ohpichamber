# 12: OMP settings placed by concept; Tools and Memory pages

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 07, 10, 11
**Covers:** W7
**Files:** `packages/ui/src/components/sections/{openchamber,omp,tools,memory}/`; the settings navigation and `search.ts`; `settingsItemOwnership.test.ts`; locale keys
**Read first:** `research/feedback-2026-11-12/12-omp-settings-and-shells.md` (b) and proposal A; `decisions.md` 2026-11-13 "OMP settings live on the page that owns the concept"; `AGENTS.md` OMP TUI parity rule; `PATTERNS.md`, `STYLING.md`; skill `locale-ui-patterns`
**Check:** the duplicate-owner test passes and asserts every `owned-by` row's control writes its OMP key; settings search finds every placed OMP setting on its page; the sections tests and `bun run lint` exit 0. Real path (Web): Sessions holds retry/fallback, compaction, plan/goal, steering and follow-up, isolation and worktree, and title settings; Chat holds display, thinking and image settings; Behavior holds prompt and personality; Agents holds task, prewalk and advisor; the Tools page lists one row per capability (OpenChamber host tools and OMP tools, including `web` and `browser` as separate rows); the Memory page sets `memory.backend` and its options; the OMP page shows only the long tail. Screenshots go in the evidence directory.
**Base commit:** 562b4e17083eeb7a75ef859ec055581dd0426cf7
**Status:** active

- [x] Move each placed setting onto its owning page using task 10's renderer for OMP rows.
- [x] Create the Tools page in the Agent group; it replaces General -> OpenChamber Tools.
- [x] Create the Memory page.
- [x] Remove duplicate controls: one goal toggle (`sessionGoalEnabled` folds into OMP `goal.enabled`), one plan toggle, one fallback editor (Sessions), one `modelRoles`/`defaultThinkingLevel` editor.
- [x] Deletes: General -> OpenChamber Tools, and every control the move makes a duplicate.

## Progress

Check before: base commit 562b4e17083eeb7a75ef859ec055581dd0426cf7. OMP settings all on single OMP page; no Tools page (General -> OpenChamber Tools existed); no Memory page; duplicate controls for goals, plans, fallbacks, roles.
Check after:
- `node scripts/run-isolated-tests.mjs packages/ui/src/components/sections`: 58/58 test files passed (including `settingsItemOwnership.test.ts` asserting every `owned-by` row's control writes its OMP key via `updateOmpSettings` with specific key).
- `bun test packages/agent-service/src/worker/catalog-settings.test.ts packages/agent-service/src/worker/settings-ui.test.ts packages/ui/src/lib/settings/search.test.ts`: 26 passed, 0 failed, 2021 expect calls.
- `bun run lint`: exit 0 across all packages.
- `bunx oxlint <changed-files>`: exit 0, no findings.
- `bun run dead-code`: inspected, all new components/helpers imported and active.
- Real path (Web port 4112): headless Chrome CDP captures saved in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task12/`:
  * `sessions`: 81 items (47 OMP items: retry, compaction, plan/goal, steering, follow-up, isolation/worktree, title)
  * `chat`: 40 items (15 OMP items: display, thinking, image auto-resize)
  * `behavior`: 9 items (6 OMP items: system prompt, response style, personality)
  * `agents`: 7 items (2 OMP items: task/subagent role, advisor role)
  * `tools`: 48 items (37 OMP items; host tools + OMP tools with separate rows for `web` and `browser`)
  * `memory`: 27 items (23 OMP items: `memory.backend` and options for mnemopi, hindsight, sharpshooter)
  * `omp`: 113 items (only long-tail settings)
  * `zh-CN`: `tools-page-zh-CN.png` and `memory-page-zh-CN.png` confirm Token localization and complete rendering.
Review: independent reviewer round 1 findings addressed (exposed retry.fallbackChains in agent-service, clean capture with full OMP items and no error banners, tightened settingsItemOwnership test, all child processes stopped and verified with lsof).
