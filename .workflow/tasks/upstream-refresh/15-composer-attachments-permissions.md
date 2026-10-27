# 15: Composer, attachments and permissions

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 736f51cdc4

**Delivers:** Upstream's composer/editor, attachments, autocomplete, model controls, permission cards, forms, goals and queued messages work with the OMP session modes and message queue.

**Blocked by:** 10, 14, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/15.tsv` (112 paths: 64 clean/new, 46 both-side, 33 conflicts). Main locations: `packages/ui/src/components/chat/{composer,editor}`, composer components (`ChatInput`, `Form*`, `Permission*`, `SessionGoal*`, `QueuedMessagesStrip`, `ModelControls`), `packages/ui/src/components/inline-picker`, `packages/ui/src/lib/{magicPrompts,permissions,actions}`, and the server `magic-prompts`, `message-queue`, `permission-auto-accept`, `commands` modules. Deferred from task 10: `components/emoji/{EmojiAutocomplete.tsx,emojiInlinePicker.tsx,useEmojiPicker.tsx,useEmojiPicker.test.tsx,DOCUMENTATION.md}` and `components/ui/textarea.tsx` (need this task's `lib/emoji/shortcodes.ts` and `components/inline-picker`).

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

## Progress

**State: In progress.** Worktree `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-15` on branch `upstream-refresh/15` based on integration tip `736f51cdc4`.

### WIP committed (SHA: `f5ccb805d4`)

Adopted 68 files:
- 32 `new_adoptable` files: `AutocompleteRows.test.tsx`, `inputRedirect.{ts,test.ts}`, `pageNavigation.integration.test.tsx`, `useComposerDraft.retarget.test.ts`, `useDraftTarget.{pinnedDirectory,refresh}.test.tsx`, `useSessionDraftPublishing.ts`, `AutocompleteRowParts.tsx`, `ComposerActionButtons.test.tsx`, `LargeTextPasteChoice.{tsx,test.tsx}`, `usePlaceholderFitsOneLine.{ts,test.tsx}`, `useAutocompleteSelectionScroll.ts`, `inline-picker/*`, `magicPrompts.test.ts`, `projectActionSelection.{ts,test.ts}`, `server/lib/magic-prompts/*`.
- 32 `clean_live` files: `AppLinkConfirmDialog.tsx`, `ComposerStatusStrip.tsx`, `DraftPresetChips.tsx`, `QueuedMessagesStrip.{tsx,test.tsx}`, `composer/*` (references, editor dom/hostMouseDown/theme, keyboardPolicy, largeTextPasteOffer), `composer/state/*` (draft, target, tailInset, mobileShell, viewportPin), `composer/ui/*` (actionButtons, contextChips, floatingPanel, glassPopup, linkedReferenceRow), `magicPrompts.ts`, server `magic-prompts/{routes,runtime}.js`.
- 4 deferred emoji files from task 10: `components/emoji/{DOCUMENTATION.md,EmojiAutocomplete.tsx,emojiInlinePicker.tsx,useEmojiPicker.tsx,useEmojiPicker.test.tsx}` and `components/ui/textarea.tsx`.

### Exact remaining list for task 15

1. **`magicPrompts.ts` compatibility helper**: Re-export `renderMagicPrompt(template, variables)` as a thin wrapper over `loadMagicPrompts(null).render(...)` to satisfy existing fork callers (`useProjectTodoSend.ts`, `PlanView.tsx`, `ConflictDialog.tsx`, `IntegrateCommitsSection.tsx`, `gitApi.ts`, `fusion.ts`, `reviewFlow.ts`).
2. **Deference of OpenCode legacy dependencies**: Exclude `sessionReferences.ts` and `sessionReferences.test.ts` (defer to task 25/07 owner with `sessionMentionChips`).
3. **`ChatInput.tsx` adaptation**: Merge upstream 15 editor/composer changes while retaining the fork's session modes (main/plan/vibe/goal), canonical queue target, and permissions handling.
4. **Both-side conflict resolutions (46 paths)**:
   - `ModelControls.tsx` + `ModelControls.variant.behavior.test.tsx`: keep fork session modes, adopt upstream model variant/provider presentation.
   - `PermissionCard.tsx` + `PermissionCard.test.ts` + `PermissionDock.tsx`: keep canonical Host authorization authority, adopt upstream card presentation.
   - `FormCard.tsx` + `FormDock.tsx` + `FormFieldControl.tsx`: adopt upstream layout with fork form actions.
   - `SessionGoalRow.tsx`: integrate queue `goal` field.
   - `QueuedMessagesStrip.tsx` + `RevertedMessagesStrip.tsx`: integrate canonical queue target actions.
   - `BackgroundShellsStrip.tsx` + `FileAttachment.tsx` + `FileMentionAutocomplete.tsx`: merge upstream UX polish with canonical attachment/shell stores.
5. **Quality gates**:
   - `bun install --frozen-lockfile` (0)
   - `bun run type-check` (0)
   - `bun run lint` (0)
   - `bunx oxlint packages/ui/src/components/chat/{composer,editor,inline-picker,emoji}` (0)
   - focused composer/attachment/permission tests (0)
   - `bun run build` (0)
   - `bun run dead-code` (inspected against tip baseline)
   - root `VITEST_MAX_WORKERS=2 bun run test` (7/7 suites passed)
6. **Real path**:
   - Start dev server with isolated HOME/data and real provider (`CLIProxyAPI/gemini-3.8-flash`).
   - Exercise: file attachment send, queued message auto-send after turn, permission approval/denial, magic prompt expansion.
   - Capture screenshots.
7. **Landing**:
   - Archive `.workflow/tasks/upstream-refresh/15-composer-attachments-permissions.md` to `.workflow/done/`.
   - Fast-forward merge `upstream-refresh/15` into `upstream-refresh/integration`.
   - Delete worktree and branch.
