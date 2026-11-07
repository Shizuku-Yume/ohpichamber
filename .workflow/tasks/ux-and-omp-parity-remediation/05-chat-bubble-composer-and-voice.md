# 05: Fix user message bubble width, remove overlapping ghost prediction, and fix voice dictation bar

**Effort:** ux-and-omp-parity-remediation
**Task type:** bugfix
**Blocked by:** None
**Covers:** W4, W6, W8
**Files:** `packages/ui/src/components/chat/ChatInput.tsx`; `packages/ui/src/components/chat/composer/ui/ComposerFooter.tsx`; `packages/ui/src/components/chat/ChatMessage.tsx`; `packages/ui/src/components/chat/message/MessageBody.tsx`; `packages/ui/src/components/chat/message/parts/UserTextPart.tsx`; `packages/ui/src/styles/design-system.css`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `packages/ui/src/lib/theme/STYLING.md`
**Check:** `bun run --cwd packages/ui test && bun run --cwd packages/ui type-check` → exits 0; verifies compact user bubble classes, clean composer placeholder state, and dictation overlay isolation.

- [ ] Remove the fake static `ghostPrediction` overlay in `packages/ui/src/components/chat/ChatInput.tsx` (lines 438, 510–536, 2526–2535, 4260–4264) that rendered static text over `ComposerEditor`'s placeholder even while a turn was running, keeping `SessionSuggestionChip` as the single non-overlapping suggestion surface.
- [ ] In `packages/ui/src/components/chat/ChatMessage.tsx`, `MessageBody.tsx` (`UserMessageBody`), and `UserTextPart.tsx`, restore compact right-aligned user bubbles: set `flex flex-col items-end` on the user bubble shell, `w-fit max-w-full` on `[data-user-message-bubble]` and `UserMessageBody`, and only apply `line-clamp-2` when the message actually exceeds two lines / is truncated so a short prompt like `"你好"` renders as a compact pill matching upstream OpenChamber.
- [ ] In `packages/ui/src/styles/design-system.css` (line 730) and `ChatInput.tsx` / `ComposerFooter.tsx`, add `.oc-glass-composer[data-dictating]` to the dictation hiding selector and hide `ComposerModeSelector` while `dictationActive` is true so the voice recording bar never overlaps underlying composer text or buttons.
