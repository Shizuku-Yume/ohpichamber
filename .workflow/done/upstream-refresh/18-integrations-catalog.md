# 18: Integrations catalog

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** af13a5c57c

**Delivers:** The integrations catalog page, its 116-entry data set, vendor logos and skill links render and search.

**Blocked by:** 10, 22
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/18.tsv` (10 paths: all clean/new). Main locations: `packages/ui/src/lib/integrations-catalog/`, `packages/ui/src/components/views/IntegrationsCatalogView*`, catalog assets.

**Read first:** Spec W6; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md` (third-party links and egress).
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the catalog tests pass, and in the running app the catalog lists entries, search filters them, and an entry's detail opens its skill/vendor link. Real path: open one integration and confirm the link target.

## Done when

- [x] All catalog entries resolve to an existing skill or documented integration.
- [x] Logos are local assets; no remote image fetch on render.
- [x] Links that leave the app respect the external URL policy.

## Progress

### Base and method

Worktree `upstream-refresh-18`, branch `upstream-refresh/18`, cut from the integration tip
`af13a5c57c` (tasks 05, 08, 09, 22, 23 and the toolchain landed). Every path was taken from
`0056bf6a9` whole except where a fork store and OpenCode-shaped data forced an adaptation;
the page was then bound to the canonical stores the fork actually has.

### Path dispositions (all 10 in `plan-paths/18.tsv`)

| Path | Disposition |
|---|---|
| `lib/integrations-catalog/registry.ts` | **Adopted, 4 entries removed.** 162 entries (166 upstream). `langfuse-plugin`, `langsmith-plugin`, `opencode-claude`, `opencode-search-providers` are OpenCode npm plugins; OMP loads native `@oh-my-pi/pi-coding-agent` plugins, so none of them would run. The `plugin` component kind and its install path remain for a native plugin entry. All icon names resolve in task 10's sprite (71 names checked). |
| `lib/integrations-catalog/registry.test.ts` | **Adopted whole.** Store-agnostic. |
| `lib/integrations-catalog/brand-icons.ts` | **Adopted whole.** Generated simple-icons glyphs and brand colors, bundled. |
| `lib/integrations-catalog/vendor-logos.ts` | **Adopted whole.** `import.meta.glob` over the 89 local `assets/integration-logos/*.webp` files task 10 landed; no runtime image fetch. |
| `lib/integrations-catalog/generate-brand-icons.mjs` | **Adopted whole.** Authoring script, offline, run by hand. |
| `lib/integrations-catalog/generate-vendor-logos.mjs` | **Adopted whole.** Authoring script, offline, run by hand. |
| `lib/integrations-catalog/probe-mcp.mjs` | **Adopted whole.** Maintainer vetting tool; it contacts a vendor only when run by hand with a URL. |
| `lib/integrations-catalog/DOCUMENTATION.md` | **Adopted, extended** with an "In this fork (OMP)" section: canonical MCP config + credential refs, skills through the Skills catalog page, no OpenCode plugin entries, enterprise gating, outbound-link policy. |
| `components/views/IntegrationsCatalogView.tsx` | **Adapted.** Upstream page, layout, search and detail kept. Data bound to canonical stores: `useMcpConfigStore` (`MCPServerConfig` with stdio/http transport; a token is written as a workspace credential and referenced through `credentialRef` / `headerCredentialRefs`), `useMcpStore` (`getMcpServerStatus`: ready/unavailable/disabled/unapplied — the canonical contract has no `needs_auth`, so the OAuth sign-in panel opens for an installed, not-connected OAuth server), `usePluginsStore` (`catalog.plugins` package targets, `installPlugin`/`uninstallPlugin`; no npm-registry update flag exists, so the "update available" pill is gone), `useGuestsStore` + `installGuest`/`uninstallGuest`, and `useSkillsStore`. A skill's installed check matches the canonical authored path (`authoredSkillId === skillDir`) and name; skill install opens the Skills catalog page, which owns the repository source, scan and conflict prompt (no canonical installer for an arbitrary repo). The plugin-confirm dialog and uninstall flow stay. `useEnterpriseMode` renders nothing in enterprise mode. |
| `components/views/IntegrationsCatalogView.test.tsx` | **Adapted.** Eight happy-dom tests on the canonical store shapes: list/detail/back, category chip, search ranking, rail, full-page surface flag contract, runtime status mapping (ready/failed/disabled), authored-skill matching, scroll restore, and no OpenCode plugin entries. |

### Out-of-list wiring (recorded, with the owner that may rebase over it)

- `lib/i18n/messages/integrations-catalog.i18n.ts` (task 20's path): **adopted whole**, because the page cannot type-check or render without its 432 keys per locale; the module already carries all 15 locales, including the fork's pt-BR, zh-CN and zh-TW. Task 20 should treat it as adopted. Two surface strings were adapted for the fork (`integrationsCatalog.local.note`, `integrationsCatalog.uninstall.description`: OpenChamber and the workspace instead of the OpenCode config) in every locale.
- The 13 fork locale dictionaries: one import and one spread each (`integrationsCatalogI18n['<locale>']`). Additive; task 20 keeps ownership.
- `components/layout/MainLayout.tsx` (task 09's path): one lazy loader, one `isIntegrationsCatalogOpen` state read, the flag in `isSurfacePageOpen`, one `OnDemand` mount. Additive.
- `components/session/sidebar/shell/SidebarHeader.tsx` (task 08's path): the upstream catalog button after Archive, hidden in enterprise mode. Additive.
- `stores/useUIStore.ts` already carried `isIntegrationsCatalogOpen` and its mutually-exclusive-surface behaviour; nothing changed there.

### Enterprise boundary

The catalog makes no request on render: logos are bundled assets or inline glyphs, and
vendor links are `href`s. Every link that leaves the app is `target="_blank"` with
`rel="noreferrer"` (checked in the running app). In enterprise mode the page is hidden at
the sidebar and the view renders nothing; installs go through the same Host routes as
Settings (guests, plugins, MCP), which own their refusals.

**Check after:** install, type-check, lint and the full test suite exit 0 on the tree that lands; the catalog tests pass; the real-path catalog list, search and detail link are recorded below.

### Checks (worktree, Bun 1.4.4)

Artifacts: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-18-2026-10-27/`.

- `bun install --frozen-lockfile`: exit 0 (`logs/install.log`).
- `bun run type-check`: exit 0, 2751 files across 5 projects, no errors (`logs/type-check.log`).
- `bun run lint`: exit 0 (one pre-existing unused-directive warning in `ui/tooltip.tsx`) (`logs/lint.log`).
- `bun run test`: exit 0, 7/7 workspace suites (web 6305 passed/142 skipped, UI 250 tests, electron 54 files) (`logs/test.log`). The known agent-service eviction case passed here.
- Catalog tests: `bun test registry.test.ts IntegrationsCatalogView.test.tsx messages.test.ts` — 24 pass, 0 fail (`logs/catalog-tests.log`).
- `bunx oxlint` on the new and rewritten files: no findings (`logs/oxlint.log`).
- `bun run dead-code`: exit 1 with the integration tip's baseline findings and none from this task's files (`logs/dead-code.log`).

### Real path (dev server, isolated data dir, ports 5191/3953)

`bun run dev` with `OPENCHAMBER_DATA_DIR` and `HOME` under the artifact directory. In Chrome:

- The sidebar's Integrations catalog button opened the page; it lists the featured entries and the category sections with local logo assets (`screenshots/catalog-browse.png`).
- Typing `playwright` narrowed the list to one "Results 1" row (`screenshots/catalog-search.png`).
- Opening Playwright showed the MCP command, its skill row and its links. The skill link target is `https://github.com/openai/skills/tree/HEAD/skills/.curated/playwright`; the three outbound links carry `rel="noreferrer"` (`screenshots/catalog-detail-playwright.png`).
- Every logo request on the page went to the bundled `assets/integration-logos/*.webp` under the app origin; no vendor image host was contacted.

### Limits

- No catalog entry was installed end to end; the check covers browse, search, detail and link
  targets. MCP credential writes, plugin install and extension install reuse the Settings
  flows and are covered by their suites, not by a live install here.
- The "update available" pill for npm plugins has no canonical source and is not shown.
- A future native plugin entry needs the plugin install path exercised against a real
  OMP plugin package.
- Out-of-list wiring in `MainLayout`, `SidebarHeader` and the locale dictionaries may
  conflict with later task 08/09/20 rebases; the edits are one block each.
