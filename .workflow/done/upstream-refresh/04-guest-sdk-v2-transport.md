# 04: Guest SDK: upstream APIs with the fork transport

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** `packages/sdk` carries upstream's Guest contract additions (service providers, workspace/status views) while keeping the fork's private `MessagePort` `v: 2` bootstrap and `3.0.0` version.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/04.tsv` (30 paths: 23 clean/new, 7 both-side, 3 conflicts). Main locations: `packages/sdk/src`, `packages/sdk/examples`, `packages/sdk/scripts`, `packages/sdk/{API,DOCUMENTATION,GUEST_SERVICES}.md`.

**Read first:** Spec W4; decisions.md: 2026-10-24 - Break the Guest SDK version for the private bootstrap transport; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; `packages/sdk/DOCUMENTATION.md`.
**Covers:** W4

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run --cwd packages/sdk test` and the example/script tests pass, and the v2 bootstrap test still proves a v1 `hello` is refused with the version-mismatch pane. Real path: load one built-in extension in the running app and see its panel connect.

## Done when

- [ ] The `v: 2` envelope and bootstrap handshake are unchanged; `@openchamber/sdk` is 3.0.0; manifest `apiVersion` stays 1.
- [ ] Upstream service-provider and workspace types are exported from `src/index.ts` and consumed by tasks 06/07 without copying types into `packages/ui`.
- [ ] Examples build and the example tests pass.
- [ ] No pre-v2 compatibility path is reintroduced.
