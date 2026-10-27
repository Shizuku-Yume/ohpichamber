# 13: Chat message surface

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 74bbb98db7

**Delivers:** Upstream's chat message rendering (message list, turns, tool/activity rows, markdown bodies, attachments display) works on the fork's canonical session data.

**Blocked by:** 10, 12, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/13.tsv` (198 paths: 118 clean/new, 56 both-side, 36 conflicts). Main locations: `packages/ui/src/components/chat/{message,lib,markdown,__tests__}`.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/sync/DOCUMENTATION.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the chat rendering tests pass, and in the running app a session with assistant/user messages, tool calls and reasoning renders in order; the transcript survives reload and a long session scrolls without dropping messages. Real path: real provider chat per `standards.md`.

## Done when

- [ ] Message ordering, optimistic replacement and stale-generation handling stay with the fork's stores; the UI does not invent ordering.
- [ ] Tool calls, reasoning, errors and attachments render from canonical run data.
- [ ] Virtualization and streaming append keep their measured performance.
- [ ] No message field is duplicated from the legacy OpenCode shape.

## Progress

**State: WIP, committed `d9de0582bd` on `upstream-refresh/13`, not landed.** Worktree `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-13`, base `74bbb98db7`. Type-check, lint and all 167 chat tests are green; the root suite had web contention flakes, and the built web plus the scroll half of the real path are not done. The remaining list is exact at the end.

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

### Checks (this tip, `d9de0582bd`)

| Check | Result | Log |
|---|---|---|
| `bun install --frozen-lockfile` | 0 | `install.log` |
| `bun run type-check` | 0 | `typecheck-root.log` |
| `bun run lint` | 0 (one pre-existing `tooltip.tsx` warning) | `lint-ui.log` |
| `bunx oxlint` on authored paths | 0 | `oxlint-authored.log` |
| all 167 `components/chat` test files | 167/167 | `tests-chat-all.log` |
| root `VITEST_MAX_WORKERS=2 bun run test` | 1 — web only, 7 tests in 5 files, all on a machine shared with four other lanes | `test-root-1.log` |
| web reruns alone | `MultiFileDiffEntry` 2/2; `settings-helpers`/`terminal/shutdown`/`spaces/code-out` 330 passed, 2 skipped | `tests-web-rerun1.log` (pending `canonical-plugins`, timeouted by budget) |

No dependency delta: no `packages/ui/package.json` or lockfile change.

### Real path (dev, isolated HOME/data, ports 6391/6311)

`HOME=…/upstream-refresh-13-2026-10-27/home` (only `~/.omp/agent/{config.yml,models.yml,mcp.json}` copied), `OPENCHAMBER_DATA_DIR=…/data`, project `/tmp/ohpi-13-repo`; `GET /api/agent/v1/ready` 200 `{"ready":true,"engine":"omp"}`.

- A real-provider turn with `Gemini 3.8 Flash` through the UI's CLIProxyAPI provider rendered **user message → tool rows (`glob .`, `read math.ts`, `read README.md`) → reasoning block ("Tool availability check", "Directory inspection", "File inspection") → Summary**, in that order; screenshot `screenshots/02-turn-tools-reasoning.png`.
- The transcript **survived a reload** with both user messages, the tool rows, the reasoning block and the summary; screenshot `screenshots/03-transcript-after-reload.png`.
- A first attempt with `Claude Fable 5.1` failed as a provider error (`model_not_found`; the proxy answers 200 for `gemini-3.8-flash` and `gpt-6-astra`), shown by the fork's failed-run notice. Not a UI defect.
- The scroll check is incomplete: the virtualized scroller re-pinned to the end when driven from script, and the dev service was then stopped (`SIGTERM` 143), so the re-opened session had not restored within the budget (`turns: 0`, no 503 observed). The built-web check was not run.
- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-13-2026-10-27/` (`logs/`, `screenshots/`, `home/`, `data/`).

### Exact remaining list

1. Rerun `server/lib/host/canonical-plugins.test.js` alone (last run killed by budget); confirm the root suite on an idle machine. Count the known agent-service eviction test separately if it is the only failure.
2. Real path, scroll half: with the dev server up, release the end pin with a real pointer/wheel gesture (the app listens to `pointerdown`/`wheel`), scroll a transcript of ≥10 turns through top→bottom, and record that every turn id mounts with no dropped message and no console error. Add 6–8 more short real-provider turns first.
3. `bun run build` and serve the built web once; repeat the chat rendering + reload observation there and save the screenshot.
4. `bun run dead-code` and inspect: `holdAnchor.ts` is consumed by 14; record any other cross-task export.
5. Rebase on the then-current integration tip, rerun install/type-check/lint/affected tests, move this file to `.workflow/done/upstream-refresh/` after `.workflow/bin/workflow validate`, ff-only merge, remove the worktree and branch.
6. Carry into 14: the upstream row-window API (`turnMessageWindow`), `activityRows`/`earlierAssistantText`, `LiveActivityCollapse`/`liveActivityContext`/`TurnItem`, and the deleted justification/`activitySegments` model decision (upstream removed it; the fork's `MessageList` sorted mode still uses it).
