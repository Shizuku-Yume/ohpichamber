# 06: Collect environment values for local MCP servers at install

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 04
**Covers:** W4
**Files:** `packages/ui/src/lib/integrations-catalog/{registry.ts,types.ts}`, `packages/ui/src/components/views/IntegrationsCatalogView.tsx`, `packages/ui/src/lib/i18n/messages/integrations-catalog.i18n.ts`
**Read first:** `research/feedback-2026-11-15/IntegrationOAuth.md` (F6, fix 7); `McpPage.tsx` env/header editor and `attachMcpToken` precedent
**Check:** UI test: installing `grafana` without `GRAFANA_URL` keeps Install disabled with the field marked required; with values filled, the saved server carries `envCredentialRefs` and no plaintext value in the config. Real path: install `mongodb` with a connection string at project scope; the server connects or reports its real handshake error, not "Could not install".
**Base commit:** 68e6a1dd10e1e771009278a677d41918deb27b5d

- [x] Catalog local entries can declare `envInputs` (`id`, `envName`, label key, required).
- [x] The install form renders them beside the token field and writes them through the workspace-credential path as env credential references.
- [x] `grafana`, `mongodb`, `mcp-toolbox` and `azure-devops` declare their inputs; copy in all 15 locales.

## Progress

- Check before: a `mongodb` install collected no environment values at all (research F6: local entries were `auth: 'none'` with no inputs), so the server was saved without `MDB_MCP_CONNECTION_STRING` and failed at handshake with the generic "Could not install" toast. The first real-path run reproduced that shape, then two further runs exposed staging-save and no-worker probe-detail defects, all fixed on this branch.
- Check after:
  - `cd packages/ui && VITEST_MAX_WORKERS=2 bun test src/components/views/IntegrationsCatalogView.test.tsx src/lib/integrations-catalog/registry.test.ts src/lib/i18n/messages.test.ts src/lib/i18n/chinese-token-copy.test.ts` -> 56 pass, 0 fail, 6306 expect() calls across 4 files. `grafana` without `GRAFANA_URL` keeps Install disabled with the field `required`; filled, the saved server carries `envCredentialRefs` and no plaintext value.
  - `VITEST_MAX_WORKERS=2 bun test packages/agent-service/src/worker/mcp.test.ts packages/agent-service/src/supervisor/catalog-mcp.test.ts` -> 29 pass, 0 fail, 189 expect() calls across 2 files.
  - Real path: `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task06/receipt.md` (PASS at `3e62606515`, fourth run; evidence `01`-`06`.png). Visible UI: empty connection string -> `required` field and disabled Install; filled -> Project scope forced with the project-only hint, while a no-env entry keeps the default Project scope with User selectable; install reports the server's own outcome. Two npx-cache states, same walk: cold tree -> "Connection to MCP server \"mongodb\" timed out after 30000ms" against the catalog `LOCAL_TIMEOUT_MS`, warm tree -> `connected` with `toolCount: 18` and "Installed 1". Saved config and `.omp/mcp.json` carry only `envCredentialRefs`; the fake value appears only in the Agent Service credential store.
- Files outside the `Files:` list, and why: `packages/agent-service/src/supervisor/{catalog.ts,catalog-mcp.test.ts}` (the no-worker probe now passes its own failure cause to `MCP_APPLY_FAILED` instead of the generic apply sentence, and classifies auth from it) and `packages/agent-service/src/worker/{mcp.ts,mcp.test.ts}` (resolve the new env credential refs and scrub resolved secret values out of failure details); `packages/ui/src/lib/integrations-catalog/registry.test.ts` and `.../integrations-catalog/DOCUMENTATION.md` (cover and document `envInputs`); `packages/agent-service/DOCUMENTATION.md` (probe cause on the no-worker path); `.workflow/decisions.md` (project-scope-only for env installs) and `.workflow/technical-debt.md` (abandoned session-admission row, plus the pre-existing user-scope credential-reference hazard recorded at review round 3).
- Post-merge check (merging `ux-feedback-2026-11-15/integration` at `32876d555a` into the branch, no conflicts: that branch never touched `IntegrationsCatalogView.tsx`, `catalog.ts`, the catalog registry or `integrations-catalog.i18n.ts`):
  - UI scoped tests (same four files) -> 56 pass, 0 fail, 6306 expect() calls.
  - `VITEST_MAX_WORKERS=2 bun test packages/agent-service/src/worker/mcp.test.ts packages/agent-service/src/supervisor/catalog-mcp.test.ts` -> 29 pass, 0 fail, 189 expect() calls.
  - `bun run --cwd packages/ui type-check` -> no type errors in 3,540 files across 2 projects; `bun run --cwd packages/agent-service type-check` -> exit 0.
  - `bunx oxlint` over every TS/TSX file changed since the base -> exit 0, no findings. `bun run dead-code` -> exits 1 on its pre-existing baseline only (no entry for `envInputs`, `CatalogEnvInput` or the changed agent-service modules); `CatalogEnvInput` is exported and used inside `registry.ts` only.
  - `bun run --cwd packages/agent-service build` -> bundled 74 modules, exit 0.
- Review: pass (base 68e6a1dd10e1e771009278a677d41918deb27b5d) - independent read-only reviewer worker session `fb06-review`, which wrote none of the code, two rounds. Round 1 blocking: user-scope installs wrote workspace-scoped credential refs into the shared user MCP file, and the real-path evidence was stale; both fixed. Round 2 blocking: the default install scope had regressed to project-only for every entry; fixed by forcing project scope only when env values are filled, recorded in `decisions.md`. Round 3 (final code at `3e62606515`): APPROVE, no open blocking. Non-blocking notes: the worker scrubber also redacts non-secret environment values such as `POSTGRES_HOST`, and the user-scope token-entry credential-ref hazard is pre-existing, now recorded in `technical-debt.md`.
