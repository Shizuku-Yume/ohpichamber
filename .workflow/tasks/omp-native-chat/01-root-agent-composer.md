# 01: Retire the root agent picker from the composer

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** A new chat starts in the main conversation and sends successfully even when an agent profile with unavailable `allowedTools` exists. The desktop and mobile composers show no agent picker, `@agent` no longer selects a root profile, and every composer send carries `agentId: null`.

**Blocked by:** None
**Files:** `packages/ui/src/components/chat/ModelControls.tsx` (agent menu), `packages/ui/src/components/chat/MobileAgentButton.tsx`, `packages/ui/src/stores/useConfigStore.ts` (default agent cascade near 417), `packages/ui/src/components/chat/ChatInput.tsx` (`currentAgentName` sends), `packages/ui/src/components/chat/StatusRowContainer.tsx`, `packages/ui/src/hooks/useMiniChatKeyboardShortcuts.ts`, the composer `@` mention source; i18n keys for removed labels.

**Read first:** spec `specs/omp-native-chat.md` "What it does" and "Root agent retirement"; `research/crude-port-ledger.md` CP-01, CP-02; `packages/agent-service/src/worker/session.ts` `selectOptions` (289-310) and `prepare` (332-335) for the 422/400 paths.
**Covers:** W1

**Check:** Before the change, a UI test that renders the composer with a catalog whose first profile has `allowedTools: ['missing_tool']` records a send with that `agentId`, and the worker native test `profile tool allowlist` path returns 422. After: `bun run --cwd packages/ui test` includes a test asserting the composer renders no agent control and the captured `PromptRequest.options.agentId` is `null`; `bun run dev`, then a new chat with that profile present completes through the fixture or real provider.

- [ ] Composer and mobile composer have no agent picker; the mode switcher's slot is left empty for task 05.
- [ ] `useConfigStore` no longer resolves a default root agent; nothing reads `agents[0]` as the session agent.
- [ ] Every composer path (send, queue, steer, follow-up) sends `agentId: null` and no `agentMention`.
- [ ] `@` mention no longer offers agents as root selections; file and skill mentions still work.
- [ ] Removed i18n keys are deleted in every locale, per `locale-ui-patterns`.
- [ ] `bun run --cwd packages/ui type-check` and `test` pass.
