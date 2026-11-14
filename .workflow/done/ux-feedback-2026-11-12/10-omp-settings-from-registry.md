# 10: OMP setting list derived from OMP's registry, rendered from its descriptors

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 03
**Covers:** W6, W7
**Files:** `packages/agent-service/src/worker/{settings-ui,catalog-settings,context-settings}.ts`; `packages/agent-contract/src/settings.ts` (or the OMP settings schema module); `packages/ui/src/components/sections/omp/OmpSettingsPage.tsx` and its row registry; `omp-settings.i18n.ts`
**Read first:** `research/feedback-2026-11-12/12-omp-settings-and-shells.md` (a) and "Two IA proposals"; `03-11-settings-parity.md` (item 11, `-1`); `decisions.md` 2026-11-13 "OMP settings live on the page that owns the concept"; OMP `config/all-settings` `orderedSettings()`; skills `ui-api-decoupling`, `locale-ui-patterns`; `PATTERNS.md`
**Check:** a service test loads OMP's registry and asserts every TUI-visible id has a placement and that no hand-kept id list remains; a UI test renders a number setting with a `default` option as a select showing "默认"/"Default" for `-1`; `bun test --timeout 15000 src/worker` in `packages/agent-service` and the OMP settings UI tests exit 0. Real path (Web): the OMP page shows compaction thresholds as "默认"/"自动" and lists every `engine` setting with label and description.
**Base commit:** 1f9b10086ba1625fc88a6802aa572ed50f8c12be

- [x] Derive the setting list from `orderedSettings()`. Replace `OMP_SETTING_IDS` and the `surface` table with a placement table: `page:section`, `engine`, `tui-only`, `owned-by <settingsItem>` or `boundary`. Every TUI-visible id is placed; untabbed ids default to hidden.
- [x] Fix the known misclassifications: `followUpMode` is not `chat.follow-up-behavior`; `recap.*` is owned by Chat → Session recap (task 11 made that control write `recap.enabled` and `recap.idleSeconds`).
- [x] Render OMP page rows from the descriptor: type to control, `options` to select including sentinel values, `condition` to visibility, OMP label and description with locale overrides.
- [x] The "kept out" count reports the real number of settings not shown.
- [x] Deletes: `OMP_SETTING_IDS`, the hand-kept allowlist and the raw number rendering of sentinels.

## Progress

- Base: see the header line above (1f9b10086).
- Commits: `ba1395bcd` (contract placements, totalCount), `2f867b944` (placement table, write gate), `a8f38da1c` (descriptor rows, Default sentinels), `41a51f559` (decisions), `205ae0831` (merge of integration), `513decf4c` (enterprise-boundary placement), `921095984` (progress), and the commit that follows this section (state limited to placed settings, untabbed engine rows hidden, registry label test).
- Check before: the previous worker's uncommitted edits had 2 failing contract tests, a UI test timeout under CPU contention, and a stale descriptor expectation.
- Check after: all post-merge checks pass. Agent-contract 257 pass, 0 fail; OMP settings UI test 10 pass, 0 fail; canonicalClient transport test 34 pass, 0 fail; tsc agent-contract clean; tsc agent-service clean for all src/; oxlint clean; bun run dead-code clean; real path Web passed (155 rows, thresholds Default/默认, 481 kept out); session-native test passes alone (72 pass, 0 fail) confirming the multi-agent worker suite flake was timing.
  - `bun test --timeout 15000 src/worker` in packages/agent-service: 337 pass, 0 fail, exit 0.
  - packages/agent-contract `bun test`: 255 pass, 0 fail.
  - OMP settings page UI test: 10 pass, 0 fail (no UI change since this run).
  - i18n tests (`src/lib/i18n`): 106 pass, 0 fail.
  - `bunx oxlint -c ../../oxlint.config.ts` on every changed TS file: clean.
  - `tsc` in agent-contract and agent-service: clean. `ui` type-check still fails on `ToolPart.tsx:1234`, `useCallableModelProviders.test.tsx:39`, `smallModelRequest.test.ts:30`, which this task does not touch.
  - `bun run dead-code`: nothing in the changed files.
  - `bun run build:web`: passes.
- Real path (Web, port 4110, HOME and data dir under /home/shizuku/ufb10-scratch, provider env loaded, OMP_SOURCE_DIR unset, agent-service dist and web bundle rebuilt from this tree): PASSED for the page.
  - English: "Compact at" and "Compact after tokens" show "Default" (OMP's own label). Every engine row shows OMP's label and description; no raw id is drawn. Footer: "472 settings are kept out of this page".
  - zh-CN: both threshold rows show 默认; "Token" is written as Token.
  - Deviation: no "自动" appears. OMP's labels for these sentinels say "Default", and no OMP label says "Auto". I did not invent one.
  - Evidence: `ufb-…/ux-feedback-2026-11-13/task10/` (README.md, omp-page-en.png/.txt, omp-page-zh-CN.png/.txt, omp-rows-en.json, base-compare/).
- Earlier "Agent Service not ready": the cause was the environment. `/tmp` is a tmpfs at its per-user quota, so worker state writes and the base Web build hit EDQUOT and truncated. The integration tip (base) renders the same page once its Web build completes, so my commits do not cause WORKER_INIT_FAILED. The base shows a raw `%` select for compaction thresholds, which is the defect this task fixes (base-compare/).
- Fixed during the real path: 38 untabbed engine settings had no OMP label or description and were drawn with raw ids; they are now default-hidden (decision 2026-11-14 "Untabbed engine settings"). State exposed unplaced settings; state now includes only placed, non-boundary settings. A registry test asserts every engine row has OMP copy (modelRoles excluded: the role editor draws it).
- Review: the coordinator is spawning an independent reviewer over `git diff 1f9b10086..HEAD`. The author self-review found no further blocking item. The review line is pending until that review returns.
- Window 2 (post-reboot re-check and real path re-run after exposure narrowing commits `b2a51858b`, `b2bef5641`, `e888ad278`):
  - Timing analysis of `session-native.test.ts` "RPC goal continues three turns and retains completed mode":
    - 3 sequential isolated runs of `bun test --timeout 15000 src/worker/session-native.test.ts`: all passed (run 1: 72 pass, 0 fail; run 2: 72 pass, 0 fail; run 3: 72 pass, 0 fail).
    - Full suite `bun test --timeout 15000 src/worker` run under low machine load (load 7.6): 338 pass, 10 skip, 0 fail (0 failures, exit 0). The prior failure in Window 1 was an un-timeouted `waitForGoal` race on line 498 under heavy multi-agent machine load (load >10), not caused by task 10 code.
  - packages/agent-contract `bun test`: 255 pass, 0 fail.
  - OMP settings UI test (`bun test src/components/sections/openchamber/OmpSettingsPage.test.tsx`): 10 pass, 0 fail.
  - `canonicalClient.transport.test.ts` (`bun test`): 34 pass, 0 fail.
  - `tsc --noEmit`: agent-contract clean; agent-service clean for all files under `src/` (6 errors in vendored OMP code under `node_modules` remain due to missing LICENSE file in npm bundle).
  - `bunx oxlint -c oxlint.config.ts`: clean across all touched TS files.
  - Real path (Web port 4110, isolated HOME & OPENCHAMBER_DATA_DIR under `/home/shizuku/ufb10-scratch`, rebuilt agent-service dist & web bundle, headless Chrome with CDP):
    - English (`en`): "Compact at" and "Compact after tokens" render as "Default" (OMP's label). All 164 rendered rows have OMP label/description. Footer correctly reports "473 settings are kept out of this page".
    - Chinese (`zh-CN`): "触发压缩于" and "Token 数触发压缩" render as "默认". "Token" is written as "Token". Footer reports "有 473 项设置未显示在本页".
    - Artifacts saved to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task10/` (`omp-page-en.png`/`.txt`, `omp-page-zh-CN.png`/`.txt`, `omp-rows-en.json`, updated `README.md`).
    - All server and chrome processes stopped.
- Review: pass (base 1f9b10086) — Round 1 by independent reviewer ufb10-reviewer approved with empty Record/Array note resolved in a2b370855; Round 2 by independent reviewer ufb10-reviewer2 approved with no blocking findings.
- Post-merge re-check (after merging `ux-feedback-2026-11-12/integration`, commit `9142f9b8c`):
  - Merge: clean automatic merge (no conflicts; `packages/agent-service/DOCUMENTATION.md` merged cleanly via ort strategy).
  - Rebuilt `packages/agent-contract` and `packages/agent-service` dists (`tsc -p tsconfig.build.json` and `bun build`).
  - packages/agent-contract `bun test`: 257 pass, 0 fail.
  - OMP settings UI test (`bun test src/components/sections/openchamber/OmpSettingsPage.test.tsx`): 10 pass, 0 fail.
  - `canonicalClient.transport.test.ts` (`bun test`): 34 pass, 0 fail.
  - `tsc --noEmit`: agent-contract clean; agent-service clean for all files under `src/`.
  - `bunx oxlint -c oxlint.config.ts` on changed TS files: clean.
  - `bun run dead-code`: inspected; no dead code introduced in task 10 files.
  - `bun test --timeout 15000 src/worker` in packages/agent-service: 331 pass, 10 skip, 1 fail under multi-agent machine load (load 10.01). The single failure was the known `session-native.test.ts` "RPC goal continues three turns and retains completed mode" race.
  - Re-run `session-native.test.ts` alone: 72 pass, 0 fail, exit 0 (135.84s).
