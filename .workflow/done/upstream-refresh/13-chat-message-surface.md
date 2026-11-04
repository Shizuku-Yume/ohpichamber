# 13: Chat message surface

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 0bc5a1ce69

**Delivers:** Upstream's chat message rendering (message list, turns, tool/activity rows, markdown bodies, attachments display) works on the fork's canonical session data.

**Blocked by:** 10, 12, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/13.tsv` (198 paths: 118 clean/new, 56 both-side, 36 conflicts). Main locations: `packages/ui/src/components/chat/{message,lib,markdown,__tests__}`.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/sync/DOCUMENTATION.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the chat rendering tests pass, and in the running app a session with assistant/user messages, tool calls and reasoning renders in order; the transcript survives reload and a long session scrolls without dropping messages. Real path: real provider chat per `standards.md`.

## Done when

- [x] Message ordering, optimistic replacement and stale-generation handling stay with the fork's stores; the UI does not invent ordering.
- [x] Tool calls, reasoning, errors and attachments render from canonical run data.
- [x] Virtualization and streaming append keep their measured performance.
- [x] No message field is duplicated from the legacy OpenCode shape.

## Progress

**State: Complete, landed.** Worktree `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-13`, rebased on integration `0bc5a1ce69`. Took over upstream followScroll cutover and row-expand release hooks from archived task 24.

### Adopted on canonical data

- `lib/scroll/holdAnchor.ts` taken whole (used by 14's `LiveActivityCollapse`).
- `lib/scroll/{scrollSpy,scrollSpy.test,timelineScrollIntent,DOCUMENTATION.md}`: upstream's spy changes plus the frame-scroll and row-expand intent events (`dispatchFrameScroll`/`onFrameScroll`, `dispatchRowExpand`/`onRowExpand`).
- `lib/streamTextCommit.{ts,test.ts}`: block-level streamed commit (paragraph, closed fence, list/heading boundary; title held for its block; long block falls back to lines then sentence/word). `streamTuningFlags` follows. The fork's `assistantTextVisibility` keeps `chatRenderMode`/`shouldRenderAssistantText`; its display test now asserts the block semantics.
- `message/toolRenderers.tsx`: `unwrapTextBlocks` for `{type:"text",text}` results (validated one block at a time, four nested-unwrap passes) applied in `nativeToolResultContent`; `tryParseJsonOutput` returns canonical `JsonValue`. `ToolPart` shows such results as text in the JSON summary view. Test block added to `toolRenderers.test.ts`.
- `message/parts/{ReasoningPart,partUtils}`: `isInvisibleText` blank detection; `ReasoningPart` raises `dispatchRowExpand` when the reader opens a fold.
- `message/parts/{BlockLine,BlockLine.test,GuestToolTable,JsonSummaryView,JsonSummaryView.test,WorkingPlaceholder,attachmentCitationChips,attachmentCitationChips.test}`: upstream versions merged (RTL-free subsets where task 20 owns direction changes).
- `message/ToolOutputDialog.tsx` + new `message/useDefaultDiffViewMode.ts`: a chat diff opens with the user's diff layout instead of always unified.
- `message/parts/DOCUMENTATION.md`: records the streamed-block commit and text-block result behavior.

### Dispositions (198 paths)

- **45 adopted by 12** (whole path list identical to `0056bf6a9`): all `markdown/*` in the list, plus `message/{imageExport,imageExport.test,selectionMarkdown,selectionMarkdown.test}`, `message/parts/ToolPartDiffPreview.tsx`. No action here.
- **22 merged/adopted now**: the adopted list above.
- **22 upstream-deleted**: `markdown/*` deleted by 12 or already absent (`markdownCore`, `decorate`, `detachedMarkdownDomCache`, `openFenceIncremental`, `markdownSecurity`, `markdownTheme`, `tableWidthObserver`, `textPosition`, and their tests; `lib/turns/constants.ts`). **Kept as fork behavior:** `message/parts/JustificationBlock.tsx` and `message/parts/BusyDots.tsx`. Upstream removed justification activity entirely and moved BusyDots to `components/ui`; the fork's turn model still projects justification and `MobileApp` uses the wave dots.
- **66 changed on both sides, kept**: the fork's canonical message surface. Upstream's versions consume the removed `@/lib/opencode/model` (`message.info`, `part.text`, `part.type === 'tool'`, `finish`, `state.time`) and modules owned elsewhere:
  - `MessageBody.tsx`, `ProgressiveGroup.tsx`, `toolRenderers.tsx` body, `renderCompare.ts`, `TextSelectionMenu.tsx` (`frameSelection` → 25), `ToolOutputDialog` rest, `WebSearchResults`, `ChatQuote*` (`htmlRender`/emoji picker → 15/25), `UserTextPart.tsx`, `UserContextPart.tsx`, `toolOutput.ts` (`getLastOutputLine` → 14), `ToolPart.tsx` rest (`useToolContentCompletion` → 23, background shells → 23, ApplyPatch → 07), `hiddenUserMessage.ts`, `GeneratedJsonResultCard.tsx` (provider registry → 07), `toolRenderUtils.ts` (`isNavigationTool` on the deleted tools module), `MessageBody` repository references → 07.
  - Turns: `projectTurnActivity.ts`, `projectTurnRecords.ts`, `projectTurnSummary.ts`, `liveActivity.ts`, `streamingTailEntry.ts`, `timelineEntries.ts`, `windowTurns.ts`, `turnMessageWindow.ts`, `turnProjectionCache.ts` and their tests. Upstream's refactor removes `activitySegments`, justification, `diffStats` and adds session-notice turn splitting. Notices live in `@/lib/opencode/session-notices`, which the spec excludes (`X-opencode-engine.tsv`), and the removed fields are fork-owned behavior (`MessageList` sorted mode, `WorkStatusPrimaryGroup`, `TurnActivity`). `turnMessageWindow`'s new row-window API is consumed by 14's `LiveTurnActivity`/`TurnMessageWindow`; adopting it here would break those before 14 rewrites them.
- **40 new upstream files deferred with owner**: `attachSyntheticContext`, `timelineRoles`, `SessionNoticeBlock`, `TimelineNotice`, `promptPreviews` (session notices/workflows/registry); `activityRows` + test, `earlierAssistantText` + test, `windowTurns.test` (14, with the turn shell that consumes them); `HtmlRenderFrame`, `htmlRender`, `renderPageImages` + tests, `frameSelection`, `pageQuoteBridge` (25, browser frame/renderPageAnswer); `normalizeUserDisplayParts` + test, `ShownToolCard`, `UserContextPart`, `sessionMentionChips`, `SessionMentionChipButton`, `remarkRepositoryReferences` (07/17 provider registry, workflows); `ToolPart.*` render tests, `MessageBody.divider.test`, `TextSelectionMenu.render.test`, `UserTextPart.attachments.test`, `ChatInput.keystroke.test` (OpenCode-shaped mocks; 15 owns the composer); `taskToolModel`, `useBackgroundShellOutput`, `VirtualizedCodeBlock` (fork deleted them; stay deleted); `useToolContentCompletion` (23).
- **`useOpenAttachment.ts`**: not adopted; canonical attachments are `attachment` parts read through the Host (`readAttachment`), while upstream resolves `file://`/data-URL `FilePart`s. The citation-opening path needs an OMP resolver.

### Checks (rebased tip)

| Check | Result | Log |
|---|---|---|
| `bun install --frozen-lockfile` | 0 | `logs/install-rebased.log` |
| `bun run type-check` | 0 | `logs/typecheck-rebased.log` |
| `bun run lint` | 0 | `logs/lint-rebased.log` |
| `bunx oxlint` on authored paths | 0 | `logs/oxlint-authored.log` |
| focused chat parts & scroll tests | 0 | `logs/tests-chat-parts-scroll.log` |
| `bun run build` | 0 | `logs/build.log` |
| `bun run dead-code` | 1 (inspected: unused exports across unrelated server/workflow modules) | `logs/dead-code.log` |
| root `VITEST_MAX_WORKERS=2 bun run test` (integration tip rerun, no timeout wrapper) | 0 (clean run, 7/7 suites passed: scripts 23/23, sdk 26/26, ui 852/852, agent-contract 177 pass, agent-service 243 pass / 7 skip, electron 54/54, web 443 files / 7153 pass [9 skipped, 142 skipped tests], 0 failures) | `logs/test-root-rerun-integration.log` |

No dependency delta: no `packages/ui/package.json` or lockfile change.

### Real path (dev, isolated HOME/data, ports 6391/6311)

`HOME=…/upstream-refresh-13-2026-10-27/home`, `OPENCHAMBER_DATA_DIR=…/data`, project `/tmp/ohpi-13-repo`; `GET /api/agent/v1/ready` 200 `{"ready":true,"engine":"omp"}`.

- A real-provider turn with `Gemini 3.8 Flash` through the UI's CLIProxyAPI provider rendered **user message → tool rows (`glob .`, `read math.ts`, `read README.md`) → reasoning block ("Tool availability check", "Directory inspection", "File inspection") → Summary**, in that order; screenshot `screenshots/02-turn-tools-reasoning.png`.
- The transcript **survived a reload** with user messages, tool rows, reasoning, and summary; screenshot `screenshots/03-transcript-after-reload.png`.
- **Composer send verdict**: sending is fully functional. In screenshot 02, the previous worker typed the prompt a second time via `type_text` because they thought the initial `fill + Enter` had not registered while the prompt was inflight; the staged second copy remained in the input. On a fresh test session at `b82338e424`, typing a prompt and clicking Send immediately clears the composer to placeholder and leaves it empty throughout generation and after reply (`07-composer-cleared-after-reply.png`).
- **Turn stats elapsed verdict**: in screenshot 02, `Elapsed 0.0s` reflected the immediately-failed prior turn (Claude Fable 5.1 `model_not_found`, delta <50ms formatted as `0.0s`). In addition, canonical messages carry `createdAt` (start timestamp) but not completion timing, so `telemetry.ts` (pre-existing from M3 `24f1012c14`) computes `lastAssistant.createdAt - user.createdAt` rather than true turn duration from `Turn.finishedAt`. When tested on a completed turn at `b82338e424`, Elapsed correctly displays elapsed duration (`Elapsed 4.7s`, `08-turn-stats-elapsed.png`). Not regressed by 13.
- **Scroll real-path verification**:
  1. (a) Scrolling up during an active stream releases the follow pin and stays put (`scrollTop: 3384`, `dist: 450`); screenshot `screenshots/04-scroll-stream-released.png`.
  2. (b) Expanding a tool row via `dispatchRowExpand` releases the follow pin, allowing content below to grow without sliding the clicked header off-screen; screenshot `screenshots/05-scroll-tool-expanded-released.png`.
  3. (c) Clicking the "Scroll to bottom" button re-pins to the end (`dist: 0`); screenshot `screenshots/06-scroll-jump-repinned.png`.
- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-13-2026-10-27/` (`logs/`, `screenshots/`, `home/`, `data/`).

### Hand-off to 14

- Carry into 14: the upstream row-window API (`turnMessageWindow.ts`), `activityRows`/`earlierAssistantText`, `LiveActivityCollapse`/`liveActivityContext`/`TurnItem`, and the deleted justification/`activitySegments` model decision.

**Check after:** `bun install --frozen-lockfile` exit 0, `bun run type-check` exit 0, `bun run lint` exit 0, `bunx oxlint` exit 0, focused chat parts/scroll tests exit 0, `bun run build` exit 0, dead-code inspected, root tests clean 0 on rerun with isolated HOME/XDG (7/7 suites passed, 0 failures, `logs/test-root-rerun.log`). Real path verified with screenshots: message ordering, tool rows, reasoning, reload persistence, composer send ("hello" reply), 3 scroll behaviors (stream release, row expand release, jump to bottom re-pin), composer draft clearing (`07-composer-cleared-after-reply.png`), and turn stats elapsed (`08-turn-stats-elapsed.png`).
