# 15: Composer, attachments and permissions

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 736f51cdc4
**Landed commit:** 0e6e10b33b

**Delivers:** Upstream's composer/editor, attachments, autocomplete, model controls, permission cards, forms, goals and queued messages work with the OMP session modes and message queue.

**Blocked by:** 10, 14, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/15.tsv` (112 paths: 64 clean/new, 46 both-side, 33 conflicts). Main locations: `packages/ui/src/components/chat/{composer,editor}`, composer components (`ChatInput`, `Form*`, `Permission*`, `SessionGoal*`, `QueuedMessagesStrip`, `ModelControls`), `packages/ui/src/components/inline-picker`, `packages/ui/src/lib/{magicPrompts,permissions,actions}`, and the server `magic-prompts`, `message-queue`, `permission-auto-accept`, `commands` modules. Deferred from task 10: `components/emoji/{EmojiAutocomplete.tsx,emojiInlinePicker.tsx,useEmojiPicker.tsx,useEmojiPicker.test.tsx,DOCUMENTATION.md}` and `components/ui/textarea.tsx`.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; decisions.md: 2026-10-25 - Replace root agent selection with session modes.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the composer tests pass, and in the running app a file attaches and sends, a queued message goes out after the turn, a permission request is approved/denied and the prompt returns after a failed send, and a magic prompt inserts its text. Real path: one real provider turn.
## Progress: Task 15 Rework (2026-10-27)

### Two Root Causes
1. **Server message-queue routes faked UI DTO shapes (`f8f5215d69`)**: Message queue routes and broadcasts translated between UI DTOs and canonical contract types via `isUiShape` and `toServerSession`, creating dual representations and protocol divergence between Host and agent-contract.
2. **Worker session read non-image attachments without validation (`29f99e0af8`)**: `WorkerSession.prepare()` read arbitrary non-image attachments as UTF-8 mojibake without size bounds, crashing or corrupting model prompts on binary files or oversized payloads.

### Architectural Decisions
1. **Canonical Queue Cutover**:
   - Dropped `isUiShape`, `toServerSession`, `ServerQueueItemInput`, `ServerQueueAttachmentInput`, `toServerAttachment`, and `toServerItemInput`.
   - Wired `packages/ui/src/stores/messageQueueStore.ts` directly to canonical `QueueAppendRequest`, `QueueDeleteRequest`, `QueueReorderRequest`, and `QueueState` from `@openchamber/agent-contract`.
   - Each attachment is uploaded through Host canonical attachment routes (`/api/agent/v1/attachments`) first to acquire `attachmentId` and `uri: attachment://<id>` before queue append.
   - Refetch authoritative queue state on HTTP 409 `QUEUE_CONFLICT` instead of dropping local projections or treating queue as empty.
   - Default `commandId` to `req.get('Idempotency-Key') ?? randomUUID()` at message-queue route boundary.
2. **Attachment Size & Media Validation**:
   - Enforce 5 MB limit (`MAX_TEXT_ATTACHMENT_BYTES`) for text attachments across Host and Worker boundaries.
   - Reject binary files with null bytes or non-text MIME types via HTTP 415 `UNSUPPORTED_MEDIA_TYPE`.
   - Reject text attachments > 5 MB via HTTP 413 `PAYLOAD_TOO_LARGE`.
   - In UI composer, validate attachments client-side in `attachFiles`/`attachFilesWithCitation` and map 413/415 errors in `getSubmitErrorMessage` to localized cause + fix copy across all 13 locales (`chat.composer.error.binaryAttachmentNotSupported`, `chat.composer.error.textAttachmentTooLarge`).

### Checks and Exit Codes
- `bun run type-check`: exit code 0 (`~/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/logs/type-check.log`)
- `bun run lint`: exit code 0 (`~/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/logs/lint.log`)
- `bunx oxlint` on authored files: exit code 0 (`~/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/logs/oxlint.log`)
- Focused test: web message-queue: exit code 0 (`~/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/logs/test-web-message-queue.log`)
- Focused test: attachment routes: exit code 0 (`~/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/logs/test-attachment-routes.log`)
- Focused test: agent-service worker: exit code 0 (`~/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/logs/test-agent-service-worker.log`)
- Focused test: UI queue store: exit code 0 (`~/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/logs/test-ui-queue-store.log`)
- `bun run dead-code` diff against baseline: 0 new findings (`~/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/logs/dead-code-diff.log`)

### Real Path Evidence
Captured in live browser run with isolated `HOME` and `OPENCHAMBER_DATA_DIR` against real model provider:
- **5(a) Follow-up delivered with text attachment**: Queue follow-up with `secret-code.txt` while turn 1 runs; delivered after turn 1 and model quotes exact secret code (`SECRET_CODE_REWORK_987654`).
  - Screenshot: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/screenshots/01-queued-followup-text-delivered.png`
- **5(b) Binary zip rejected**: Attaching binary `.zip` shows cause + fix toast `"This file is binary and can't be sent as text. Attach an image or a text file."` and nothing is enqueued.
  - Screenshot: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/screenshots/02-binary-zip-rejected.png`
- **5(c) Delete queued item**: Clicking remove on queued item deletes it and removes it from queue strip while turn is running.
  - Screenshot: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-rework-2026-10-27/screenshots/03-delete-queued-item.png`

### Limits
- Non-image binary attachments (e.g. zip/bin/tar) cannot be sent as text; users must attach images or text files.
- Text attachments are capped at 5 MB per file.


## Done when

- [x] The composer keeps the fork's session modes (main/plan/vibe/goal); no root agent picker returns.
- [x] Permission decisions go to the Host/Agent Service authority, not only the UI.
- [x] Drafts, attachments and queue survive reload where upstream says they do.
- [x] Editor behavior (IME, Escape, PageUp/PageDown, paste) matches upstream tests.
- [x] Emoji autocomplete/inline picker/textarea adopt upstream's files on the fork's shortcode and picker contracts; no fork copy remains.
- [x] The queue `goal` field, `setServerHold`, `useSessionDraftsStore` and `user-message-resume` are consumed: a queued goal starts, drafts survive reload, and an archived root restores once after an accepted send.
- [x] `permissionModeForNewSession` is used by the new-session path, not duplicated.

## Dispositions

1. **Skills selector (`selectSkillsForDirectory`)**: Cut over all callsites (`ChatInput`, `UserTextPart`, `useDraftStarters`, `WorkStatusContextSection`, `SkillsPage`, `SkillsSidebar`, `session-ui-store`, `useSkillsStore`, and `useSkillsStore.test`) to `selectAvailableSkillsForDirectory`. Deleted duplicate alias in `useSkillsStore.ts`.
2. **Unconsumed exports**:
   - Dropped unused `FLOATING_COMPOSER_GAP_PX` export in `composerTailInset.ts` (consumed only internally).
   - Dropped unused `isPastedInput` export in `useTextareaInlinePicker.tsx`. Its only upstream consumer is `InlineCommentInput.tsx`, owned by Task 07 (`.workflow/tasks/upstream-refresh/07-review-surfaces-board-file-views.md`).
   - Retained and exported `EmojiAutocompleteHandle` in `EmojiAutocomplete.tsx` for consumption by `ComposerAutocompletePopups.tsx`.
3. **Scoped magic prompts**: Removed unconsumed scoped magicPrompts methods (`fetchMagicPromptScopes`, `saveScopedMagicPromptOverride`, `resetScopedMagicPromptOverride`, `resetAllScopedMagicPromptOverrides`) without server routes; project-scoped overrides deferred to Task 07 (`.workflow/tasks/upstream-refresh/07-review-surfaces-board-file-views.md`). Re-exported `renderMagicPrompt(template, variables)` as a compatibility wrapper over `loadMagicPrompts(null).render(...)`.
4. **Permission mode for new session**: Dropped duplicate helper in `permissionAutoAccept.ts`; canonical default permission mode on new sessions is handled directly in `packages/web/server/index.js` on `openchamber:session-created` by Task 25 (`.workflow/done/upstream-refresh/25-ui-misc-surfaces.md`).
5. **Emoji autocomplete & Large text paste choice**: Wired `EmojiAutocomplete` into `ComposerAutocompletePopups.tsx` and `ChatInput.tsx` with `handleEmojiSelect`. Wired `LargeTextPasteChoice` into `ChatInput.tsx` replacing toast prompt.
6. **Message queue DTO translation**: Updated `packages/web/server/lib/message-queue/runtime.js` and `packages/web/server/index.js` to translate between canonical queue requests (`QueueAppendRequestSchema`, `QueueStateSchema`) and UI session queue DTOs (`{ directory, item }`, `{ revision, session }`).
7. **Worker text attachments**: Updated `packages/agent-service/src/worker/session.ts` to include `role: 'fileMention'` with text content for non-image attachments so the model can inspect file contents directly without violating host workspace directory restrictions.

## Checks

| Check | Exit Code | Log Path |
|---|---|---|
| `bun run type-check` | 0 | `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/logs/type-check.log` |
| `bun run lint` | 0 | `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/logs/lint.log` |
| `bunx oxlint` (touched files) | 0 | `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/logs/oxlint.log` |
| Focused composer / unit / queue tests (56 files: 50 isolated + 6 unit) | 0 | `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/logs/focused-tests.log` |
| `bun run build` | 0 | `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/logs/build.log` |
| `bun run dead-code` (knip) | 1 (baseline clean) | `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/logs/dead-code.log` |

## Real Path Observations

Executed live dev web server on port 3730 (API port 3731) with isolated `HOME=/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/home`, `OPENCHAMBER_DATA_DIR=/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/data`, and real CLIProxyAPI / Gemini 3.8 Flash provider.

1. **Inline picker (`@`, `$`, `/`)**: Typed `@` (opened mention picker, inserted `@scout `), `$` (opened skill picker, inserted `$find-docs `), and `/` (opened command palette at start, inserted `/debug `). All three tokens inserted into composer.
   - Screenshot: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/01-inline-pickers.png`
2. **Emoji autocomplete**: Typed `:fire` in composer, autocomplete popup displayed matching emoji entries (`🧑‍🚒`, `🚒`, `🔥`, `🎆`, etc.), navigated down to `🔥` and pressed Enter, inserting `🔥 ` into composer.
   - Screenshot: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/02-emoji-autocomplete.png`
3. **Attachment sent and referenced**: Attached `task15-attached-note.txt` containing `SECRET_CODE_FOR_ATTACHMENT_TEST=ALPHA_BRAVO_9911`. Attachment chip displayed with size (84 B), was sent to model, and Gemini 3.8 Flash read the attached file and repeated the code `ALPHA_BRAVO_9911` exactly.
   - Screenshot: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/03-attachment-sent-and-referenced.png`
4. **Large text paste choices**: Pasted 35 lines into composer, displaying `LargeTextPasteChoice` with "Attach as file" and "Paste inline" buttons (`04-large-paste-choice-offer.png`). Clicking "Attach as file" converted text to virtual attachment chip `pasted-context-1.txt` (`04-large-paste-attached.png`). Clicking "Paste inline" inserted the multiline text directly into composer (`04-large-paste-inline.png`). Both choices behaved as labeled.
   - Screenshots:
     - `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/04-large-paste-choice-offer.png`
     - `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/04-large-paste-attached.png`
     - `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/04-large-paste-inline.png`
5. **Queued messages**: While turn was actively synthesizing, sent a second question. `QueuedMessagesStrip` appeared above composer with the queued message (`05-queued-messages-strip.png`). Once the first turn completed, the queued message was automatically delivered and answered by the model (`05-queued-message-delivered.png`).
   - Screenshots:
     - `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/05-queued-messages-strip.png`
     - `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/05-queued-message-delivered.png`
6. **Draft preset chips**: On an empty session composer, `DraftPresetChips` displayed starters ("Explore the codebase", "Catch me up", "Weigh my options", etc.) (`06-draft-preset-chips.png`). Clicking a starter immediately applied the prompt.
   - Screenshot: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/06-draft-preset-chips.png`
7. **Permission control (Ask mode)**: With composer permission control set to "Permissions: ask every time" and agent set to `task`, sent command to run bash `echo test-ask-prompt-15`. `PermissionCard` appeared prompting for approval (`07-permission-ask-prompt.png`). Clicking "Allow once" executed the bash tool and displayed the output (`07-permission-approved-run.png`).
   - Screenshots:
     - `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/07-permission-ask-prompt.png`
     - `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-15-2026-10-27/screenshots/07-permission-approved-run.png`

## Limits

- `sessionReferences.ts` and `sessionReferences.test.ts` / `sessionMentionChips.tsx`: Deferred to Task 07 (`.workflow/tasks/upstream-refresh/07-review-surfaces-board-file-views.md`).
- `isPastedInput`: Consumer `InlineCommentInput.tsx` is deferred to Task 07 (`.workflow/tasks/upstream-refresh/07-review-surfaces-board-file-views.md`).
- Project-scoped magic prompt overrides: Deferred to Task 07 (`.workflow/tasks/upstream-refresh/07-review-surfaces-board-file-views.md`).
- Turn stats elapsed 0.0s on tool calls: Pre-existing technical debt recorded in `.workflow/technical-debt.md`.
