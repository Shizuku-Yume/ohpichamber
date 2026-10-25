# 11: Send text attachments as OMP file mentions

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** A text attachment reaches the model as visible file content. An attachment that is too large, or a file that is not text or an image, is refused with a clear message before a run starts. Images behave as before.

**Blocked by:** None
**Files:** `packages/agent-service/src/worker/session.ts` (`prepare` attachment loop 358-370; drop the hidden `ohpichamber.attachment` message), `packages/web/server/lib/openchamber-sessions/routes.js` (`prepareDelivery` 120, `resolveAttachments`), Host attachment upload and document projection, `packages/ui/src/components/chat/ChatInput.tsx` (error toast), i18n.

**Read first:** spec "Attachments" and W10; `contracts.md` "Attachments, media, and URI privacy"; OMP 18.8.9 `session/messages.ts` `fileMention` conversion (1086-1124) and `modes/rpc/wire/rpc-wire.generated.ts` `FileMentionMessage` (220).
**Covers:** W10

**Check:** Before: a native worker test attaching `notes.txt` shows the fixture provider request without the file's text. After: `bun run --cwd packages/agent-service test` shows the request contains `<file path="notes.txt">` with the content and no host path in any projected event or snapshot; an image is still sent as an image. `bun run --cwd packages/web test` shows a 500,001-character text file, and a prompt whose text attachments total over 1,000,000 characters, get 413 `PAYLOAD_TOO_LARGE`, and a zip gets 400 `INVALID_REQUEST` naming the file, all with nothing queued or dispatched.

- [ ] Text detection: listed media types or Host-converted document text, valid UTF-8, no NUL byte.
- [ ] Limits are enforced at Host admission, so queued items can't fail later on size.
- [ ] `path` in the file mention is the attachment name; the client-visible attachment part keeps its `attachment://` URI.
- [ ] The composer shows the refusal and keeps the draft and its attachments.
