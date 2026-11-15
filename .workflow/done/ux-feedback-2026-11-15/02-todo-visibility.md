# 02: Hide empty todo cards and the tray when no task is open

**Effort:** ux-feedback-2026-11-15
**Task type:** bugfix
**Blocked by:** None
**Covers:** W2
**Files:** `packages/ui/src/components/chat/{todoProgress.ts,TodoTray.tsx,TodoTray.test.tsx}`, `packages/ui/src/components/chat/message/parts/{TodoCard.tsx,TodoCard.test.tsx,ToolPart.tsx}`
**Read first:** spec "How it is built → Chat"; `research/feedback-2026-11-15/ChatRender.md` (A1–A3, fix A); `decisions.md` 2026-11-15 "The todo tray shows only while a task is open"
**Check:** `node scripts/run-isolated-tests.mjs packages/ui/src/components/chat/TodoTray.test.tsx packages/ui/src/components/chat/message/parts/TodoCard.test.tsx packages/ui/src/components/chat/ompStreamReplay.test.tsx` exits 0 with cases for `phases: []`, an empty phase, mixed phases, a branch switch and a cold read. Real path (Web or packaged app): a session ending in "Todo list cleared." shows no tray and no empty box, the expanded `todo` row shows only its text; a session whose plan is all completed shows no tray.
**Base commit:** f68a30f8628fe696ac6c54493a61597e72be890d

- [x] `todoProgress.ts` exports `hasTodoTasks` and `hasOpenTodo`; the parsers stay faithful to OMP's data.
- [x] `TodoCard` renders nothing when no phase has a task, for every caller.
- [x] `TodoTray` renders only when a task is neither completed nor abandoned; the test that pinned `3/3` after completion flips.
- [x] `ToolPart` shows a cleared or empty todo result as its text only.

## Progress

- **Check before:** none captured; no pre-fix baseline run or screenshot was taken. The real path was probed only after the change, so the four boxes rest on the post-fix cases and the evidence bundle below.
- **Work:**
  - `packages/ui/src/components/chat/todoProgress.ts`: added `hasTodoTasks` (any phase carries a task) and `hasOpenTodo` (any task is not completed or abandoned) beside `isClosedTodo`; `activeTodoTask` now prefers a blocked task over a closed one (`firstPending ?? firstBlocked ?? lastClosed`) so a blocked-only plan names its task instead of a blank row beside `0/1`, and its comment says a finished plan leaves the tray while the tool card still names what it finished.
  - `message/parts/TodoCard.tsx`: returns `null` when `!hasTodoTasks(phases)`, after the hooks, for every caller; header and `0/N` markup unchanged.
  - `TodoTray.tsx`: renders only when `phases && hasTodoTasks(phases) && hasOpenTodo(phases)`; the `loadComplete` cold-read effect is unchanged, and the comment states the row shows only while a task is open.
  - `message/parts/ToolPart.tsx`: the `isTodoTool` block renders `TodoCard` only when `phases && hasTodoTasks(phases)`. `ToolExpandedContent` has no todo-specific suppression, so a cleared or empty result falls through to its text branch and the expanded row shows only `Todo list cleared.` / `Todo list is empty.`; no extra change was needed there.
  - `extractTodoPhases` / `latestTodoPhases` still return OMP's data unfiltered; the display rule lives in the components.
  - Tests in `TodoTray.test.tsx` and `TodoCard.test.tsx` (written by the effort's tests worker) pin `phases: []`, an emptied phase, mixed phases, all-completed/all-abandoned, a branch switch and a cold read, and flip the old `3/3`-after-completion expectation.
  - No `DOCUMENTATION.md` in `packages/ui/src/components/chat` claimed the tray persists after completion, so no doc edit was needed.
- **Check after:**
  - The task's literal Check does not run: `node scripts/run-isolated-tests.mjs <file…>` exits 1 with `run-isolated-tests: not a directory: packages/ui/src/components/chat/TodoTray.test.tsx` because the runner takes directories only. Ran the equivalent instead: `VITEST_MAX_WORKERS=2 node scripts/run-isolated-tests.mjs packages/ui/src/components/chat` (the directory owning all three named files) exits 0 with **235/235 test files passed**.
  - Per-file totals from `cd packages/ui && bun test <file>`: `TodoTray.test.tsx` 12 pass / 0 fail, `message/parts/TodoCard.test.tsx` 9 pass / 0 fail, `ompStreamReplay.test.tsx` 5 pass / 0 fail; the three together 26 pass / 0 fail.
  - `bunx oxlint` on the changed TS/TSX paths: 0 findings. `bun run --cwd packages/ui type-check`: no type errors in 3,534 files across 2 projects. `bun run dead-code` exits 1 on the effort's pre-existing baseline (43 unused files, unused exported types) and lists no finding for `hasTodoTasks` or `hasOpenTodo`; `TodoProgress` stays as a pre-existing unused-type entry.
  - Real path (Web on port 41420, isolated `HOME`/data dir, fixtures copied, never opened in place): a cleared row (`Todo list cleared.`, `details.phases: []`) and an empty row (`Todo list is empty.`) expand to their text with 0 `todo-card` elements and no bordered box; rows whose snapshot has tasks keep their `TodoCard`; an all-completed plan (session C) shows no tray; a session with an open task (B) keeps its `2/3` tray. Session A's cleared rows sit more than 90 messages behind the head, so no such row mounts there; fixture D covers the expanded cleared row instead. Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task02/` (`receipt.json`, `check-log.txt`, `verified-session{A,B,C}-*.png`, `expanded-session{B-empty,B-card,D-cleared}.png`, `run-realpath.sh`).
  - Known non-blocking gap: no `ToolPart`-level test, so box 4 rests on the `TodoCard` case plus the real path.
- **Review:** pass (`fb15-02-reviewer`, a read-only worker that wrote none of the code, reviewed the diff against base `f68a30f862` with the task file, the spec, `decisions.md` and `AGENTS.md`: no blocking findings. Its non-blocking items were applied — removed a tautology, reworded the `activeTodoTask` comment, and made a blocked-only plan name its blocked task).
