# 07: Plan review and approval

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** When the agent in plan mode proposes a plan, a review card shows the plan with Approve, Approve and compact, Send feedback and Reject. Approving leaves plan mode, restores the tools and starts execution as an `origin:'plan'` run with OMP's plan-approved prompt.

**Blocked by:** 05, 06
**Files:** `packages/agent-contract/src/requests.ts` (question kind `plan-review` and its response), `packages/agent-service/src/worker/interaction.ts` and `packages/agent-service/src/interaction/manager.ts`, the worker mode controller from task 05, `packages/ui/src/components/chat/` (question card beside `questionRequest.ts`/`useQuestionResponse.ts`), i18n.

**Read first:** spec "Plan review" and W5; OMP 18.8.9 `modes/interactive-mode.ts` `#approvePlan` (5606-5785) and the review choice handling near 6587-6629; `session/agent-session.ts` `preparePlanForReview` (1605), `setPlanProposalHandler` (2761), `markPlanReferenceSent` (6810); `prompts/system/plan-mode-approved.md`; `contracts.md` "Approvals, questions, and human-in-the-loop". Re-read line numbers first.
**Covers:** W5

**Check:** Before: a native test where the fixture provider calls the plan proposal tool gets OMP's default result and no pending question. After: `bun run --cwd packages/agent-service test` shows a pending `plan-review` question with title, `local://` reference and plan text; `approve` exits plan mode, restores tools, and emits `run.started` with `origin:'plan'` whose first user content is the rendered plan-approved prompt; `approve-compact` emits `session.compacted` first; `feedback` returns the text to the plan turn; `reject` keeps plan mode; a stale answer from a second client gets the existing CAS conflict; expiry resolves fail-closed. A UI test renders the card and each action; `bun run dev` shows the card after reload.

- [ ] Plan review rides the interaction manager: generation, CAS, reconnect recovery and expiry unchanged.
- [ ] Plan text is read through OMP's plan reader; no host path reaches the client.
- [ ] Approval order matches `#approvePlan`: exit, optional compact, restore tools, mark reference sent, start run.
- [ ] UI card copy follows `locale-ui-patterns`; all locales get keys.
