# 03: Keep reasoning paragraphs and line breaks

**Effort:** ux-feedback-2026-11-15
**Task type:** bugfix
**Blocked by:** None
**Covers:** W3
**Files:** `packages/ui/src/components/chat/message/parts/{ReasoningPart.tsx,ReasoningPart.test.tsx,JustificationBlock.tsx,DOCUMENTATION.md}`, `packages/ui/src/components/chat/markdown/streamdownPlugins.ts`, `packages/ui/src/components/chat/MarkdownRendererImpl.tsx`
**Read first:** spec "How it is built → Chat"; `research/feedback-2026-11-15/ChatRender.md` (B, fix B); `userTextPartContent.ts` hard-break precedent
**Check:** `node scripts/run-isolated-tests.mjs packages/ui/src/components/chat/message/parts/ReasoningPart.test.tsx packages/ui/src/components/chat/MarkdownRendererImpl.test.ts` exits 0 with: `A\n\nB` → two paragraphs; `A\nB` → one paragraph with a `<br>`; a fenced block keeps its blank lines; `<!-- -->` lines render nothing; streaming and settled give the same paragraph count. Real path: the maintainer's session `e8195e49` (thinking block with ~12 `\n\n` paragraphs) shows them separated; a new reasoning turn stays separated while streaming.

- [ ] One exported `cleanReasoningText` keeps empty lines, maps invisible-only lines to empty, collapses runs of blank lines, strips `<!-- -->` sentinels outside code fences, and strips leading `> `; `JustificationBlock` uses it.
- [ ] An in-repo remark plugin turns in-paragraph newlines into breaks, wired only for the `reasoning` variant; the options cache is keyed by that flag. No new dependency.
- [ ] Assistant and user text rendering are unchanged.
- [ ] `DOCUMENTATION.md` states the reasoning line-break rule.
