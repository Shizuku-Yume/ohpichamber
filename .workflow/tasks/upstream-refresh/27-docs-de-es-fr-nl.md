# 27: Docs: German, Spanish, French, Dutch

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** The de/es/fr/nl documentation is at the upstream revision, with terminology aligned to the refreshed English pages and the fork's engine vocabulary.

**Blocked by:** 26
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/27.tsv` (124 paths: 52 clean/new, 68 both-side, 32 conflicts). Main locations: `packages/docs/content/docs/{de,es,fr,nl}/`.

**Read first:** Spec W7; `packages/docs/README.md`; the English pages changed by task 26; `.agents/skills/locale-ui-patterns/SKILL.md` (for product terminology).
**Covers:** W7

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run docs:validate` exits 0 and the four locales render with no missing-page or broken-link error. Real path: spot-check one changed page per locale against the English page.

## Done when

- [ ] No locale page describes a feature that does not exist.
- [ ] Engine vocabulary matches the fork's terms; OpenCode is not named as the runtime.
- [ ] Deleted upstream pages are removed from navigation in every locale.
