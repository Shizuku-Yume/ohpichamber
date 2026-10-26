# 29: Docs: Japanese, Korean, Chinese and doc assets

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** The ja/ko/zh-cn documentation and the remaining doc assets are at the upstream revision, aligned with the refreshed English pages.

**Blocked by:** 26
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/29.tsv` (110 paths: 52 clean/new, 52 both-side, 25 conflicts; includes `docs/references/` images). Main locations: `packages/docs/content/docs/{ja,ko,zh-cn}/`, `docs/references/`.

**Read first:** Spec W7; `packages/docs/README.md`; the English pages changed by task 26; `.agents/skills/locale-ui-patterns/SKILL.md`.
**Covers:** W7

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run docs:validate` exits 0 and the three locales render with no missing-page or broken-link error. Real path: spot-check one changed page per locale and one image reference.

## Done when

- [ ] No locale page describes a feature that does not exist.
- [ ] Engine vocabulary matches the fork's terms.
- [ ] Doc images resolve from the repository; no external hotlink is introduced.
