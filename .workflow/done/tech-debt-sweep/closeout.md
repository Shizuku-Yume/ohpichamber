# Closeout: tech-debt-sweep

**Accepted:** 2026-11-18 by maintainer

## Shipped

Completed the technical debt sweep restarted from `main` (`7997867af1f4e8f3bc9fa00ec0c569f1670632c9`, integration branch `tech-debt-sweep/integration`, gated tip `018dd9278f17f8374ce8bb0ba7f807679b863edd`, final branch HEAD `fb6a6e39abdf6bf0277a1b33d99cc55900b526c9`). All 10 tasks (`01`–`10`) are archived under `.workflow/done/tech-debt-sweep/` and all 11 acceptance checks (`W1`–`W11`) pass:

- **Zero dead code (Task 01, W1):** `bun run dead-code` exits `0` with `0` unused files, `0` unused exports, `0` unused exported types, and `0` `knip.json` hints (down from 43 unused files, 168 unused exports, 118 unused exported types, and 7 hints). Deleted 36 unused UI modules, 6 unused Web server/API files, and dead exports/internalized helpers; declared `host-policy.ipc.child.ts` explicitly in `knip.json` with zero blanket ignore globs.
- **Zero lint warnings and guarded diff worker (Task 02, W2):** `bun run lint` exits `0` with `0` warnings across all 7 workspaces (all 12 `@openchamber/ui` `react-hooks/exhaustive-deps` warnings fixed without disable comments, and dead `topology.isVSCode` removed). `DiffWorkerProvider` catches `@pierre/diffs` pool initialization rejections and timeouts, logs once, and falls back to main-thread `PierreDiffViewer` rendering without unhandled rejections (`DiffWorkerProvider.test.tsx`: 5 pass; verified with blocked worker URLs in Web UI).
- **Debt ledger cleanup and contention-safe tests (Task 03, W3, W8):** Removed all 7 already-landed entries from `.workflow/technical-debt.md` and closed 3 open entries in code (Tasks 03, 05, 06). Replaced fixed `Bun.sleep(400)` / `Bun.sleep(1_200)` eviction windows in `packages/agent-service/src/supervisor/workers.capacity.test.ts` with `waitForEviction` / `expectNotEvictedFor` bounded polling and hold-file controls (`capacity-worker.mjs`), and replaced fixed setup waits in `canonical-plugins.test.js`, `git/service.test.js`, and `spaces/code-out.test.js`. Passed `5/5` consecutive runs (`12.52s`–`14.24s`) under concurrent Web suite load.
- **OMP TUI mirror and drift tests (Task 05, W5):** Projected `auto_compaction_start`, `manual_compaction_start`, `todo_auto_clear`, and `session.getTodoPhases()` into canonical `SessionSnapshot.{compacting,todos}`, `session.updated`, and `session.compacted` across all 15 locales; switched `TodoTray` to `useSessionTodos` and deleted `todoHistory.ts`. Added `packages/agent-service/src/worker/omp-mirror-drift.test.ts` covering all 89 OMP builtin slash commands and `InteractiveMode` plan/todo orchestration (passes on pinned OMP; fails on mutated command or plan-mode copies).
- **Per-session cache warming (Task 06, W6):** Implemented canonical `GET/PUT /api/agent/v1/sessions/:sessionId/cache-warming` with revision CAS, native `AgentSession` warming, Host persistence (`session-cache-warming.json`) and deletion cleanup, session context menu toggle, Settings field, and 15 locales (documented in `.workflow/omp-migration/contracts.md`). Verified on real Host that Session A stays warm (`idle`, `CacheWarmer` replay observed) while Session B stays cold, survives Host restart, and respects workspace override precedence.
- **Cold-path catalog revision guard (Task 07, W7):** Guarded `reapplyModelPolicies()` behind settings/credential revisions across `NativeModels`, `NativeAgents`, `native-runtime.ts`, and `stateless.ts`. Across 20 unchanged model selections, rebuilds dropped from `20` (`p50 69.01 ms`, total `1475.06 ms`) to `0` (`p50 1.80 ms`, total `137.91 ms`); 10 unprepared real-Host new chats measured `firstDeltaAfterSend` `p50 1952.95 ms -> 1685.77 ms`; staleness tests pass.
- **Mobile Linux toolchain and docs (Task 08, W9):** Updated `packages/mobile/scripts/with-mobile-env.mjs` to discover Linux JDK 21 and `~/Android/Sdk` / `/opt/android-sdk` instead of macOS Homebrew paths while preserving explicit env overrides (`node --test packages/mobile/scripts/`: 8 pass, 1 darwin skip). Updated `packages/mobile/{README,DOCUMENTATION,HANDOFF}.md` to remove stale M5 promises (`grep -rn 'planned for M5' packages/mobile`: 0 matches).
- **Closed finished efforts (Task 09, W10):** Accepted and closed `omp-native-chat`, `omp-native-parity`, `omp-through-m3`, `upstream-rebaseline`, and `ux-and-omp-parity-remediation` (`Status: done`, `done/<effort>/closeout.md`, `git merge-base --is-ancestor` confirmed onto `main`, `0` listed under `Ready to close`, pending-acceptance wording removed from `AGENTS.md`, `.workflow/development.md`, and `.workflow/omp-migration/README.md`).
- **Worktree and branch cleanup (Task 10, W11):** Removed 48 historical worktrees (+ `debt-10` post-review, `m4-integration.lock`, `m6-w5`) and 121 local branches (+ `tech-debt-sweep/10`), tagging every removed unmerged or content-landed tip under 84 `archive/*` tags (`task10/cleanup-ledger.tsv`). `git worktree list` retains only `main`, `tech-debt-sweep` integration, and active efforts (`ux-feedback-2026-11-15`, `rebrand`).

### Verification (Task 04, W4)

- **Full gate on `018dd9278f17f8374ce8bb0ba7f807679b863edd`** (`/home/shizuku/Project/ohpichamber-omp-artifacts/tech-debt-sweep-2026-11-18/task04/SUMMARY.txt`, all exit `0`):
  - `bun install --frozen-lockfile` (`2s`)
  - `bun run check` (`28s`, 5/5 guardrails)
  - `bun run type-check` (`30s`, 3,832 files / 5 projects)
  - `bun run lint` (`3s`, 0 warnings)
  - `bun run dead-code` (`21s`, 0 findings)
  - `bun run docs:validate` (`0s`, 696 pages / 58 links)
  - `VITEST_MAX_WORKERS=2 bun run test` (`678s`, 7/7 suites: `scripts` 31/31, `sdk` 32/32, `ui` 1,243/1,243, `agent-contract` 265 pass, `agent-service` 563 pass / 10 skip, `electron` 71/71, `web` 525 pass / 9 skip files with 8,582 pass / 142 skip tests)
  - `.workflow/bin/workflow validate` (`0s`, 0 errors / 0 warnings)
  - Workspace builds (`agent-contract`, `agent-service`, `sdk`, `web`): `111s`, exit `0`
- **Built Web real-path walkthrough on `127.0.0.1:4304`** (`task04/real-path-receipt.json`): verified project open (`/health` 200, `/api/agent/v1/ready` 200 `engine: "omp"`), real-provider turn (`CLIProxyAPI/gemini-4-hydrogen:low`), `PierreDiffViewer` render, per-session warming toggle and sibling isolation, and live-to-settled auto-compaction (`session.updated` -> `session.compacted`), with `0` console errors and `0` unhandled rejections.
- **Independent `flow-verify` effort-close review:** Pass across `7997867af1f4e8f3bc9fa00ec0c569f1670632c9..tech-debt-sweep/integration` (`reviewer-effort-close` Round 2 pass after `debt-10` cleanup and closeout cross-reference fixes; `reviewer-security` clean with 0 findings).

## Key decisions & plan changes

- **Restart from `main` (`.workflow/decisions.md` 2026-11-18):** Restarted `tech-debt-sweep` from `main` (`ad4d78dd57`) instead of merging the stale 2026-11-08 integration branch (archived under `archive/tech-debt-sweep-2026-11-08/*`).
- **Per-session cache warming (`.workflow/decisions.md` 2026-11-18):** Built per-session warming as a canonical Agent Service route and state overriding workspace mode, rather than keeping the 2026-10-29 deletion or adding a Host ping loop.
- **Close five landed efforts on recorded evidence (`.workflow/decisions.md` 2026-11-18):** Closed the five already-landed efforts using their archived evidence and later full gates instead of rerunning historical checks on old tips.
- **Keep spare workers at runtime prewarm (`.workflow/decisions.md` 2026-11-18):** Kept spare workers prewarming `NativeWorkerRuntime` without pre-calling `createAgentSession`, because `@oh-my-pi/pi-coding-agent` couples workspace session-graph discovery with bootstrap-bound `SessionManager`, `MCPManager`, `AgentRegistry.global()` `sessionFile`, and construction-time side effects.

## Waived checks & skipped reviews

None. All tasks `01`–`10` ran their checks and passed independent reviews without waivers or skips.

## Remaining debt & follow-ups

- **`.workflow/technical-debt.md` (1 entry):** `Cold new-chat first token waits on OMP session construction` (`Priority: only-if-grows`) — blocked on an upstream `@oh-my-pi/pi-coding-agent` two-phase session-graph seam (`prepareSessionGraph` / `hydrateSessionGraph` or late-bindable bindings); cold 600 ms first-delta budget remains waived per `decisions.md` (2026-11-15).
- **Accepted notes:**
  - `packages/ui/src/contexts/DiffWorkerProvider.tsx:391` retains `// oxlint-disable-next-line react/only-export-components` on `useWorkerPool` (react-refresh export-components directive; zero `exhaustive-deps` or lint warning suppressions).
  - Mobile device execution remains owned by `m7-release-verification`.
