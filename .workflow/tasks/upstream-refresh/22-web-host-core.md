# 22: Web host core

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The Host Gateway core matches upstream: server composition and route registry, guests, Git and filesystem modules, sessions/control, walkthrough, scheduled tasks, routing, CLI and web build/public assets.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/22.tsv` (216 paths: 149 clean/new, 65 both-side, 42 conflicts). Main locations: `packages/web/server/lib/{guests,git,fs,openchamber-sessions,openchamber-control,walkthrough,scheduled-tasks,routing,event-stream,...}`, `packages/web/server/index.js`, `packages/web/src`, `packages/web/bin`, `packages/web/public`. Carries the desktop-host update producer that task 10's `UpdateDialog` needs: expose the `installBlocked` states (desktop-host install, service-manager, and the other upstream values) on the host update state; task 25 maps them in `useUpdateStore`. Task 22's branch already adopted `lib/source-control/{project-path,provider-id}.js` from task 06's list as prerequisites (they are no-ops for task 06).

**Read first:** Spec W6; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/relay-transport/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `packages/web/bin/lib/DOCUMENTATION.md`; module `DOCUMENTATION.md` files.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the web test suite passes, `bun run dev` serves the UI and `/api/agent/v1/ready` returns 200, a Git status/diff request and a filesystem read work, and a Guest panel connects through the Host.

## Done when

- [ ] `server/index.js` composes route modules through one registry; later tasks add routes there without ad-hoc imports.
- [ ] Host services keep their owners; no inherited OpenCode lifecycle is reintroduced.
- [ ] CLI flags, `--json`, and non-TTY behavior stay as the fork documents.
- [ ] Web/PWA assets and the service worker update from upstream.
- [ ] Guest lifecycle and file/git boundaries keep their tests.
- [ ] The host update state exposes every `installBlocked` value `UpdateDialog` renders, including the desktop-host branch; VS Code-only update kinds stay out.
- [ ] Task 06's `lib/source-control/{project-path,provider-id}.js` prerequisites are already at upstream content; task 06 treats them as no-ops.
