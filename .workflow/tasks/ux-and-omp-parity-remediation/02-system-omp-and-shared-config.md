# 02: Prefer system-installed OMP runtime, unify ~/.omp config sync, and fix Skills Catalog directory fallback

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** None
**Covers:** W9, W24
**Files:** `packages/electron/agent-runtime.mjs`; `packages/electron/main.mjs`; `packages/web/server/lib/host/agent-runtime.js`; `packages/agent-service/src/worker/native-runtime.ts`; `packages/agent-service/src/worker/catalog-models.ts`; `packages/ui/src/stores/useSkillsCatalogStore.ts`; `packages/ui/src/components/sections/openchamber/DesktopAppSettings.tsx`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.agents/skills/desktop-shell/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`
**Check:** `bun test packages/agent-service/src/worker/ packages/ui/src/stores/useSkillsCatalogStore` → exits 0; system `omp` detection and `~/.omp` config/model/session sync tests pass, and `useSkillsCatalogStore.loadCatalog()` succeeds when `activeProject` is null.

- [ ] In `packages/electron/agent-runtime.mjs`, `packages/electron/main.mjs`, and `packages/web/server/lib/host/agent-runtime.js`, detect a system-installed `omp` binary / `@oh-my-pi/pi-coding-agent` installation (`PATH`, `~/.bun/bin/omp`, `~/.local/bin/omp`, `/usr/local/bin/omp`, `/usr/bin/omp`) and prefer it over the bundled runtime when present and compatible (with fallback to bundled runtime and visibility in `DesktopAppSettings.tsx`).
- [ ] In `packages/agent-service/src/worker/native-runtime.ts` and `catalog-models.ts`, align `config.yml` and `models.yml` / `models.json` discovery and writes with standalone `omp` across `~/.omp/agent/` and `~/.omp/` so models, settings, credentials (`auth.json`), and session history (`~/.omp/agent/sessions/`) stay 100% synchronized with local `omp`.
- [ ] In `packages/ui/src/stores/useSkillsCatalogStore.ts`, replace the single-source `useProjectsStore.getState().getActiveProject()?.path` lookup with a multi-tiered fallback chain (`settingsProjectPath` $\to$ `currentDirectory` $\to$ `activeProject.path` $\to$ `hostFilesystem.getDirectory()` $\to$ home/agent directory) so opening Skills Catalog without an active project never throws `Workspace directory is unavailable`.
