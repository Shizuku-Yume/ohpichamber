# 18: Integrations catalog

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The integrations catalog page, its 116-entry data set, vendor logos and skill links render and search.

**Blocked by:** 10, 22
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/18.tsv` (10 paths: all clean/new). Main locations: `packages/ui/src/lib/integrations-catalog/`, `packages/ui/src/components/views/IntegrationsCatalogView*`, catalog assets.

**Read first:** Spec W6; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md` (third-party links and egress).
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the catalog tests pass, and in the running app the catalog lists entries, search filters them, and an entry's detail opens its skill/vendor link. Real path: open one integration and confirm the link target.

## Done when

- [ ] All catalog entries resolve to an existing skill or documented integration.
- [ ] Logos are local assets; no remote image fetch on render.
- [ ] Links that leave the app respect the external URL policy.
