# Technical debt sweep: zero dead code and lint warnings, every debt entry closed, finished efforts closed, stale worktrees gone

**Status:** in progress
**Priority:** high
**Integration branch:** tech-debt-sweep/integration

## What this is for

The first sweep (2026-11-08, cut from `2cd1a8c836`) landed three tasks on its integration branch and never reached `main`; by 2026-11-18 that branch was 1,509 commits behind and its numbers were stale. The maintainer asked on 2026-11-18 to finish the debt instead of carrying it: fix every open `technical-debt.md` entry and delete the fixed ones, close the efforts whose work already landed, and clean the worktrees and branches left behind. The sweep restarts from `main` at `ad4d78dd57`; the old branch is kept as tag `archive/tech-debt-sweep-2026-11-08` (decisions.md 2026-11-18).

What `main` carries today (task 13 gate logs of `ux-feedback-2026-11-15`, `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task13/gate/`):

1. `bun run dead-code` exits 1: 43 unused files, 168 unused exports, 116 unused exported types, 7 `knip.json` hints (`final-07-dead-code.log`).
2. `bun run lint` exits 0 with 12 `react-hooks(exhaustive-deps)` warnings in `@openchamber/ui` (`final-03-lint.log`). `DiffWorkerProvider.tsx:118` still calls `void pool.initialize()` with no rejection handling.
3. `technical-debt.md` holds 11 entries. Seven are fixed on `main` and only need deleting: session unread state, session pins, workspace listing isolation, session parent link, turn elapsed time, Host tool error codes, relocation/archive race. Four are open:
   - root test contention: `workers.capacity.test.ts` still sleeps fixed windows in two eviction tests (`:146-160`, `:195-202`);
   - per-session cache warming: no canonical route; deleted 2026-10-29 pending this implementation;
   - OMP TUI-owned behaviors: `auto_compaction_start` and `todo_auto_clear` are not consumed, todos come from transcript details instead of `session.getTodoPhases()`, and the plan-mode mirror and the 30-entry builtin command allowlist have no drift test against the pinned OMP;
   - cold new-chat first token: `catalog-models.ts:733` rebuilds the offline catalog on every selection; spares cannot build a session graph ahead.
4. Five efforts have every task archived and their code on `main`, but their specs still say `in progress`: `omp-native-chat`, `omp-native-parity`, `omp-through-m3`, `upstream-rebaseline`, `ux-and-omp-parity-remediation`.
5. About 45 worktrees and 130 local branches from M3 through `ux-v270-omp-alignment` remain; some are merged, some hold commits whose content landed through other merges, a few are dirty.
6. Mobile is adapted to the Host and Canonical Client (audit 2026-11-18), with two source leftovers: `packages/mobile/scripts/with-mobile-env.mjs` defaults `JAVA_HOME`/`ANDROID_HOME` to macOS Homebrew paths on Linux, and `packages/mobile/README.md` still says Guest iframes are "planned for M5". Device runs stay with M7.

## What it does

- **Debt entries:** each open entry is fixed by its own task, which deletes the entry in its commit. Fixed entries are deleted. The ledger ends with no entries, or with an entry only where the fix needs an upstream OMP change, recorded as a decision with its revisit condition.
- **Dead code and lint:** `bun run dead-code` and `bun run lint` exit 0 with zero findings and zero warnings, without blanket ignores or disabled rules.
- **Per-session cache warming:** the Agent Service gets a canonical session-level warming route and state; the session menu toggle and the Settings field are rebuilt on it, in all 15 locales.
- **OMP TUI mirror:** the projection consumes `auto_compaction_start` and `todo_auto_clear`; todos come from OMP's todo state; upgrade-time tests fail when the pinned OMP's plan-mode steps or slash commands drift from the fork's mirror.
- **Cold path:** catalog policies reapply only when settings or credentials change; the session-construction cost is either removed inside the fork or recorded with the OMP seam it needs.
- **Mobile leftovers:** Linux toolchain defaults and the stale README note are fixed.
- **Closing finished efforts:** the five specs get closeout records and `Status: done`; `AGENTS.md` and `development.md` stop calling their acceptance pending.
- **Worktrees and branches:** merged worktrees and branches are removed; unmerged tips are tagged under `archive/` before removal; dirty worktrees are inspected and either landed or recorded and tagged. Running efforts (`ux-feedback-2026-11-15`, `rebrand`) and this effort's own worktrees are untouched.

## How it is built

- Integration branch `tech-debt-sweep/integration`, worktree `/home/shizuku/Project/ohpichamber-worktrees/debt-integration`, cut from `main`. Each task runs in `/home/shizuku/Project/ohpichamber-worktrees/debt-NN` and merges into the integration branch under `/tmp/debt-integration.lock`.
- Task 01 (dead code) runs after every code task so it sees their exports; task 10 (worktree cleanup) runs after every other task; task 04 is the final gate.
- The integration branch lands on `main` at `flow-close`, after the maintainer accepts.

## What it must not do

- Silence lint rules, weaken `knip.json` with blanket ignore globs, or mass-edit untouched files for the `anti-slop` backlog.
- Delete a branch or worktree whose commits are not on `main` without first tagging its tip under `archive/`.
- Touch `ohpichamber-worktrees/fb15-*`, `rebrand-*`, or the branches of `ux-feedback-2026-11-15` and `rebrand`, which are running in other sessions.
- Edit `changelog/` or `CHANGELOG.md`.

## How we will know it works

- **W1 (Zero dead code).** `bun run dead-code` exits 0 with no unused files, exports, types or configuration hints.
- **W2 (Zero lint warnings, guarded diff worker).** `bun run lint` exits 0 with no warnings; a `DiffWorkerProvider` test proves an initialization timeout or rejection degrades without an unhandled rejection.
- **W3 (Contention-safe tests).** `workers.capacity.test.ts` has no fixed-sleep eviction windows and passes 5 consecutive runs while another root suite runs.
- **W4 (Full gate).** `bun run check`, `bun run type-check`, `bun run lint`, `bun run dead-code`, `bun run docs:validate`, `VITEST_MAX_WORKERS=2 bun run test` and `.workflow/bin/workflow validate` exit 0 on the integration tip.
- **W5 (OMP TUI mirror).** An automatic compaction shows its live state in the transcript before it finishes; a todo list OMP auto-clears disappears from the tray; the drift tests fail when the pinned OMP's plan-mode steps or slash commands change, and pass on the pinned version.
- **W6 (Per-session warming).** On the real Host, toggling warming for one session keeps that session's worker warm (observed through the canonical state and worker activity) while another session in the same workspace stays cold; the toggle survives a Host restart; the workspace control still works.
- **W7 (Cold path).** Repeated model selections with unchanged settings skip the catalog rebuild (measured); a settings or credential change still refreshes it (existing staleness tests pass). The first-token latency of an unprepared new chat is measured before and after.
- **W8 (Debt ledger).** `technical-debt.md` has no fixed entry left; any entry that remains names an upstream OMP change and has a matching decision.
- **W9 (Mobile leftovers).** `with-mobile-env.mjs` picks Linux paths on Linux and macOS paths on macOS, with a test; the README no longer promises M5 work.
- **W10 (Efforts closed).** `.workflow/bin/workflow next --no-color` lists none of the five efforts under `Ready to close`, each has `done/<effort>/closeout.md`, and `AGENTS.md` no longer says their acceptance is pending.
- **W11 (Worktrees and branches).** `git worktree list` shows only `main`, running efforts' worktrees and this effort's integration worktree; every removed unmerged tip has an `archive/` tag; the removal list is in the evidence directory.
