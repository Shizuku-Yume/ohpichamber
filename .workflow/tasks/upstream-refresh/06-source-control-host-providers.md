# 06: Source-control host providers (server)

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** af13a5c57c

**Delivers:** The server can talk to GitHub (including Enterprise), GitLab, Gitea, Gerrit and Forgejo, with the shared source-control provider registry, trackers and the enterprise-host gate. A token is sent only to a checked enterprise host, with b9f03f0f10's test.

**Blocked by:** 02, 22
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/06.tsv` (167 paths: 156 clean/new, 3 both-side, 1 conflict; +37k lines). Main locations: `packages/web/server/lib/{source-control,github,gitlab,gitea,gerrit,forgejo,trackers,linear}` and `enterprise-mode.js`.

**Read first:** Spec W5; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md`; `.agents/skills/relay-transport/SKILL.md` (outbound request paths); task 22's route registry.
**Covers:** W5

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the source-control and provider route tests pass, and with the dev server running a local fixture repository lists changes through the Git provider. A malformed enterprise instance (`user@host`, `host/path`, a port) answers 400 before any request. Real path: connect one real host with credentials if available, otherwise a named fixture stand-in; record which provider behavior is unverified.

## Done when

- [ ] Every provider module is registered through task 22's route composition, not ad-hoc imports in `server/index.js`.
- [ ] A token is sent only to a checked enterprise host, with b9f03f0f10's test carried into the file that owns the auth route at the tip; the old `github/routes.*` files are deleted as upstream did, and their behavior lives in the provider modules.
- [ ] Gitea/Gerrit/Forgejo/Lab clients have their upstream tests; no credentials are logged.
- [ ] Unavailable live hosts are recorded as limits, not passed.

## Progress

### Method and base

- Worktree `upstream-refresh-06`, branch `upstream-refresh/06`, branched from `upstream-refresh/integration` at `af13a5c57c`.
- Every path in `plan-paths/06.tsv` was compared against `0056bf6a9` and `1f9320062`. 114 upstream additions and 42 fork-untouched upstream changes were taken whole; the 8 upstream deletions were applied; the 3 both-side paths were three-way merged against the current integration tip (not prep blobs).
- WIP commit `5409e85790` carries everything below. The branch is **not green yet**: two git test groups fail, and the real path and landing are not done (see *Remaining*).

### Adopted / adapted

- **Provider registry.** `source-control/{provider-registry,provider-descriptors,provider-descriptor.test-support,provider-contract.d.ts,provider-id,pat-account-auth,standard-mutations,extension-descriptor,extension-provider,extension-providers,outbound-handles,origin-instance,change-id,repository-network,auth-storage,provider-routes,provider-routes.*.test}.js` adopted whole. `auth-storage.js` replaces `gitlab/auth-storage.js` as the one server token store.
- **Providers.** `github/{accounts,change-request-patch,descriptor,host-trust,mappers,mutations,octokit.test,pr-status-host-scope.test,provider,rate-limit.test,repo/index.test,resources}.js` and the refreshed `github/{auth,auth.test,gh-cli-credential,gh-cli-credential.test,octokit,pr-status,pr-status.test,pr-summaries,pr-summaries.test,rate-limit,reference-search,reference-search.test,repo/fork-detection,repo/index}` taken whole; `github/{index,routes,routes.*.test}.js` deleted, their behavior now in `source-control/provider-routes.js`. GitLab's clean changes and `gitlab/{descriptor,provider}.js`; `gitlab/routes.js` + test deleted. Gitea, Gerrit and Forgejo modules adopted whole with their upstream tests and fixtures.
- **Composition.** `lib/host/feature-routes-runtime.js` is the only registration point: one shared auth store with provider-owned OAuth renewal, one provider registry, the outbound handle route, the tracker registry, a cache configured from both registries, the extension-provider reconciler, and `registerTrackerRoutes`. Additions are an additive block; existing registrations were not reordered. `server/index.js` was not touched.
- **Trackers.** `trackers/{registry,routes,registry.test,routes.test,tracker-contract.d.ts,DOCUMENTATION.md}` and `linear/{auth-status,tracker,tracker.test,index,routes}` adopted; `linear/DOCUMENTATION.md` merged by hand.
- **Deferred from task 22 (its Progress named task 06 as owner):** `git/{credential-resolver,identity-provisioning,network-operation-plan,worktree-creation}.js` + tests, `network-operation-plan.review.test.js`, `repository-credential-runtime.test.js`, `tracked-items/{items,service,readers}.js` + tests and `routes.test.js`, `provider-read-cache/index.js` + test, `openchamber-sessions/session-link.js` + test, the whole `walkthrough/` refresh, and `guests/catalog.js`'s `sourceControl`/`statusSource` rows. Without these the deleted `github/index.js` and the new tracker reader would break the tree.
- **Adaptations (fork invariants):**
  - `enterprise-mode.js`: took the tunnels comment change without Tailscale (task 19 adds Tailscale; the tree has Cloudflare and ngrok). Upstream's integrations-catalog and Claude-Code-plugin bullets are **not** taken: the catalog is task 18 and the plugin policy is OpenCode's.
  - `walkthrough/model-settings.js` imports `../host/settings-files.js` (the fork moved it out of `lib/opencode`).
  - `walkthrough/DOCUMENTATION.md` describes the Host's `/api` fallback instead of an OpenCode proxy; the fork keeps no engine.
  - `walkthrough/languages.js`: Arabic and Hebrew are **not** adopted; `packages/ui` has no `ar`/`he` locale until task 20, and the language test holds the two lists equal.
  - `guests/service.js`: a service that provides `source-control` now gets `OPENCHAMBER_HOST_CALLBACK_URL` (3 lines from upstream, least privilege kept for other services).
  - `linear/tracker.js`: `sessionStatus.createRuntime` is **not** adopted. The fork's `linear/status-runtime.js` is canonical-event based and is what `server/index.js` runs; a payload fan-out would post the same comment twice. `trackers/session-status.js` + test are therefore **not adopted**, and `trackers/DOCUMENTATION.md` says so.
  - `provider-routes.github.auth.test.js` carries b9f03f0f10's test: three malformed enterprise instances answer 400 with no fetch. `provider-routes.js`'s `/auth/token` already normalizes through `requestInstance`, so the test is the missing half.
  - Tests that imported not-yet-landed UI modules were detached: `provider-descriptors.test.js` (web fallback literal), `extension-descriptor.test.js` (UI published-descriptor schema), `linear/tracker.test.js` (UI tracker fixtures). Each carries a comment naming the UI owner and the assertion it will restore.

### Not adopted

- `trackers/session-status.js` + test (see above).
- `walkthrough/languages.js`'s `ar`/`he` entries (task 20 owns the locales).
- Upstream's `github/DOCUMENTATION.md` and `gitlab/DOCUMENTATION.md` changes belong to task 01's path list and are untouched here.

### Remaining (exact)

1. Root `bun run test`: rerun (the web suite is green on its own; the root run also covers the other workspaces).
2. `bunx oxlint` on the rewritten files; `bun run dead-code` and inspect it.
3. Real path (not started): dev server on free ports with an isolated `OPENCHAMBER_DATA_DIR`; a local fixture Git repository listing changes through the Git provider; the GitHub Enterprise 400 check over HTTP with no outbound request; one token going only to a checked host.
4. Live hosts: GitHub/GitLab/Gitea/Gerrit/Forgejo without credentials are limits, not results.
5. Landing: `workflow validate`, move this file to `.workflow/done/upstream-refresh/`, rebase onto the moving integration tip, rerun install/type-check/lint/affected tests, ff-merge, remove the worktree and branch.

### Fixed while finishing

- `git/network-operations.test.js` (26 failures): the clone-credential stand-in now carries the neutral `secret` the adopted plan reads (it kept only `token`); 163 passed, 1 skipped.
- `git/routes.test.js` (6 failures): the test's `vi.mock('./index.js')` now provides `markGeneratedBranchName` and `seedBranchTaskTitle`, which the adopted `worktree-creation.js` takes from the Git libraries; 66 passed.

### Checks so far (worktree, Bun 1.4.4)

- `bun install --frozen-lockfile`: exit 0.
- `bun run type-check`: exit 0 (2,745 files, 5 projects; electron, agent-contract, agent-service, mobile all clean).
- `bun run lint`: exit 0 (`@openchamber/ui` reports one pre-existing unused oxlint-disable warning).
- `packages/web` vitest: 447 files, 426 passed, 12 failed (32 tests) before the fixes above; `extension-provider.contract.test.js` now passes 16/16 end to end.
- No dependency change: the refresh adds no package.

### Limits

- No live source-control host was contacted.
- `spaces/dispatcher.js` does not list `/api/tracker` as host-only; isolated spaces are excluded from this refresh and the file is fork-owned.
