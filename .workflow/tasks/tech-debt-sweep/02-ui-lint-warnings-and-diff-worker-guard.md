# 02: Resolve UI React Hook lint warnings and guard DiffWorkerProvider worker initialization timeouts

**Effort:** tech-debt-sweep
**Task type:** bugfix
**Blocked by:** None
**Covers:** W2
**Files:** `packages/ui/src/components/views/IntegrationsCatalogView.tsx`; `packages/ui/src/components/inline-picker/useTextareaInlinePicker.tsx`; `packages/ui/src/components/session/sidebar/list/useSidebarGroupStatus.ts`; `packages/ui/src/components/chat/ChatInput.tsx`; `packages/ui/src/contexts/DiffWorkerProvider.tsx`; `packages/ui/src/contexts/DiffWorkerProvider.test.tsx`
**Read first:** `.workflow/specs/tech-debt-sweep.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-gate-2026-11-07/receipts/gate-lint.log`; `.workflow/done/m6-audit-and-polish/closeout.md`; `.agents/skills/openchamber-change-discipline/SKILL.md`
**Check:** `bun run lint 2>&1 | tee /tmp/debt-w2-lint.log && ! grep -q 'warning' /tmp/debt-w2-lint.log && bun test packages/ui/src/contexts/DiffWorkerProvider.test.tsx packages/ui/src/components/session/sidebar/list/useSidebarGroupStatus.test.tsx && bun run --cwd packages/ui type-check` → exits 0 with 0 lint warnings and verified DiffWorkerProvider timeout fallback.

- [ ] Fix all 5 `react-hooks(exhaustive-deps)` warnings in `IntegrationsCatalogView.tsx` (lines 382, 397), `useTextareaInlinePicker.tsx` (line 47), `useSidebarGroupStatus.ts` (line 105), and `ChatInput.tsx` (line 1587) without `eslint-disable` / `oxlint-disable` comments.
- [ ] Inspect `packages/ui/src/contexts/DiffWorkerProvider.tsx` where `@pierre/diffs` `WorkerPoolManager` initializes workers and attach proper rejection handling / graceful fallback when `WorkerPoolManager` initialization times out after 10000ms so long-lived pages never emit uncaught promise rejections.
- [ ] Add a deterministic unit test in `packages/ui/src/contexts/DiffWorkerProvider.test.tsx` proving worker initialization timeout/rejection is caught cleanly without unhandled rejections.
