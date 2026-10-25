# 13: Ask dialog previews and recommended choice

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** The ask dialog shows each option's preview and preselects the recommended option. Answers still go through CAS.

**Blocked by:** None
**Files:** `packages/ui/src/components/chat/questionRequest.ts` (`AskQuestionOptionSchema` has no `preview`, so zod strips it), `packages/ui/src/components/chat/message/parts/ToolPart.tsx` (104), `FormFieldControl.tsx`, `useQuestionResponse.ts`; `packages/agent-service/src/worker/interaction.ts` (150-175 already forwards `preview` and `recommended`).

**Read first:** spec "Rendering", W12 and the open question "Ask timeout"; OMP 18.8.9 `tools/ask.ts` (134-203).
**Covers:** W12

**Check:** Before: a UI test parsing an `omp.ask` request with an option preview loses the preview, and nothing is preselected. After: `bun run --cwd packages/ui test` renders the preview, preselects the recommended option for single and multi questions, and the submitted answer goes through the existing CAS respond call.

- [ ] Preview is rendered as markdown in the existing message renderer, not raw HTML.
- [ ] Read whether OMP passes `timeout` to `askDialog`. If it does, show a countdown and record it in the spec; if not, write the finding in `## Progress` and remove the open question from the spec.
