# 12: Markdown, diff and rendering libraries

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Upstream's Markdown/message and diff rendering stack (Streamdown-based rendering, sanitized HTML, syntax highlighting, CodeMirror behavior) replaces the fork's parallel renderer without changing message data.

**Blocked by:** 10, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/12.tsv` (63 paths: 51 clean/new, 11 both-side, 11 conflicts). Main locations: `packages/ui/src/lib/{messages,diff,shiki,codemirror,markdown*}`, `packages/ui/src/lib/blocks/`, and the renderer components (`MarkdownRenderer*`, `DiffPreview`, `LongErrorText`, `FormMarkdown`).

**Read first:** Spec W6; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; upstream `streamdown`/`rehype-sanitize` notes in `packages/ui/package.json`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the renderer and diff tests pass, and in the running app a message with code fences, math, tables, links and images renders; a diff shows hunks and a long file scrolls without jank. Real path: send a prompt that returns a code block and a diff.

## Done when

- [ ] One renderer path remains; the fork's parallel marked/dompurify renderer is removed rather than kept as a fallback.
- [ ] HTML is sanitized and no raw provider HTML reaches the DOM.
- [ ] Incremental/streaming rendering keeps the existing append-only performance behavior.
- [ ] CodeMirror and syntax highlighting behavior matches upstream, including large files.
