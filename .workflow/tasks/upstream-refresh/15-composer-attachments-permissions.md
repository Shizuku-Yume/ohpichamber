# 15: Composer, attachments and permissions

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Upstream's composer/editor, attachments, autocomplete, model controls, permission cards, forms, goals and queued messages work with the OMP session modes and message queue.

**Blocked by:** 10, 14, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/15.tsv` (112 paths: 64 clean/new, 46 both-side, 33 conflicts). Main locations: `packages/ui/src/components/chat/{composer,editor}`, composer components (`ChatInput`, `Form*`, `Permission*`, `SessionGoal*`, `QueuedMessagesStrip`, `ModelControls`), `packages/ui/src/components/inline-picker`, `packages/ui/src/lib/{magicPrompts,permissions,actions}`, and the server `magic-prompts`, `message-queue`, `permission-auto-accept`, `commands` modules. Deferred from task 10: `components/emoji/{EmojiAutocomplete.tsx,emojiInlinePicker.tsx,useEmojiPicker.tsx,useEmojiPicker.test.tsx,DOCUMENTATION.md}` and `components/ui/textarea.tsx` (need this task's `lib/emoji/shortcodes` and `components/inline-picker/*`). From task 23: consume the queue `goal` field and `setServerHold`, `stores/useSessionDraftsStore.ts`, `sync/user-message-resume.ts`, and `permissionModeForNewSession` where the composer/new-session path needs it.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; decisions.md: 2026-10-25 - Replace root agent selection with session modes.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the composer tests pass, and in the running app a file attaches and sends, a queued message goes out after the turn, a permission request is approved/denied and the prompt returns after a failed send, and a magic prompt inserts its text. Real path: one real provider turn.

## Done when

- [ ] The composer keeps the fork's session modes (main/plan/vibe/goal); no root agent picker returns.
- [ ] Permission decisions go to the Host/Agent Service authority, not only the UI.
- [ ] Drafts, attachments and queue survive reload where upstream says they do.
- [ ] Editor behavior (IME, Escape, PageUp/PageDown, paste) matches upstream tests.
- [ ] Emoji autocomplete/inline picker/textarea adopt upstream's files on the fork's shortcode and picker contracts; no fork copy remains.
- [ ] The queue `goal` field, `setServerHold`, `useSessionDraftsStore` and `user-message-resume` are consumed: a queued goal starts, drafts survive reload, and an archived root restores once after an accepted send.
- [ ] `permissionModeForNewSession` is used by the new-session path, not duplicated.
