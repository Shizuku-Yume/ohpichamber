# 03: Keep reasoning paragraphs and line breaks

**Effort:** ux-feedback-2026-11-15
**Task type:** bugfix
**Blocked by:** None
**Covers:** W3
**Files:** `packages/ui/src/components/chat/message/parts/{ReasoningPart.tsx,ReasoningPart.test.tsx,JustificationBlock.tsx,DOCUMENTATION.md}`, `packages/ui/src/components/chat/markdown/streamdownPlugins.ts`, `packages/ui/src/components/chat/MarkdownRendererImpl.tsx`
**Read first:** spec "How it is built → Chat"; `research/feedback-2026-11-15/ChatRender.md` (B, fix B); `userTextPartContent.ts` hard-break precedent
**Check:** `node scripts/run-isolated-tests.mjs packages/ui/src/components/chat/message/parts/ReasoningPart.test.tsx packages/ui/src/components/chat/MarkdownRendererImpl.test.ts` exits 0 with: `A\n\nB` → two paragraphs; `A\nB` → one paragraph with a `<br>`; a fenced block keeps its blank lines; `<!-- -->` lines render nothing; streaming and settled give the same paragraph count. Real path: the maintainer's session `e8195e49` (thinking block with ~12 `\n\n` paragraphs) shows them separated; a new reasoning turn stays separated while streaming.
**Base commit:** 2c00a18729d9bcc6bf8be8a9ba07fb3bae05abec

- [x] One exported `cleanReasoningText` keeps empty lines, maps invisible-only lines to empty, collapses runs of blank lines, strips `<!-- -->` sentinels outside code fences, and strips leading `> `; `JustificationBlock` uses it.
- [x] An in-repo remark plugin turns in-paragraph newlines into breaks, wired only for the `reasoning` variant; the options cache is keyed by that flag. No new dependency.
- [x] Assistant and user text rendering are unchanged.
- [x] `DOCUMENTATION.md` states the reasoning line-break rule.

## Progress

- **Check after:**
  - The task's literal Check does not run: `node scripts/run-isolated-tests.mjs <file…>` exits 1 with `run-isolated-tests: not a directory: …` because the runner takes directories only.
  - `VITEST_MAX_WORKERS=2 node scripts/run-isolated-tests.mjs packages/ui/src/components/chat/message/parts` → **30/30 test files passed**; `… packages/ui/src/components/chat/markdown` → **23/23 test files passed**; `bun test packages/ui/src/components/chat/MarkdownRendererImpl.test.ts` → **36 pass / 0 fail**, 251 expect calls. The parts suite carries `reasoningText.test.ts` (whole-line sentinel policy, quoted fences, backtick info strings, CRLF) and `ReasoningPart.test.tsx` (two `<p>` for `A\n\nB`, one `<p>` with a `<br>` for `A\nB`, fence blank lines, no sentinel text, streaming and settled paragraph parity, `LONG_REASONING` not collapsed); the renderer suite carries the reasoning-only line-break variant, its options-cache keying and the non-reasoning unchanged cases.
  - `bunx oxlint -c oxlint.config.ts` on the changed TS/TSX paths: 0 findings. `cd packages/ui && bun run type-check`: no type errors in 3,537 files across 2 projects. `bun run dead-code` exits 1 on the effort's pre-existing baseline and names none of our files or exports.
  - Receipts: `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task03/check-after.log`.
- **Real path** (isolated `HOME`/data dir, Host on `:4143`, CLIProxyAPI `claude-sonnet-5-5`): the copied maintainer session `e8195e49` expanded to **19 `<p>`, 0 `<br>`** for its 19 `\n\n` separators (`paragraphs.json`, `thinking-expanded.png`); a fresh turn settled at **3 `<p>` == 3 source paragraphs**, and an in-page poller watched the streaming body grow 0 → 2 → 3 without collapsing (`stream-counts.json`, `stream-settled.png`).
- **Real-path limitation:** no strictly-partial mid-stream screenshot was captured (8 attempts; the ~1 s CLI screenshot latency exceeded the 2–5 s visible partial window, though a gated in-page poller did sample `p=2` live). Two provider turns ended `Agent execution failed` with zero assistant messages — provider-side, not rendering. The real-path build came from HEAD before `58ef3b988c`, which changed only `cleanReasoningText` edge cases (quoted fences, inline sentinel, CRLF, backtick info string) now covered by unit tests.
- **Files beyond the task list:** `packages/ui/src/components/chat/message/parts/reasoningText.ts` (the one exported `cleanReasoningText`, imported by `ReasoningPart.tsx` and `JustificationBlock.tsx`), `reasoningText.test.ts`, and `packages/ui/src/components/chat/markdown/remarkLineBreaks.ts` (the in-repo break plugin; no new dependency).
- **Review:** pass (independent worker `fb15-03-reviewer`, base `2c00a18729d9bcc6bf8be8a9ba07fb3bae05abec`; round 1 blocking quoted-fence finding fixed in `58ef3b988c`; round 2 no blocking findings).
