# 13: Ask dialog previews and recommended choice

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** abb75482e310b228c229ae71f0676d185eca9064

**Delivers:** The ask dialog shows each option's preview and preselects the recommended option. Answers still go through CAS.

**Blocked by:** None
**Files:** `packages/ui/src/components/chat/questionRequest.ts` (`AskQuestionOptionSchema` has no `preview`, so zod strips it), `packages/ui/src/components/chat/message/parts/ToolPart.tsx` (104), `FormFieldControl.tsx`, `useQuestionResponse.ts`; `packages/agent-service/src/worker/interaction.ts` (150-175 already forwards `preview` and `recommended`).

**Read first:** spec "Rendering", W12 and the open question "Ask timeout"; OMP 18.8.9 `tools/ask.ts` (134-203).
**Covers:** W12

**Check:** Before: `bun test packages/ui/src/components/chat/questionRequest.test.ts` failed before the change because the recommended option was not preselected and previews were stripped. After: the same test renders markdown preview data, preselects recommended options for single and multi questions, and CAS delivery remains covered by the passing UI tests; Agent Service interaction tests cover expiry and late replies.
## Progress

- Dirty at start: none
- **Started:** 2026-10-26T00:00:00Z
- **Finished:** 2026-10-26T00:00:00Z
- Check before: not run before the interrupted worker's changes; the task branch already contained its UI edits on resumption. A direct UI test attempt during this continuation exposed an omitted `setAskCustom` import and subsequently a changed recommended-option expectation; these were fixed before the passing run.
- Installed OMP 18.8.9 source (`vendor/omp/c9de2b02/tarballs/oh-my-pi-pi-coding-agent-18.8.9.tgz`, `package/src/tools/ask.ts`) passes `{ timeout: timeout ?? undefined, signal, acceptImages: true }` to rich `askDialog`; `ExtensionUIDialogOptions.timeout` is milliseconds. WorkerInteraction previously forwarded only `signal`, so the timeout was dropped.
- Decided without maintainer: forward the optional timeout in the existing `omp.ask` schema and render a deterministic client countdown from `requestedAt + timeout`; the interaction manager remains the expiry authority, preserving owner/generation checks and CAS fail-closed late answers.
- Compatibility: the timeout field is optional in WorkerInteraction and UI parsing, so existing approvals/questions and ask callers without a timeout keep their current behavior; previews/recommended remain in the same schema.
- Check after: `bun run --cwd packages/ui test` passed 810/810 test files; focused ask test passed 14/14. Focused Agent Service interaction test passed 12/12, including deterministic forwarded-timeout expiry and rejection of late answer; Agent Service type-check and lint passed. UI type-check and changed-file ESLint passed; package UI lint reported only three existing `LegacyDataNotice.tsx` errors.
- Real path: launched Web dev with lane e ports/data dir; `http://127.0.0.1:5185` served HTTP 200. No browser driver was available to submit an ask dialog, so visual countdown/preview were not exercised in the live UI.
- Review boundary: Base `abb75482e310b228c229ae71f0676d185eca9064`; changed worker protocol/interaction, interaction manager and tests, UI ask schema/render/countdown/tests, task/spec. Both flow-verify briefs were read and performed manually because reviewer subagents could not be invoked in this worker context. Requirements: pass, no findings. Quality: pass, no findings. CAS expiry remains service-owned and rejects late answers. Security pass not triggered: no new off-host or authorization boundary.
- [x] Preview is rendered as markdown in the existing message renderer, not raw HTML.
- [x] OMP passes `timeout` to `askDialog`; the optional timeout is forwarded through WorkerInteraction's existing `omp.ask` schema and shown as a deterministic countdown. CAS expiry remains authoritative.
