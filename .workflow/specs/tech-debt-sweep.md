# Post-M6 technical debt sweep: zero dead-code, zero lint warnings, flake hardening, and ledger/worktree hygiene

**Status:** in progress
**Priority:** normal
**Integration branch:** tech-debt-sweep/integration

## What this is for

Following M6 (`m6-audit-and-polish`), four concrete, bounded technical debt buckets remain on `main` (`2cd1a8c836`):
1. `bun run dead-code` (`knip`) exits `1` on 18 unused files (including retired relics such as `AgentSelector.tsx`, `vscodeNavigation.ts`, `WorkflowRunCard.tsx`, `workflow-activity.ts`, and `DesktopInstanceMenu.tsx`), 65 unused exports, 69 unused exported types, and 3 `knip.json` configuration hints.
2. `bun run lint` emits 5 `react-hooks(exhaustive-deps)` warnings in `@openchamber/ui` (`IntegrationsCatalogView.tsx`, `useTextareaInlinePicker.tsx`, `useSidebarGroupStatus.ts`, `ChatInput.tsx`), and M6's live browser walkthrough observed uncaught promise rejections from `@pierre/diffs` `WorkerPoolManager` initialization timeouts in `DiffWorkerProvider.tsx`.
3. `.workflow/technical-debt.md` still retains entries already resolved in P1 and M6 (`Session unread state has no OMP source`, `Session pins have no OMP source`, plus 4 earlier `Status: fixed` entries) alongside `Root test contention flakes under multi-suite load` (`workers.capacity.test.ts`).
4. Over 70 merged historical git worktrees and local task branches from M3–M5 remain under `/home/shizuku/Project/ohpichamber-worktrees/`.

Per `AGENTS.md`, the inherited upstream `anti-slop` backlog in untouched files is intentionally out of scope (never mass-fix or silence rules).

## What it does

- **Lane 1 (`01-dead-code-zero`):** Removes genuinely dead files, dead value exports, and dead type exports (preserving intentional public package contracts such as `@openchamber/sdk` via proper `knip.json` configuration where appropriate) and resolves the 3 `knip.json` configuration hints so `bun run dead-code` exits `0`.
- **Lane 2 (`02-ui-lint-warnings-and-diff-worker-guard`):** Fixes all 5 `@openchamber/ui` `react-hooks(exhaustive-deps)` warnings cleanly without disabling lint rules, and guards `@pierre/diffs` `WorkerPoolManager` initialization in `DiffWorkerProvider.tsx` so worker startup timeouts degrade cleanly without uncaught promise rejections.
- **Lane 3 (`03-debt-ledger-capacity-flake-and-worktrees`):** Reconciles `.workflow/technical-debt.md` per its contract (removing fixed entries, recording declined `Per-session warming` in `decisions.md` if needed), hardens `packages/agent-service/src/supervisor/workers.capacity.test.ts` eviction polling against multi-suite CPU contention, and prunes clean historical worktrees/branches already merged into `main`.
- **Final Gate (`04-tech-debt-integration-gate`):** Verifies `bun run dead-code`, `bun run lint` (0 warnings), `bun run type-check`, `bun run docs:validate`, and `VITEST_MAX_WORKERS=2 bun run test` all exit `0` on `tech-debt-sweep/integration`.

## How it is built

- Each lane runs in an isolated worktree under `/home/shizuku/Project/ohpichamber-worktrees/debt-w*` with disjoint file ownership and merges into `tech-debt-sweep/integration` (`/home/shizuku/Project/ohpichamber-worktrees/debt-integration`), leaving `main` untouched while desktop packaging and maintainer hands-on testing run concurrently.

## What it must not do

- Mass-edit untouched upstream files for the inherited `anti-slop` backlog, silence linter rules, or weaken `knip.json` with blanket ignore globs.
- Delete dirty or unmerged worktrees/branches without verifying ancestry against `main`.

## How we will know it works

- **W1 (Zero Dead Code).** `bun run dead-code` exits `0` with 0 unused files, 0 unused exports, 0 unused types, and 0 configuration hints.
- **W2 (Zero Lint Warnings & Guarded Diff Worker).** `bun run lint` exits `0` with 0 warnings across all workspaces, and `DiffWorkerProvider` unit tests prove worker initialization timeout rejections are caught and degraded cleanly.
- **W3 (Clean Debt Ledger, Contention-Safe Capacity Test & Clean Worktrees).** `.workflow/technical-debt.md` contains no stale fixed entries, `workers.capacity.test.ts` passes 5 consecutive runs under load, and merged historical worktrees are pruned safely.
- **W4 (Full Workspace Gate).** `bun run dead-code`, `bun run type-check`, `bun run lint`, `bun run docs:validate`, `VITEST_MAX_WORKERS=2 bun run test`, and `.workflow/bin/workflow validate` all exit `0`.
