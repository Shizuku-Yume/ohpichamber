# 02: Hide empty todo cards and the tray when no task is open

**Effort:** ux-feedback-2026-11-15
**Task type:** bugfix
**Blocked by:** None
**Covers:** W2
**Files:** `packages/ui/src/components/chat/{todoProgress.ts,TodoTray.tsx,TodoTray.test.tsx}`, `packages/ui/src/components/chat/message/parts/{TodoCard.tsx,TodoCard.test.tsx,ToolPart.tsx}`
**Read first:** spec "How it is built → Chat"; `research/feedback-2026-11-15/ChatRender.md` (A1–A3, fix A); `decisions.md` 2026-11-15 "The todo tray shows only while a task is open"
**Check:** `node scripts/run-isolated-tests.mjs packages/ui/src/components/chat/TodoTray.test.tsx packages/ui/src/components/chat/message/parts/TodoCard.test.tsx packages/ui/src/components/chat/ompStreamReplay.test.tsx` exits 0 with cases for `phases: []`, an empty phase, mixed phases, a branch switch and a cold read. Real path (Web or packaged app): a session ending in "Todo list cleared." shows no tray and no empty box, the expanded `todo` row shows only its text; a session whose plan is all completed shows no tray.

- [ ] `todoProgress.ts` exports `hasTodoTasks` and `hasOpenTodo`; the parsers stay faithful to OMP's data.
- [ ] `TodoCard` renders nothing when no phase has a task, for every caller.
- [ ] `TodoTray` renders only when a task is neither completed nor abandoned; the test that pinned `3/3` after completion flips.
- [ ] `ToolPart` shows a cleared or empty todo result as its text only.
