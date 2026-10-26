# 06: Source-control host providers (server)

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The server can talk to GitHub (including Enterprise), GitLab, Gitea, Gerrit and Forgejo, with the shared source-control provider registry, trackers and the enterprise-host gate.

**Blocked by:** 02, 22
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/06.tsv` (165 paths: 156 clean/new, 3 both-side, 1 conflict; +37k lines). Main locations: `packages/web/server/lib/{source-control,github,gitlab,gitea,gerrit,forgejo,trackers,linear}` and `enterprise-mode.js`.

**Read first:** Spec W5; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md`; `.agents/skills/relay-transport/SKILL.md` (outbound request paths); task 22's route registry.
**Covers:** W5

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the source-control and provider route tests pass, and with the dev server running a local fixture repository lists changes through the Git provider. Real path: connect one real host with credentials if available, otherwise a named fixture stand-in; record which provider behavior is unverified.

## Done when

- [ ] Every provider module is registered through task 22's route composition, not ad-hoc imports in `server/index.js`.
- [ ] GitHub Enterprise token handling checks the host before sending a token (from task 01) and the provider tests cover it.
- [ ] Gitea/Gerrit/Forgejo/Lab clients have their upstream tests; no credentials are logged.
- [ ] Unavailable live hosts are recorded as limits, not passed.
