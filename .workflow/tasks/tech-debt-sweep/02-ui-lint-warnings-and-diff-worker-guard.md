# 02: Zero lint warnings and a guarded diff worker

**Effort:** tech-debt-sweep
**Task type:** bugfix
**Blocked by:** None
**Covers:** W2
**Files:** `packages/ui/src/contexts/DiffWorkerProvider.tsx` (+ new test); the files with `react-hooks(exhaustive-deps)` warnings: `ChatInput.tsx`, `ContextPanelRail.tsx`, `useTextareaInlinePicker.tsx`, `MessageBody.tsx`, `NewWorktreeDialog.tsx`, `useSidebarGroupStatus.ts`, `SessionProjectCollection.tsx`, `TodoSendDialog.tsx`, `OfficeArtifact.tsx`, `MarkdownRendererImpl.tsx`
**Read first:** `.workflow/specs/tech-debt-sweep.md` (item 2); `.agents/skills/performance-engineering/SKILL.md` and `.agents/skills/sync-state-invariants/SKILL.md` for hooks on hot or sync paths; `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task13/gate/final-03-lint.log`; prior art on tag `archive/tech-debt-sweep-2026-11-08` commit `35dc6718b2` (read only, do not cherry-pick)
**Check:** `bun run lint 2>&1 | tee /tmp/debt02-lint.log; ! grep -qE ': warning ' /tmp/debt02-lint.log && bun run --cwd packages/ui type-check && VITEST_MAX_WORKERS=2 bun run --cwd packages/ui test` → no `: warning ` line in the lint output, type-check and UI tests exit 0; real path: open a diff in the Web UI on the task port and confirm it renders, then force a worker init failure (devtools: block the worker URL) and confirm no `Unhandled promise rejection` in the console.

- [ ] Every `exhaustive-deps` warning is fixed by correcting the dependency list or restructuring the effect/memo, never by an eslint/oxlint disable comment. Each fix keeps behavior: stale-closure risks are covered by the existing tests or a new focused test.
- [ ] `DiffWorkerProvider` catches pool initialization rejection and timeout, falls back to the non-worker render path, and logs once; a unit test proves both.
- [ ] Rerun lint on the integration tip before landing; warnings added by other tasks meanwhile are fixed here too.
