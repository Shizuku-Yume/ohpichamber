# 10: OMP setting list derived from OMP's registry, rendered from its descriptors

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 03
**Covers:** W6, W7
**Files:** `packages/agent-service/src/worker/{settings-ui,catalog-settings,context-settings}.ts`; `packages/agent-contract/src/settings.ts` (or the OMP settings schema module); `packages/ui/src/components/sections/omp/OmpSettingsPage.tsx` and its row registry; `omp-settings.i18n.ts`
**Read first:** `research/feedback-2026-11-12/12-omp-settings-and-shells.md` (a) and "Two IA proposals"; `03-11-settings-parity.md` (item 11, `-1`); `decisions.md` 2026-11-13 "OMP settings live on the page that owns the concept"; OMP `config/all-settings` `orderedSettings()`; skills `ui-api-decoupling`, `locale-ui-patterns`; `PATTERNS.md`
**Check:** a service test loads OMP's registry and asserts every TUI-visible id has a placement and that no hand-kept id list remains; a UI test renders a number setting with a `default` option as a select showing "默认"/"Default" for `-1`; `bun test --timeout 15000 src/worker` in `packages/agent-service` and the OMP settings UI tests exit 0. Real path (Web): the OMP page shows compaction thresholds as "默认"/"自动" and lists every `engine` setting with label and description.
**Base commit:** 1f9b10086ba1625fc88a6802aa572ed50f8c12be
**Status:** blocked

- [x] Derive the setting list from `orderedSettings()`. Replace `OMP_SETTING_IDS` and the `surface` table with a placement table: `page:section`, `engine`, `tui-only`, `owned-by <settingsItem>` or `boundary`. Every TUI-visible id is placed; untabbed ids default to hidden.
- [x] Fix the known misclassifications: `followUpMode` is not `chat.follow-up-behavior`; `recap.*` is owned by Chat → Session recap (task 11 made that control write `recap.enabled` and `recap.idleSeconds`).
- [x] Render OMP page rows from the descriptor: type to control, `options` to select including sentinel values, `condition` to visibility, OMP label and description with locale overrides.
- [x] The "kept out" count reports the real number of settings not shown.
- [x] Deletes: `OMP_SETTING_IDS`, the hand-kept allowlist and the raw number rendering of sentinels.

## Progress

- Base: see the header line above (1f9b10086).
- Commits on `ux-feedback-2026-11-12/10`: `ba1395bcd` (contract placements, totalCount), `2f867b944` (placement table, write gate), `a8f38da1c` (descriptor-driven OMP rows, Default sentinels), `41a51f559` (decisions), `205ae0831` (merge of integration), plus the boundary change (see decisions 2026-11-14 "Enterprise-boundary OMP settings").
- Check before: the previous worker's uncommitted edits had 2 failing contract tests, a UI test timeout under CPU contention, and a worker suite failure on the stale descriptor expectation.
- Check after (real results):
  - `bun test --timeout 15000 src/worker` in packages/agent-service: 336 pass, 0 fail, exit 0 (run after the boundary change, 346 tests including the flaky-under-EDQUOT run that was rerun clean).
  - packages/agent-contract `bun test`: 255 pass, 0 fail.
  - OMP settings page UI test (`src/components/sections/openchamber/OmpSettingsPage.test.tsx`): 10 pass, 0 fail.
  - i18n tests (`src/lib/i18n`): 106 pass, 0 fail.
  - `bunx oxlint -c ../../oxlint.config.ts` on every changed TS file: clean.
  - `tsc` in agent-contract and agent-service: clean. `ui` type-check still fails on `ToolPart.tsx:1234`, `useCallableModelProviders.test.tsx:39`, `smallModelRequest.test.ts:30`, which this task does not touch.
  - `bun run dead-code`: nothing in the changed files.
  - `bun run build:web`: passes.
- Real path (Web, port 4110, isolated HOME and `/tmp` data dir, provider env loaded): NOT PASSED. The OMP page shows "Could not read OMP's settings." because the settings endpoint answers 503 SERVICE_UNAVAILABLE ("The Agent Service is not ready."). The worker reports `WORKER_INIT_FAILED`/`SERVICE_UNAVAILABLE` and the supervisor discards its stderr. Evidence: `ufb-…/ux-feedback-2026-11-13/task10/` (README.md, omp-page-en.png, omp-page-en.txt, settings-api-probe.txt, agent-service-direct-run.log, worker-direct-run.log). Compaction thresholds (默认) and the engine rows were therefore not seen on the live page.
- Review: no reviewer subagent tool is available in this run. The diff was reviewed by the author against the Check and the enterprise-boundary skill; no separate review round was run.

## Blocked

- The real-path Check cannot run in this worktree: the Host cannot bring the Agent Service worker to ready in an isolated environment, although the worker suite and direct module imports pass. The supervisor discards worker stderr, so the init cause is not visible from logs. Tried: rebuilding the agent-service dist (which removed a stale `OMP_SETTING_IDS` import), restoring HOME for the provider env, unsetting `OMP_SOURCE_DIR`, clearing a stale daemon on 4110. Next step: capture the worker's stderr at the supervisor (or run the worker under the Host's IPC) to see the `WORKER_INIT_FAILED` cause, then rerun the real path and archive.
- Not archived and not landed; the done file reports `blocked`.
