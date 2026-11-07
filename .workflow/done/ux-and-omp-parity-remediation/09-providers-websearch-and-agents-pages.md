# 09: Restore Providers page (official names & connected-only list), redesign Web Search page, and complete Agents page (tool matrix & thinking effort)

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** 02
**Covers:** W17, W18, W20
**Files:** `packages/agent-service/src/worker/catalog-models.ts`; `packages/ui/src/components/sections/providers/ProvidersPage.tsx`; `packages/ui/src/components/sections/providers/ProviderGrid.tsx`; `packages/ui/src/components/sections/websearch/WebSearchPage.tsx`; `packages/agent-contract/src/session.ts`; `packages/agent-service/src/worker/catalog-agents.ts`; `packages/ui/src/components/sections/agents/AgentsPage.tsx`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `packages/ui/src/components/sections/PATTERNS.md`; `packages/ui/src/lib/theme/STYLING.md`
**Check:** `bun test packages/agent-service/src/worker/ && bun run --cwd packages/ui test && bun run --cwd packages/ui type-check` → exits 0; verifies official provider names, connected-only provider list, redesigned WebSearchPage, and Agent `thinkingLevel`/`spawns` persistence + tool matrix.
- **Base commit:** 5ed41c2c184ba2131c6201db37ccff884bc97d69

- [x] In `packages/agent-service/src/worker/catalog-models.ts`, resolve provider display names using `@oh-my-pi/pi-catalog` `authPolicyFor(providerId)?.name` (e.g. `302.AI`, `Abacus.AI`, `AiHubMix`, `Anthropic`, `OpenAI`) instead of falling back to raw lowercase hyphenated IDs.
- [x] In `packages/ui/src/components/sections/providers/ProvidersPage.tsx` and `ProviderGrid.tsx`, match upstream `0056bf6a9` behavior: show only connected/configured providers in the main list/sidebar, and access unconfigured providers exclusively via the `+ Add Provider` (`ProviderConnectPicker`) modal with Popular grouping and search.
- [x] Redesign `packages/ui/src/components/sections/websearch/WebSearchPage.tsx` per `PATTERNS.md`: use a standard `SettingsFieldRow` + `Select` for primary search provider, `SettingsChipGroup` / ordered list for fallbacks, `NumberInput` for timeout, and `ProvidersPage`-style collapsible provider cards with status badges, password show/hide toggles, and `reportSettingsSaveState` integration.
- [x] Extend `AgentSchema` in `packages/agent-contract/src/session.ts` and `packages/agent-service/src/worker/catalog-agents.ts` (`project` and `write`) to preserve and serialize OMP agent frontmatter fields (`thinkingLevel`, `spawns`, `blocking`, `advisor`), and update `packages/ui/src/components/sections/agents/AgentsPage.tsx` to replace the raw text tool input with the upstream tool toggle matrix/checklist plus `Thinking Level` (思考强度) and `Spawns` selectors.

## Progress

- Check before: Providers page displayed raw lowercase hyphenated IDs and dumped 96+ unconfigured providers into the main view; WebSearchPage used unstyled cleartext controls without collapsible cards or save state feedback; Agents page used a raw text tool input and omitted OMP AgentDefinition frontmatter fields.
- Check after:
  - `bun run --cwd packages/agent-contract build && bun run --cwd packages/agent-service build` -> Exit 0; built contract schemas and agent-service bundles with thinkingLevel, spawns, blocking, advisor.
  - `bun test packages/agent-service/src/worker/` -> 271 pass, 10 skip, 0 fail; verifies official display names from authPolicyFor and agent frontmatter persistence.
  - `node scripts/run-isolated-tests.mjs packages/ui/src/components/sections/providers packages/ui/src/components/sections/websearch packages/ui/src/components/sections/agents` -> 5/5 test files passed.
  - `bun run --cwd packages/ui test` -> 1029/1029 test files passed.
  - `bun run --cwd packages/ui type-check` -> Exit 0; 0 type errors in 2,975 files across 2 projects.
  - `bunx oxlint` across touched files -> Exit 0; 0 errors, 0 warnings.
