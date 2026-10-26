# 28: Docs: Polish, Portuguese (BR), Turkish, Ukrainian

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** The pl/pt-br/tr/uk documentation is at the upstream revision, aligned with the refreshed English pages and the fork's vocabulary.

**Blocked by:** 26
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/28.tsv` (124 paths: 52 clean/new, 68 both-side, 35 conflicts). Main locations: `packages/docs/content/docs/{pl,pt-br,tr,uk}/`.

**Read first:** Spec W7; `packages/docs/README.md`; the English pages changed by task 26; `.agents/skills/locale-ui-patterns/SKILL.md`.
**Covers:** W7

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run docs:validate` exits 0 and the four locales render with no missing-page or broken-link error. Real path: spot-check one changed page per locale.

## Done when

- [ ] No locale page describes a feature that does not exist.
- [ ] Engine vocabulary matches the fork's terms.
- [ ] Deleted pages are removed from navigation in every locale.
