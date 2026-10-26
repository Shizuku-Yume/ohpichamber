# 01: Security and lost-state fixes

**Effort:** upstream-refresh
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** The upstream security and lost-state fixes that map to retained code are in the integration branch, with their focused tests: simple-git 4.0.2, passkey rate-limit, GitHub Enterprise token-host check, GitLab OAuth refresh lock, safe.directory in managed transfers, bounded terminal replay parsing, server-side session-link lists, lost-prompt confirmation, settings-write recovery, working-directory recovery, pending-inbox restore, archive restore, search indexing after read-point deletion, and the closed-extension answer fix.

**Blocked by:** None
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/01.tsv` (93 paths: 22 clean/new, 67 both-side, 52 conflicts). Main locations: `packages/web/server/lib/{git,terminal,github,gitlab,openchamber-sessions,message-search,ui-auth,tunnels,permission-auto-accept}` and `server/index.js`, `packages/ui/src/{sync,components/layout,components/views,components/chat,lib/guests}`, `packages/sdk/src` and `packages/sdk/examples` (the extension-answer fix changes the SDK host/protocol), `package.json`, `bun.lock`.

**Read first:** Spec "How it is built" and W2; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/relay-transport/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; `CONVENTIONS.md` §8.
**Covers:** W2

**Check:** `bun install` then `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, and each fix has the upstream test adopted with it or a recorded reproduction that fails before and passes after. Real path: in the running app, a Git status/diff refresh works, a second passkey attempt is rate-limited, and a provider token flow sends the token only to its checked host.

## Done when

- [ ] Every commit listed in the spec's W2 sentence has its test or reproduction recorded in `## Progress`.
- [ ] `simple-git` is `^4.0.2` in root, ui and web manifests; `bun.lock` is regenerated; Git status/log/merge flows still work.
- [ ] No token, refresh token or passkey challenge appears in logs.
- [ ] `lib/opencode-trust` and its three folder-trust fixes are not adopted.
- [ ] The SDK changes from the extension-answer fix are present and the v2 bootstrap is untouched (task 04 keeps it).
