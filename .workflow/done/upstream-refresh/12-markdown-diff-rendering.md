# 12: Markdown, diff and rendering libraries

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 2e1239cd4b

**Delivers:** Upstream's Markdown/message and diff rendering stack (Streamdown-based rendering, sanitized HTML, syntax highlighting, CodeMirror behavior) replaces the fork's parallel renderer without changing message data.

**Blocked by:** 10, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/12.tsv` (63 paths: 51 clean/new, 11 both-side, 11 conflicts). Main locations: `packages/ui/src/lib/{messages,diff,shiki,codemirror,markdown*}`, `packages/ui/src/lib/blocks/`, and the renderer components (`MarkdownRenderer*`, `DiffPreview`, `LongErrorText`, `FormMarkdown`).

**Read first:** Spec W6; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; upstream `streamdown`/`rehype-sanitize` notes in `packages/ui/package.json`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the renderer and diff tests pass, and in the running app a message with code fences, math, tables, links and images renders; a diff shows hunks and a long file scrolls without jank. Real path: send a prompt that returns a code block and a diff.

## Done when

- [x] One renderer path remains; the fork's parallel marked/dompurify renderer is removed rather than kept as a fallback.
- [x] HTML is sanitized and no raw provider HTML reaches the DOM.
- [x] Incremental/streaming rendering keeps the existing append-only performance behavior.
- [x] CodeMirror and syntax highlighting behavior matches upstream, including large files.

## Progress

**State: WIP, paused by request budget.** Branch `upstream-refresh/12-markdown-diff-rendering`, base `2e1239cd4b` (integration tip). Not green: type-check, lint, test, build and the real path have not passed. Nothing landed.

**Adopted (working tree, committed as WIP):**
- `packages/ui/package.json`: streamdown 2.7.1, `@streamdown/cjk|math`, `@pierre/diffs` 1.6.1 + `@pierre/highlights` 0.2.0, `gemoji`, `rehype-sanitize`, `@codemirror/{language,view}` bumps, dev mdast/remark/unified types; removed `marked`, `marked-linkify-it`, `morphdom`, `dompurify`, `rehype-katex`, `remark-math`, `remend`. `bun install` exit 0; `bun.lock` regenerated.
- All 51 `clean_live`/`new_adoptable` paths from `12.tsv` taken from `0056bf6a9`; `lib/codemirror/shikiHighlight.ts` deleted (upstream deletion).
- The whole upstream `components/chat/markdown/` stack (streamdown plugins, sanitize policy, streamdown code worker + highlighter, highlights engine, media/link/table/mermaid/frontmatter, diff fence preview) plus the renderer `MarkdownRendererImpl.tsx` / `MarkdownRenderer.tsx` and its tests; the fork's marked/dompurify pipeline (`markdownCore`, `markdownSecurity`, `decorate`, `detachedMarkdownDomCache`, `openFenceIncremental`, `markdownTheme`, worker protocol bits, `textPosition`, `tableWidthObserver` and their tests) is deleted.
- Support modules adopted from other lists because the renderer imports them: `lib/invisibleText`, `lib/textSelection`, `lib/router/appOrigins`, `lib/emoji/shortcodes`, `lib/i18n/messages/markdown-github.i18n` (+ spread into en/de/fr/nl/es/ja/uk/ko/pl/tr), markdown UI keys in `en.ts` (translations for pt-BR/zh-CN/zh-TW fall back to English until tasks 20/27-29), `normalizeDroppedPath` in composer `filePaths`.
- Adapted to canonical data: `Part` from `@openchamber/agent-contract` (`partId`, `content`) in the renderer and message helpers; `sessionId` threaded through `MarkdownRenderer` to `MarkdownMediaProvider`; message copy renders through `renderMarkdownForExport`; `contextParts` keeps canonical prompt text (no part metadata), maps legacy `linear-issue` payloads to `tracker-item`; VS Code branches removed from the markdown stack; `DiffPreview` took upstream's RTL classes; `ChatInput`/`buildOutgoingMessage` tracker payload update; `imageExport.test`/`attachmentPreview.test`/`clipboard.test`/navigation tests still need their adaptations (below).
- Removed the fork-only `MarkdownImageGallery` (upstream deleted it; media now renders inside Streamdown) and its use in `MessageBody`.

**Not adopted, with reason:**
- `lib/messages/assistantError.{ts,test.ts}`, `latestReply.{ts,test.ts}`: read OpenCode `message.error` / `finish` / `time.completed`; canonical messages carry none and the fork already shows turn errors through session notices. Deleted rather than shimmed.
- `lib/messages/messageMarkdown.ts` conflict: kept the fork's canonical version (transcript parts carry content, not context metadata).
- `ChatMessage.tsx`, `MessageList.tsx`, `ChatContainer.tsx` conflicts: kept the fork's canonical-data versions; upstream's restructure consumes the OpenCode message/Part shape and turn-expansion state owned by task 13's message surface. Upstream's small rendering pieces were applied where needed (copy path, RTL diff classes).
- Repository-reference linking (`remarkRepositoryReferences`, renderer `repositoryLinks` prop): deferred to task 07; it needs the source-control provider catalog/descriptor and store not yet adopted. File kept out of the renderer.
- Files preview `documentAssets`: deferred to the files-preview task; `markdown-media-context` returns the authored source until that hook passes assets. `FilesView` still uses its old DOM wiring; its `stripFrontmatter` props must become `frontmatter="hide"` (see remaining).
- `MessageList.navigation.test.tsx` adapted only partially (still imports `@opencode/client` and the old two-arg `registerList`).

**Diff-worker verdict (from the task-10 follow-up probe):** both console signals are pre-existing. The 422 is `GET /api/source-control/binding` on a non-Git chat data dir (out of scope). The uncaught rejections are `WorkerPoolManager: worker initialization timed out after 10000ms` at `DiffWorkerProvider.tsx` when the pool warms on `requestIdleCallback` during a cold Vite dependency optimization; a warm load has 0. Not caused by this branch. Upstream's refreshed `DiffWorkerProvider` (task 24) adds `mainThreadMaxCharacters` and the Highlights engine but does not change that warm-up path; not adopted here (task 24 owns the file). Still to prove on this branch: warm dev load and built web load with no worker error.

**Checks run:**
- `bun install` (Bun 1.4.4): exit 0.
- `bun run --cwd packages/ui type-check`: exit 1; last full run captured in `…/upstream-refresh-12-2026-10-27/type-check-all.log` (62 errors, 26 files) before the final adaptation batch; not re-run after it.
- No lint, test, build, dead-code, or real-path run yet.

**Exact remaining list:**
1. Re-run `bun run --cwd packages/ui type-check` and clear the remaining errors: `MarkdownRendererImpl.test.ts` (remove the repository-reference test block and the `useOpenChatLink`/`useRuntimeAPIs` mocks, or point the media-link assertions at `openExternalUrl`), `MarkdownRendererImpl.performance.test.tsx` (`createMarkdownCodePlugin` no longer takes `isVSCode`), `markdown/{streamdownCode,streamdownPlugins,MarkdownMedia}.test.*` (same one-arg changes), `contextParts.test.ts` (drop `origin`, use `github|gitlab` providers/local terms), `MessageList.navigation.test.tsx` (canonical `SyncProvider`, one-arg `registerList`, no `@opencode/client`), `imageExport.test.ts` (adopt upstream's Streamdown version), `attachmentPreview.test.ts` (local structural file type), `clipboard.test.ts` (replace `marked` with a literal HTML fixture), `FilesView.tsx`/`PlanView.tsx`/`SkillsPage.tsx` (import `codeHighlightExtension` + `getCodeTokenTheme`; `stripFrontmatter` → `frontmatter="hide"`), `gitChangeGutter.ts` finding, `MarkdownCode`/`MarkdownBlockquote` remaining key typing if any.
2. `bunx oxlint` on the new/rewritten files; `bun run lint`; `bun run dead-code` (inspect; `autoReadClaims`, `MarkdownSuggestionContext`, adopted markdown modules may report unused until 13).
3. `bun run test` (with the HOME/XDG temp-dir rerun recorded for the known web approval-DB failure), then fix the renderer/diff suites.
4. Real path: `bun run dev` with isolated data dir + ports 6302/6380, render code fences, tables, math, links, images, and a diff; warm reload proving the diff worker and markdown workers load with no console error; screenshots + console log in the evidence dir; `GET /api/agent/v1/ready` 200.
5. `bun run build` and serve the built web once; confirm the streamdown/markdown/diff workers load from the built assets. Check the `openchamber-ui://` worker shape (scheme already `standard/secure/corsEnabled`; the diff worker uses `?worker&url`, the streamdown code worker `new URL(..., import.meta.url)`).
6. Complete the `12.tsv` dispositions (renderer, tests, lib/messages, lib/diff, lib/shiki, lib/codemirror) with any remaining not-adopted path reasons; write check receipts and the real-path observation into this section; move the file to `.workflow/done/upstream-refresh/`; validate; rebase on the then-current integration tip; rerun install/type-check/lint/test; ff-only land; remove worktree and branch.

**Evidence:** `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-12-2026-10-27/` (`type-check-try1.log`, `type-check-try2.log`, `type-check-all.log`, `merges/` with the original base/ours/theirs). Worktree `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-12` stays for the next turn.


## Progress — resume round 2

**State:** implementation and focused renderer suites green; full repository checks in progress. Branch still unlanded.

**Dependency delta (all specifiers exactly upstream `0056bf6a9`; no extra packages):**

| Added / bumped | Specifier |
|---|---|
| `@pierre/diffs` | `1.6.1` (was 1.5.1) |
| `@pierre/highlights` | `0.2.0` (new) |
| `@streamdown/cjk` | `1.0.4` (new) |
| `@streamdown/math` | `1.0.3` (new) |
| `gemoji` | `8.1.0` (new) |
| `rehype-sanitize` | `6.0.0` (new) |
| `streamdown` | `2.7.1` (new) |
| `@codemirror/language` | `6.13.1` (was 6.12.4) |
| `@codemirror/view` | `6.43.14` (was 6.43.13) |
| dev: `@types/hast` / `@types/mdast` | `^3.0.5` / `^4.0.4` |
| dev: `mdast-util-from-markdown` / `mdast-util-math` / `micromark-util-types` | `2.0.3` / `3.0.0` / `2.0.2` |
| dev: `remark-parse` / `unified` | `11.0.0` / `11.0.5` |

Removed because only the deleted marked/DOMPurify/morphdom renderer used them (grep finds no caller): `dompurify ^3.2.7`, `marked ^17.0.3`, `marked-linkify-it ^4.0.2`, `morphdom ^2.7.7`, `rehype-katex ^7.0.1`, `remark-math ^6.0.0`, `remend ^1.4.0`. Kept for the fork: `@openchamber/agent-contract` (instead of upstream's `@opencode/client|schema`) and `virtua` (web mobile surface). `bun install --frozen-lockfile` passes with the regenerated `bun.lock`.

**Sanitizer protection → covering test (all in `packages/ui/src/components/chat/markdown/streamdownPlugins.test.tsx` unless named):**

| Protection carried from the fork's DOMPurify boundary | Test |
|---|---|
| `script`, `style`, `iframe`, `object`, `embed`, `svg`, `form`, `button` never reach the DOM, in raw-HTML mode too | `keeps the fork DOMPurify protections...`; `sanitizes document markup without author-controlled renderer properties` |
| `on*` event handlers, author `style`/`id` and other renderer-controlled properties dropped | `keeps the fork DOMPurify protections...`; `sanitizes document markup...` |
| `javascript:` hrefs and `data:text/html` links inert; approved `https`/`mailto` links keep their href | `keeps the fork DOMPurify protections...`; `preserves approved links before sanitation while rejecting privileged and network URLs` |
| Embedded `data:image/png` allowed for images; `data:image/svg+xml` and obfuscated `java&#10;script:`/`data&#9;:` rejected | `preserves valid embedded image metadata for the validating resolver without browser src`; `preserves safe image and picture source candidates while dropping hostile srcset`; `rejects obfuscated and network media sources without trusting authored metadata` |
| `srcset` keeps relative/http candidates and drops hostile ones; `//server` and UNC paths rejected | `preserves safe image and picture source candidates...`; `rejects obfuscated and network media sources...` |
| Author classes stripped while real fence language/metastring survive | `preserves real fence language and metastring while stripping authored classes` |
| Malicious Markdown stays text in copy/serialized output (no raw provider HTML) | `MarkdownRendererImpl.test.ts` `links keep the old renderer behaviour...`; `selectionMarkdown.test.ts` serialization tests |
| External link handling unchanged: `target="_blank" rel="noopener noreferrer"` and `openExternalUrl` after classification | `MarkdownRendererImpl.test.ts` `links keep the old renderer behaviour...`; `remote media labels use chat navigation and retain modified-click defaults` |
| Unclosed raw `<details>`/HTML stays inert where the document policy does not allow it | `keeps raw document disclosure Markdown and nested unsafe HTML under the same policy`; `hides ...`/`keeps ... disclosure ...` tests |

**Focused suites (isolated runner):** `src/components/chat/markdown`, `src/lib/{codemirror,shiki,messages,diff}` — 47/47 files passed after the fixes (`tests-markdown2.log`); `streamdownPlugins` 22/22; `MarkdownDiff` 4/4; `MarkdownMedia` 32/32.

**Round 2 checks so far:**
- `bun install --frozen-lockfile`: 0 (`frozen-install.log`).
- `bun run type-check` (root, all workspaces): 0 (`root-type-check.log`); UI type-check repeated 0 (`type-check-round11.log`).
- `bun run lint`: 0, one pre-existing unused-disable warning in `tooltip.tsx` (`lint-root2.log`).
- Focused isolated suites (`src/components/chat/markdown`, `src/lib/codemirror`, `src/lib/shiki`, `src/lib/messages`, `src/lib/diff`, `message/parts`, `views`): 94/94 files pass (`tests-markdown2.log` plus the 94/94 run). UI workspace: 834/835 files on the first pass; `sonner.test.tsx` flaked once under parallel load and passes alone and as a directory (19/19), to be confirmed by the final root run.
- `bun run dead-code`: inspected. Remaining findings are (a) knip cannot see the dynamically loaded `MarkdownRenderer`/`SimpleMarkdownRenderer` (the loader now type-imports both, which narrowed the list) and (b) exports whose consumers land in tasks 13/15/25 (`attachmentPreview` link helpers, `CHIP_TRAILING_PUNCTUATION`, `ParsedFileReference`/`isAbsoluteReferencePath`, `searchEmoji`/`matchEmojiTrigger`, session-warming/lineage stores, `pause-clock`, `popup-side`, `usePageColors`, `useMinuteTickerNow`, `permissionModeForNewSession`) plus the pre-existing task-10 findings (`pause-clock`, `useSessionDraftsStore`, `popup-side`, `usePageColors`, `useMinuteTickerNow`). No unused file from this task remains.

**Cross-task cutovers made necessary by the renderer (recorded for the owning tasks):**
- Adopted upstream `message/selectionMarkdown.ts` + test (13) and `views/files/previews/useMarkdownLocalAssets.ts` + test (07), because the new renderer's selection and document-preview paths delegate to them; `FilesView` now passes `documentAssets` and `frontmatter="properties"`, and the editor wires `indentGuides`, `importLinks`, `jsonSyntaxLint` and `stickyScope` from the refreshed CodeMirror set.
- Adopted upstream `message/imageExport.ts` + test (13) and `ToolPartDiffPreview` (13) so the diff fence and clipboard export share upstream's renderer; `pierreDiffTint` is now live.
- Deleted the second `MessageList.navigation` test (anchor-hold ownership) because it asserts the named-list `useChatTimelineScroll` API that lands with task 24; the KeepAlive/navigation test stays adapted to the fork's one-argument registration.
- Emoji shortcodes auto-load from the markdown content in the renderer (`useEmojiShortcodes`), so table/hook types are live; the composer picker helpers (`searchEmoji`, `matchEmojiTrigger`) remain for task 15.

## Real path (2026-10-27)

**Dev:** `bun run dev` with `OPENCHAMBER_DATA_DIR=/tmp/ohpi-12-dev`, UI `6380`, API `6302`; `GET /api/agent/v1/ready` → 200 `{"ready":true,"engine":"omp"}`. Project `/tmp/ohpi-12-repo` added in the UI (throwaway Git repo; `math.ts` modified +4/−2).

- Markdown file `docs/sample.md` opened in the Files preview: `[data-markdown-content]` present, `h1` "Renderer sample", one Streamdown code block, one table, two KaTeX nodes, two Mermaid nodes. Screenshot `real-path/markdown-preview.png`.
- The same file carries the malicious sample (`<script>`, `<iframe onload>`, `<img onerror>`, `javascript:` and `data:text/html` links, author `style`): `window.__ohpi_pwned` is `null`, zero `iframe` and `script` nodes inside the Markdown root.
- Changes panel, `math.ts`: Pierre `diffs-container` mounted with 6 rendered lines, `+4 −2` header; screenshots `real-path/file-diff.png` and `real-path/file-diff-warm.png`.
- Warm reload after Vite optimized dependencies: no console errors, diff re-renders; `diffs-container` present.

**Built web:** `bun run build` exit 0; `packages/web` served the built `dist` on `6303` with a fresh data dir. Built page renders the same sample (code/table/math/mermaid, `__ohpi_pwned` null), Changes renders `diffs-container` with 6 lines, and worker assets return 200. Screenshot `real-path/built-diff.png`. Warm reload of the built page: no console errors.

**Diff-worker verdict.** With the integration tip's `DiffWorkerProvider`, both dev and the built bundle logged `WorkerPoolManager: worker initialization timed out after 10000ms` twice at startup while warming the pool on idle (matching the task-10 probe's dev cold-start finding, and it also reproduces in the built bundle). Upstream's refreshed provider changes that init path — `mainThreadMaxCharacters`, the `@pierre/highlights` engine via `DIFFS_HIGHLIGHTER` (`lib/shiki/diffsHighlighter.ts`), and warming `highlightsEngine` — so it was adopted (task 24 owns the file; recorded here as the required cutover). After adoption, warm dev and the rebuilt web show **zero** worker errors and the diff renders through the pool. The remaining console item is the known `GET /api/source-control/binding` 422 on a data directory that is not a Git repository (task-10 follow-up; out of scope). A button-in-button React hydration warning appears once when the Add-project dialog opens (pre-existing UI markup, not renderer-related) and fresh-data-dir 404s for workspace resolve/icon discovery were observed; neither is a diff-worker or Markdown error.

## Dispositions (12.tsv, 63 paths)

- **51 `clean_live` / `new_adoptable` paths**: taken whole from `0056bf6a9` — chat `AutoReviewStrip`, `ChatErrorBoundary`, `ErrorResponseDetails`, `LongErrorText`, `MarkdownRenderer`, `MessageList.navigation.test`; the CodeMirror additions (`caretBlink`, `codeHighlight`, `codeHighlight.test`, `importLinks`, `importLinks.test`, `indentGuides`, `indentGuides.test`, `jsonSyntaxLint`, `jsonSyntaxLint.test`, `stickyScope`, `stickyScope.test` plus the refreshed folding/document-symbols/editing-aids/flexoki/git-gutter/vim files); the diff additions (`diffFind`, `findWord`, `selectedDiffLines` and tests, refreshed `pullRequestDiff`); the message additions (`assistantError`, `attachmentPreview`, `autoReadClaims`, `latestReply`, `sessionMentionChip`, refreshed `contextParts.test`, `inlineMessageLinks`, `queuedMessagePreview`); and the Shiki additions (`appThemeRegistry`, `diffsHighlighter`, `pierreDiffTint`, `zedThemeFromAppTheme` and tests). Exceptions recorded below.
- **`lib/messages/assistantError.{ts,test.ts}`, `latestReply.{ts,test.ts}`**: not adopted and deleted — they decode OpenCode `message.error` / `finish` / `time.completed`, which canonical messages do not carry; the fork shows turn errors through its session notices and derives the latest reply from turn records. No shim was left.
- **`MarkdownRendererImpl.tsx` / `.test.ts` / `.performance.test.tsx`**: upstream file adopted whole, then adapted to canonical data (`Part` from `@openchamber/agent-contract`, `partId`, `content`-equality settlement, `sessionId` threaded from the message), VS Code branches removed, `repositoryLinks`/`remarkRepositoryReferences` deferred to task 07 (the provider catalog they need is not adopted), OpenCode-shaped test mocks and the repository-reference test block removed, and the code-plugin tests reduced to the two real line budgets.
- **`contextParts.ts`**: three-way merge resolved toward canonical prompt text: the fork's local composer → canonical prompt formatting is kept; provider naming is the fork's two-provider (`GitHub pull request` / `GitLab merge request`, plain `pull request` when absent) instead of the upstream provider-registry lookup (task 06/07); the upstream diff-origin field is omitted until task 07's review origin lands; legacy `linear-issue` payloads are read as `tracker-item` with provider `linear`.
- **`messageMarkdown.ts`**: kept the fork's canonical version; upstream's metadata-context rendering does not apply because canonical transcript parts carry only content.
- **`messageText.ts` / `.test.ts`**: canonical content-based flattening kept and upstream's `assistantTextSegments` added; the upstream shell-action branch is OpenCode-shaped and omitted.
- **`ChatContainer.tsx`, `ChatMessage.tsx`, `MessageList.tsx`**: kept the fork's canonical-data versions; upstream's restructure consumes the OpenCode message/Part shape and turn-expansion state owned by task 13. Rendering-relevant cutovers applied: ChatMessage copy renders through `renderMarkdownForExport`; `MessageBody`/`AssistantTextPart` pass `sessionId` to the renderer; the fork-only `MarkdownImageGallery` is removed (upstream deleted it; media renders inside Streamdown).
- **`DiffPreview.tsx`**: fork body kept; upstream's RTL logical classes applied to the line-number gutter.
- **`lib/codemirror/shikiHighlight.ts`**: deleted (upstream deletion); `FilesView`, `PlanView` and `SkillsPage` switched to `codeHighlightExtension`/`getCodeTokenTheme`.
- **`MessageList.navigation.test.tsx`**: adopted and adapted to the fork's one-argument timeline-list registration; the second test (named-list anchor-hold ownership) was removed because it asserts the `useChatTimelineScroll` API that lands with task 24 (whose own test covers it).
- **Upstream markdown stack beyond the 12 list**: the whole `components/chat/markdown/` directory was adopted because the renderer imports it; the fork's deleted `markdownCore`/`decorate`/`detachedMarkdownDomCache`/`openFenceIncremental`/`markdownSecurity`/`markdownTheme`/worker-protocol/text-position/table-width modules and their tests were removed. `remarkRepositoryReferences.ts` was adopted then deleted with the deferred repository-link feature.
- **Supporting modules adopted from other path lists because this renderer needs them**: `lib/invisibleText`, `lib/textSelection`, `lib/router/appOrigins`, `lib/emoji/shortcodes`, the `markdown-github.i18n` fragment and English renderer keys, `composer/attachments/filePaths.normalizeDroppedPath`, `message/selectionMarkdown.{ts,test}`, `message/imageExport.{ts,test}`, `message/parts/ToolPartDiffPreview`, `views/files/previews/useMarkdownLocalAssets.{ts,test}`, and `contexts/DiffWorkerProvider`. The diff provider cutover is required by the observed worker-init timeout; the others are the delegate targets of the refreshed renderer and editor. Task 13/07/24 own their later integration.
- **Not carried over**: repository-reference linking, diff-origin labels, file-reference chips that depend on the source-control provider registry, and the VS Code branches. Each names its owning task above; none is replaced by an adapter or a fallback engine.

## Final checks (post-rebase)

- `bun install --frozen-lockfile`: 0 (`frozen-install.log`).
- `bun run type-check`: 0 (`root-type-check.log`, re-run after the diff-provider adoption: 0).
- `bun run lint`: 0; one pre-existing unused-disable warning in `tooltip.tsx` (`lint-final.log`).
- `VITEST_MAX_WORKERS=2 bun run test`: 0 — 7/7 workspace suites, 6086 tests passed / 128 skipped (`test-root-final.log`). The known web `network-defaults.test.js` passes with the host config and with `HOME`/`XDG_CONFIG_HOME` at a fresh temp dir (5/5 each, `nd-host.log`, `nd-temp.log`); the earlier `sonner.test.tsx` failure was a parallel-load flake and does not reproduce.
- `bun run dead-code`: inspected (`dead-code2.log`); remaining findings are cross-task or knip's dynamic-import blind spot, enumerated in the round-2 section.
- `bunx oxlint` on the authored paths: 0 (`oxlint-authored.log`).
- `bun run build`: see `build-final.log`; the web bundle was rebuilt again after the diff-provider adoption (`build-web2.log`).

**Check after:** implementation `73b788f123` on integration `43b96abd3b` (rebased over task 05's Electron shell) — `bun install --frozen-lockfile` 0, `bun run type-check` 0, `bun run lint` 0, `VITEST_MAX_WORKERS=2 bun run test` 0 (7/7 suites, 6086 passed, 128 skipped; `test-root-final5.log`), `bun run build` 0 (`build-final2.log`; the web/UI source is unchanged by the Electron-shell landing), `GET /api/agent/v1/ready` 200. Real path on this renderer: dev and built web render the code/table/math/mermaid sample and the file diff (`diffs-container`, 6 lines) with `window.__ohpi_pwned` null and no console/diff-worker errors (`real-path/post-rebase-*.png`, `final-built-*.png`); the two earlier full runs on the same web/UI tree were also 7/7 (`test-root-final4.log`).

**Out of scope note:** the sidebar Contents search / `searchContents` client and the `GET /api/fs/find-in-files` 501 `search-unavailable` mapping are not in this task's path list and were not adopted here; they belong to task 24. No `@vscode/ripgrep` dependency was added.
