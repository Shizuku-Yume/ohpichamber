# 11: Send text attachments as OMP file mentions

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** bc2a893dc17f271487a89153c819e16ef98cca5d
**Started:** 2026-10-26T00:00:00Z

**Delivers:** A text attachment reaches the model as visible file content. An attachment that is too large, or a file that is not text or an image, is refused with a clear message before a run starts. Images behave as before.

**Blocked by:** None
**Files:** `packages/agent-service/src/worker/session.ts` (`prepare` attachment loop 358-370; drop the hidden `ohpichamber.attachment` message), `packages/web/server/lib/openchamber-sessions/routes.js` (`prepareDelivery` 120, `resolveAttachments`), Host attachment upload and document projection, `packages/ui/src/components/chat/ChatInput.tsx` (error toast), i18n.

**Read first:** spec "Attachments" and W10; `contracts.md` "Attachments, media, and URI privacy"; OMP 18.8.9 `session/messages.ts` `fileMention` conversion (1086-1124) and `modes/rpc/wire/rpc-wire.generated.ts` `FileMentionMessage` (220).
**Covers:** W10

**Check:** Before: a native worker test attaching `notes.txt` shows the fixture provider request without the file's text. After: `bun run --cwd packages/agent-service test` shows the request contains `<file path="notes.txt">` with the content and no host path in any projected event or snapshot; an image is still sent as an image. `bun run --cwd packages/web test` shows a 500,001-character text file, and a prompt whose text attachments total over 1,000,000 characters, get 413 `PAYLOAD_TOO_LARGE`, and a zip gets 400 `INVALID_REQUEST` naming the file, all with nothing queued or dispatched.

- [x] Text detection: listed media types or Host-converted document text, valid UTF-8, no NUL byte.
- [x] Limits are enforced at Host admission, so queued items can't fail later on size.
- [x] `path` in the file mention is the attachment name; the client-visible attachment part keeps its `attachment://` URI.
- [x] The composer shows the refusal and keeps the draft and its attachments.
**Finished:** 2026-10-26T00:00:00Z

## Progress
+ Dirty at start: none
+ Check before: native worker test lacked file content; host attachment tests had no admission validation
+ Root cause: non-image attachments were projected as a hidden host-path custom message, and Host delivery resolved files without validating text type or prompt character limits
+ Check after: `bun run --cwd packages/web test server/lib/host/attachment-store.test.js` — 4 passed; agent-service type-check remains blocked by pre-existing missing SessionControl exports and catalog schema errors
 - Follow-up: OMP 18.8.9 conversion reaches the chat-completions fixture as a normalized user message; the test now verifies file content/name and host-path privacy without assuming the provider role remains developer.
 - Check after correction: native focused test passed; Host attachment-store test passed 4/4.
