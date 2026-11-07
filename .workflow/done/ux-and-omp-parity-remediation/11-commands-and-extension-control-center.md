# 11: Project all 29 built-in OMP commands in CommandsPage and build the OMP Extension Control Center in PluginsPage

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** None
**Covers:** W21, W22
**Files:** `packages/agent-service/src/worker/catalog-resources.ts`; `packages/ui/src/components/sections/commands/CommandsPage.tsx`; `packages/ui/src/components/sections/commands/CommandsSidebar.tsx`; `packages/agent-contract/src/plugins.ts`; `packages/agent-service/src/worker/catalog-plugins.ts`; `packages/ui/src/components/sections/plugins/PluginsPage.tsx`; `packages/ui/src/stores/usePluginsStore.ts`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `packages/ui/src/components/sections/PATTERNS.md`; `.agents/skills/ui-api-decoupling/SKILL.md`
**Check:** `bun test packages/agent-service/src/worker/ && bun run --cwd packages/ui test && bun run --cwd packages/ui type-check` → exits 0; verifies all 29 built-in OMP commands appear in Commands catalog and OMP Extension Control Center lists providers, rules, skills, hooks, and toggles.
- **Base commit:** 5ed41c2c184ba2131c6201db37ccff884bc97d69
- [x] In `packages/agent-service/src/worker/catalog-resources.ts`, `CommandsSidebar.tsx`, and `CommandsPage.tsx`, project all 29 OMP built-in slash commands (`ALLOWED_BUILTIN_COMMANDS`: `/compact`, `/shake`, `/todo`, `/jobs`, `/usage`, `/context`, `/tools`, `/handoff`, `/retry`, `/rename`, `/effort`, `/model`, `/switch`, `/fast`, `/slow`, `/clear`, `/dirs`, `/pin`, `/fresh`, `/force`, `/prewalk`, `/session`, `/memory`, `/btw`, etc.) as read-only built-in command entries with localized descriptions alongside user-defined `.omp/commands/*.md` templates.
- [x] Extend `packages/agent-contract/src/plugins.ts` (extended directly; `resources.ts` was absent in base) and `packages/agent-service/src/worker/catalog-plugins.ts` to expose OMP's native **Capability Registry & Extension Control Center** (`getAllProvidersInfo()`, `loadCapability()`, `isProviderEnabled()`, `enableProvider()`, `disableProvider()`, and per-extension `cfgDisabledExtensions` toggles) across all 22 registered discovery providers (`OMP`, `Builtin Defaults`, `Agent Dirs (.agent/.agents)`, `OpenAI Codex`, `Skillshare`, `OMP Extension Packages`, `Claude Code`, `Agent Plugins`, `Claude Code Marketplace`, `Gemini CLI`, `OpenCode`, `Cursor`, `Windsurf`, `Cline`, `GitHub Copilot`, `VS Code`, `AGENTS.md`, `CLAUDE.md`, `Custom context files`, `Managed Skills`, `MCP Config`, `SSH Config`; 22 observed vs 21 in brief without changing acceptance objective) and discovered items (`Skills`, `Rules`, `Hooks`, `Context files`, `Slash commands`, `Tools`, `MCP`, `SSH`).
- [x] Rebuild `packages/ui/src/components/sections/plugins/PluginsPage.tsx` to include the **OMP Extension Control Center** matching OMP TUI (`ALL (N)` + provider filter tabs, search input, grouped `Skills` / `Rules` / `Hooks` / `Context files` list with active/disabled/shadowed status dots, master provider and per-item enable/disable toggles, and right-hand inspector showing origin path and full instructions), while retaining the npm/local package installer tab.

## Progress

- **Review:** Final focused review PASS (zero blockers; report `ux-11/final-review.md`).

### Check Before & After
- **Check Before:**
  - Commands catalog only listed 1 command (`/init`). All 29 built-in commands were absent.
  - Baseline UI/API exposed no extension inventory (native OMP discovery was unprojected).
- **Check After:**
  - `packages/agent-service/src/worker/`: 273 pass, 10 skip, 0 fail (283 tests across 27 files).
  - `packages/ui` test: 1,029/1,029 test files passed (exit 0).
  - `packages/ui` type-check: ✓ No type errors in 2,977 files across 2 projects.
