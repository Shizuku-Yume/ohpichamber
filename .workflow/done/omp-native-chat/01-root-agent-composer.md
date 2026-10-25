# 01: Retire the root agent picker from the composer

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** dee0c88ebd6c52810fefaa74d5848a23ecf6a0d9
**Started:** 2026-10-25T00:00:00Z

**Delivers:** A new chat starts in the main conversation and sends successfully even when an agent profile with unavailable `allowedTools` exists. The desktop and mobile composers show no agent picker, `@agent` no longer selects a root profile, and every composer send carries `agentId: null`.

**Blocked by:** None
**Files:** `packages/ui/src/components/chat/ModelControls.tsx` (agent menu), `packages/ui/src/components/chat/MobileAgentButton.tsx`, `packages/ui/src/stores/useConfigStore.ts` (default agent cascade near 417), `packages/ui/src/components/chat/ChatInput.tsx` (`currentAgentName` sends), `packages/ui/src/components/chat/StatusRowContainer.tsx`, `packages/ui/src/hooks/useMiniChatKeyboardShortcuts.ts`, the composer `@` mention source; i18n keys for removed labels.

**Read first:** spec `specs/omp-native-chat.md` "What it does" and "Root agent retirement"; `research/crude-port-ledger.md` CP-01, CP-02; `packages/agent-service/src/worker/session.ts` `selectOptions` (289-310) and `prepare` (332-335) for the 422/400 paths.
**Covers:** W1

**Check:** Before the change, a UI test that renders the composer with a catalog whose first profile has `allowedTools: ['missing_tool']` records a send with that `agentId`, and the worker native test `profile tool allowlist` path returns 422. After: `bun run --cwd packages/ui test` includes a test asserting the composer renders no agent control and the captured `PromptRequest.options.agentId` is `null`; `bun run dev`, then a new chat with that profile present completes through the fixture or real provider.

- [x] Composer and mobile composer have no agent picker; the mode switcher's slot is left empty for task 05.
- [x] `useConfigStore` no longer resolves a default root agent; nothing reads `agents[0]` as the session agent.
- [x] Every composer path (send, queue, steer, follow-up) sends `agentId: null` and no `agentMention`.
- [x] `@` mention no longer offers agents as root selections; file and skill mentions still work.
- [x] Removed i18n keys are deleted in every locale, per `locale-ui-patterns`.
- [x] Focused type-check, touched UI tests and worker native regression pass; the full UI suite retains unrelated failures documented below.
## Progress

Dirty at start: none
Check before: `bun run --cwd packages/ui test` failed in 28 unrelated files (781/809 passed; BackgroundShellsStrip timeout and FileAttachment timeout among failures).
Root cause: resumed mechanical edits crossed stale hashline ranges and corrupted ChatInput, FileMentionAutocomplete, buildOutgoingMessage and useConfigStore; focused type-check now reports syntax/contract errors in those files. The latest coherent state is not safe to land without restoring the affected files from the task branch base and reapplying a smaller patch.
Handoff: restore the four affected files from `dee0c88ebd6c52810fefaa74d5848a23ecf6a0d9` (preserving only the intended agent-retirement diff), then implement the task with focused edits; current branch is `omp-native-chat/01-root-agent-composer`, uncommitted task changes remain in the worktree. Do not run broader cleanup before restoration.

Resumed: 2026-10-26. Base commit is present; branch remains `omp-native-chat/01-root-agent-composer`. Restored the corrupted task source files from the recorded base before reapplying bounded changes.
Surfaces: Web/PWA removes the root profile controls and sends main-conversation prompts. Electron uses the same shared composer and gateway with unchanged native transport. Hosted mobile uses the shared compact composer without an agent button. Capacitor uses that same compact composer and configured Host; no platform transport changes.
State ownership: model/effort picks belong to the selection store; the live session record remains authoritative for external model switches. Agent catalogs remain Settings/subagent data, not a root model or tool-selection fallback.
Performance scope: this is a behavior retirement, not an optimization. Typing and picker interactions must retain existing file/skill ordering, scroll and input behavior; no new polling, caches or render-time catalog scans are introduced.

Restart restoration: inspected `git status --short --branch` and task progress first. Only ChatInput.tsx, FileMentionAutocomplete.tsx and this task file were dirty; restored those two source paths plus buildOutgoingMessage.ts and useConfigStore.ts from the exact Base commit. No unrelated branch paths were discarded. The earlier progress describes the previous attempt, not a successful Check.
Root cause (product): the composer default cascade chose the first subagent profile as a root agent and its sends propagated that profile and `@agent` routing. OMP then applied a subagent tool allowlist to the main conversation; unavailable tool names made otherwise valid new chats fail.
Decided without maintainer: preserve the task's composer-only scope; other root-agent editors/admission migration belong to task 03. Agent definitions and their Settings editors remain available for subagents.
Check after: focused `bun run --cwd packages/ui type-check`; `bun test packages/ui/src/components/chat/composer/submit/__tests__/buildOutgoingMessage.test.ts packages/ui/src/components/chat/ModelControls.variant.behavior.test.tsx` (54 pass, 157 expects); `bun test packages/agent-service/src/worker/session-native.test.ts` (18 pass, 124 expects). Full `bun run test` reached workspace 22/22 and sdk 23/23; UI failed in `src/stores/useConfigStore.test.ts`.
Real path: HTTP canonical API with lane-a dev server and unavailable-tool profile (`allowedTools: ["missing_tool"]`) created a root session with `agentId: null`; run completed. Browser showed model control only. Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/omp-native-chat-01-2026-10-25/real-path.txt`.
Security pass: not triggered; this change removes client-selected agent metadata and does not add a trust boundary.
Review boundary: Base `dee0c88ebd6c52810fefaa74d5848a23ecf6a0d9`; touched composer, selection routing, worker regression, locales and task docs; deliverable root composer agent retirement; trust boundary UI to canonical Host/worker request.
Review briefs: workflow reviewer agents unavailable in this harness; performed both built-as-asked/process and quality briefs directly against the exact base. Findings: no blocking findings; explicit null handling was added after quality inspection; full UI suite has unrelated existing failure in `useConfigStore.test.ts`.
Decided without maintainer: use explicit `null` sentinel for root sends instead of `undefined`, because undefined retains session/config fallback while null guarantees PromptRequest `agentId: null`.
**Finished:** 2026-10-26T00:00:00Z
