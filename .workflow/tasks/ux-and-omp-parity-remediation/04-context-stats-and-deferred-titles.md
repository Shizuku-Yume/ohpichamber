# 04: Fix context/session statistics panel and implement deferred conversation-context session titles

**Effort:** ux-and-omp-parity-remediation
**Task type:** bugfix
**Blocked by:** 01
**Covers:** W3, W5
**Files:** `packages/agent-contract/src/messages.ts`; `packages/agent-service/src/worker/projection.ts`; `packages/agent-service/src/worker/session.ts`; `packages/agent-service/src/worker/auto-title.ts`; `packages/ui/src/lib/routing/contextWindowLimits.ts`; `packages/ui/src/components/layout/ContextSidebarTab.tsx`; `packages/ui/src/components/layout/Header.tsx`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.agents/skills/sync-state-invariants/SKILL.md`
**Check:** `bun test packages/agent-service/src/worker/auto-title.test.ts packages/agent-service/src/worker/projection.test.ts && bun run --cwd packages/ui test` → exits 0; verifies `reasoning` token projection, `findAnsweringModelKey` with `providerId`/`modelId`, and deferred title generation after an opening greeting.

- [ ] Fix `findAnsweringModelKey` in `packages/ui/src/lib/routing/contextWindowLimits.ts` to read canonical `message.providerId` and `message.modelId` (with fallback to `providerID`/`modelID`), restoring accurate context window limits in `Header.tsx` and `WorkStatusPrimaryGroup.tsx`.
- [ ] In `packages/ui/src/components/layout/ContextSidebarTab.tsx`, use directory-scoped `selectProvidersForDirectory`, fall back to the session's active/configured model when no assistant message carries `providerId`, and fall back to `DEFAULT_CONTEXT_LIMIT` (`200_000`) when model metadata omits `contextWindow` so `usagePercent` and provider/model labels never display `0.0%` or `- / -` on active sessions.
- [ ] Add optional `reasoning` token count to `TokenUsageSchema` in `packages/agent-contract/src/messages.ts`, populate it in `packages/agent-service/src/worker/projection.ts` (`canonicalUsage`), and read `usage.reasoning ?? 0` in `ContextSidebarTab.tsx`.
- [ ] In `packages/agent-service/src/worker/session.ts` and `auto-title.ts`, implement OMP's deferred title fallback (`#advanceDeferredTitle` parity): when the first user prompt is a greeting (e.g. `"你好"`) or initial title generation returns `null`, re-run title generation on `agent_end` using the `<chat><user>...</user><assistant>...</assistant></chat>` turn context so the session is automatically titled and broadcast via `session.updated { title }`.
