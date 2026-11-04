# 01: Security and lost-state fixes

**Effort:** upstream-refresh
**Task type:** bugfix
**Base commit:** 524a6b5351ac2592e7bb94e69876cd7f4c3970ab
**Started:** 2026-10-27T03:19:18+08:00


**Delivers:** The upstream security and lost-state fixes that map to retained code are in the integration branch, with their focused tests: simple-git 4.0.2, passkey rate-limit, GitHub Enterprise token-host check, GitLab OAuth refresh lock, safe.directory in managed transfers, bounded terminal replay parsing, server-side session-link lists, lost-prompt confirmation, settings-write recovery, working-directory recovery, pending-inbox restore, archive restore, search indexing after read-point deletion, and the closed-extension answer fix.

**Blocked by:** None
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/01.tsv` (93 paths: 22 clean/new, 67 both-side, 52 conflicts). Main locations: `packages/web/server/lib/{git,terminal,github,gitlab,openchamber-sessions,message-search,ui-auth,tunnels,permission-auto-accept}` and `server/index.js`, `packages/ui/src/{sync,components/layout,components/views,components/chat,lib/guests}`, `packages/sdk/src` and `packages/sdk/examples` (the extension-answer fix changes the SDK host/protocol), `package.json`, `bun.lock`.

**Read first:** Spec "How it is built" and W2; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/relay-transport/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; `CONVENTIONS.md` §8.
**Covers:** W2

**Check:** `bun install` then `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, and each fix has the upstream test adopted with it or a recorded reproduction that fails before and passes after. Real path: in the running app, a Git status/diff refresh works, a second passkey attempt is rate-limited, and a session's linked items survive a UI write and a reload.

## Done when

- [x] Every commit listed in the spec's W2 sentence has its test or reproduction recorded in `## Progress`.
- [x] `simple-git` is `^4.0.2` in root, ui and web manifests; `bun.lock` is regenerated; Git status/log/merge flows still work.
- [x] No token, refresh token or passkey challenge appears in logs.
- [x] `lib/opencode-trust` and its three folder-trust fixes are not adopted.
- [x] The SDK changes from the extension-answer fix are present and the v2 bootstrap is untouched (task 04 keeps it).

## Progress

Check before: not run as one command at start; each fix's focused test was run against its pre-fix code and recorded as failing (see evidence files). Workspace-wide checks are owed at the landing commit.

Dirty at start: none.

**Landed work on this branch (uncommitted at handoff — see the checkpoint commit):**

- simple-git 4.0.2: root/ui/web manifests and `bun.lock`; `service.js` adopts `{ simpleGit }`, `SIMPLE_GIT_REFUSED_ENV_CATEGORIES` (Record, not Map, per project rule), `simpleGitEnvOptions` (`allowEnvironment` + inherited unsafe categories), `createGit(directory, { extraEnv })`; working-tree range diff passes `GIT_INDEX_FILE`/`GIT_LITERAL_PATHSPECS` as `extraEnv`; `service.test.js` env tests extended (project `GIT_*` flag and every inherited program-running name). Evidence: `simple-git-fails-before.txt` (old service.js with simple-git 4: 3 failed), focused suite `git environment through simple-git` passes 4/4. Full `service.test.js` (257 tests) not yet rerun.
- Passkey rate limit: `ui-auth.js` shares `admitLoginAttempt`; passkey failures count, post-accept errors do not, token response `no-store`; new alternating passkey/password test. Evidence: `passkey-fails-before.txt` (1 failed before), 13/13 after.
- GitLab OAuth refresh lock: fix applied to unchanged fork files (`auth-storage.js`, test, docs). Evidence: `gitlab-refresh-fails-before.txt` (1 failed before), 10/10 after.
- Settings write recovery: `host/settings-runtime.js`, `permission-auto-accept/runtime.js`, `tunnels/managed-config.js` settle their write lock with `result.catch(() => {})`; two adapted settings tests, one auto-accept test, new tunnel test. Evidence: `settings-write-fails-before.txt` (4 failed before), 40 passed after.
- Terminal replay bound: `history.js` + `history.test.js` taken from the fix commit (the bounded parser is the fix; its scanner refactor is the implementation, not unrelated drift), runtime clears pending replay on exit, runtime overflow test adapted to this fork's per-callback output frames (upstream's test assumes 12 ms batching that this fork does not have). Evidence: `terminal-bound-fails-before.txt` (5 failed before), 50/50 after.
- Working-directory recovery: `directoryPersistence.ts` probes `hostFilesystem.getDirectoryAvailability` (fork equivalent of deleted `opencodeClient`), guarded by runtime key, current directory and stored hint; `useDirectoryStore.goToNoProjectDirectory` rejects a runtime switch while resolving. Adapted `useDirectoryStore.home.test.ts` (7 new tests). Evidence: `directory-recovery-fails-before.txt` (5 failed before), 10/10 after.
- Session link lists server-side: new `session-linked-issues.js` (parse + decide-from-fresh-record), route `POST /api/openchamber/sessions/:id/links`, `updateSessionMetadataWith` wired in `server/index.js`, scope checks preserved (`hostScopeFor` + `assertWritableScope`), UI sends only the operation via `requestSessionLinksUpdate` and mirrors the answer; `withLinkedIssue` removed from `linkedIssues.ts`. Server tests 23/23; UI tests 103/103 (session-actions + linkedIssues). Evidence: `session-links-fails-before.txt` (6 server + 4 UI failed before).
- Archive restore: code is in place (`session-restore-rule.ts`, header menu, sidebar comment, ArchiveView grouping/indent/parent title, `restoreSessionTree`), docs updated. **Tests not yet adapted or run; type-check after these edits not yet run.** The fork's fields are `parentSessionId`/`archivedAt` and titles come from `metadata?.title`; the upstream test snippets must be adapted accordingly.

**Remaining at the 2026-10-27 pause (superseded by the Continuation section):**
- Extension answer fix `0fd3535e97` (SDK `onLateGenerateResult`, `generate-results.ts`, PluginPane merge, examples rebuild).
- Verification of the three "not applicable" claims (`bf0090259d`, `a7d9ab322d`, `a8101974fc`) against fork code, with reproductions where the risk exists.
- `bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run test` at one commit, `bunx oxlint` on substantially written files.
- Real path: `bun run dev`; Git status/diff refresh, second passkey attempt rate-limited, provider token only to its checked host (GHE check moved to task 06). Evidence directory is `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-01-2026-10-27/`.
- Task archive, rebase, fast-forward landing, worktree removal.

**Coordinator ruling recorded:** `b9f03f0f10` (GitHub Enterprise token-host check) is **moved to task 06** with the GHE feature `c566642ef7`; it is not part of this task.

**Known evidence constraint:** the pre-fix runs were produced by temporary stashes of implementation files. See the incident record below; from 2026-10-27 onward this task does not use `git stash` and uses temporary commits or evidence-dir copies instead.

### Stash incident (2026-10-27)

- Worktree where the pop ran: `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-01` (the task worktree), not the source worktree.
- Stash ref and message: `stash@{0}` at the time, now `stash@{0}` again, entry commit `6a6219dc6face00ccf5a3a7e8dff8414abb9ff14`, message `On post-m3-hardening/13-non-linux-process-cleanup: uncommitted-task13-worktree-notes`. It is retained, not dropped.
- Cause: a `git stash push` whose pathspec included the then-untracked `session-linked-issues.js` failed with “did not match any git known files”; the following `&&` chain short-circuited the intended commands, but a later `;`-separated `git stash pop` ran without a ref and applied `stash@{0}`.
- Files it applied: `.workflow/development.md` (merge conflict, UU) and `.workflow/tasks/post-m3-hardening/13-non-linux-process-cleanup.md` (deleted-by-us / modified-by-them, DU). Both were reset to this branch's HEAD: `git checkout HEAD -- .workflow/development.md`; `git rm -f` the task13 file, which does not exist on this branch.
- Before the pop those paths had no uncommitted changes in this worktree: the task start recorded `Dirty at start: none`, and this task never edited them. `git stash show -p 6a6219dc6` (saved as `stash-task13-incident.patch` in the evidence dir) contains exactly those two files (+7/-5) and nothing else, so resetting them discarded only what the stash itself carried. The stash entry still holds that work; `git diff 524a6b5351 HEAD --` those paths is empty, so the task branch added nothing there.

### Continuation (2026-10-27)

No `git stash` is used from this point; baseline runs copy the implementation aside and restore it from the evidence-dir backup or from a commit.

- `a51b5d6c67` safe.directory: ported. `network-operations.js` gains `createTrustedDirectoriesConfig` (5 s read timeout, private config file holding only `safe.directory`, rewritten per operation), `managedGitEnvironment` used by managed HTTPS/local integration/cleanup (not the isolated LFS upload), `operationError` keeps its own code over a Git exit code, and a contributor fetch failure reports `TRANSPORT_FAILED` with Git's reason. `host/feature-routes-runtime.js` wires the reader. Route errors now return the redacted reason for `INVALID_REQUEST`. Tests: two managed-env tests, one route test, two real-Git tests (`GIT_TEST_ASSUME_DIFFERENT_OWNER`). Evidence: `safe-directory-fails-before.txt` (2 + 1 failed before).
- `0fd3535e97` extension answers: SDK `LateGenerateResult`, bounds, `generate-late-listen`/`generate-late` protocol, `HostClient.onLateGenerateResult` with an unclaimed queue; UI `generate-results.ts` (owner matching, 1 h / 8-per-extension / 2 M-character bounds, catalog revocation) with 12 unit tests; `PluginPane` advertises `lateGenerateResults` on visible frames, counts `hello` documents, keeps an answer that finds its requester gone, and delivers kept answers once to a listening frame; host bridge builds the push. Tests: SDK 105/105, generate-results 12/12. The upstream `PluginPane.generate.test.tsx` is not adopted: its stand-in uses the removed v1 window protocol, and this fork requires the v2 `MessagePort` bootstrap; the pane wiring is covered by type-check plus the unit/protocol tests. Documented gap.
- `59a47cd1e1` archive restore: rule, menu, ArchiveView grouping/indent/title, restore action and docs ported to the fork's `parentSessionId`/`archivedAt`/`metadata.title` fields. Upstream tests adapted: header (archived/unknown parent refuses; active parent restores) and ArchiveView (grouped under parent title, archived-parent child hidden); session-actions restore tests use the shared rule. Evidence: `archive-restore-fails-before.txt` (2 failed before), 13/13 after.
- `bf0090259d` not applicable, verified: `isAmbiguousSendFailure` classifies plain fetch/TypeError/timeouts and the relay tag; `session-actions` propagates the failure once and leaves history unchanged (no rollback, so no double send). Evidence: `not-applicable-lost-prompt.txt` (1 passed). Ported the transport-error comment explaining plain-fetch ambiguity.
- `a7d9ab322d` not applicable, verified: the OpenCode `session.inbox.*` API is gone; the fork's queue is server-owned and survives a Host restart (`message-queue/sqlite-store.test.js`, 4 passed) and the UI loads it with `hydrate`. Evidence: `not-applicable-pending-inbox.txt`.
- `a8101974fc` not applicable, verified: message search pages canonical history with a per-run `nextCursor`; the SQLite schema has no per-session read cursors (`messages` has no cursor columns), so a deleted read-point message cannot strand indexing. Evidence: `not-applicable-search-indexing.txt` (9 passed).

Checks at this state: `bun install` 0, `bun install --frozen-lockfile` 0, `bun run type-check` 0, `bun run lint` 0 (after moving `LegacyDataNotice` helpers to `legacyDataNotice.ts` to clear a pre-existing react-refresh error), `bun run test` recorded below, `bunx oxlint` on authored files (only pre-existing findings in `git/network-operations.js` and `git/service.js` remain; no new-file findings), `bun run dead-code` inspected below.

### Check after (2026-10-27)

- `bun install` -> 0; `bun install --frozen-lockfile` -> 0 (`Checked 1493 installs across 1619 packages (no changes)`).
- `bun run type-check` -> 0 (ui, web, electron, agent-service; all workspaces).
- `bun run lint` -> 0.
- `bun run test` -> **not green with the default 4 workers**: `server/lib/host/canonical-plugins.test.js > re-registering a workspace profile...` got 503 from the Agent service under full-suite load (twice), and passes alone (5/5, 77 s). With `VITEST_MAX_WORKERS=2 bun run test` -> 0, 7/7 suites, 6086 passed / 128 skipped. The failure is a pre-existing load-sensitive startup test, not touched by this task; the reduced-worker run is the green receipt and the limit is recorded here.
- `bunx oxlint` on the files created or substantially rewritten: no findings. Pre-existing `anti-slop` findings remain in `git/service.js` and one in `git/network-operations.js` (unrelated lines); not mass-fixed.
- `bun run dead-code` -> 0 (no report).
- Real path (dev server on 3999, isolated `OPENCHAMBER_DATA_DIR`, UI password `test-pass`): `POST /auth/session` 200; `GET /api/git/status?directory=<worktree>` 200 with this branch and its modified files; `GET /api/git/log` 200 with HEAD `22d9cf16b`; twelve `POST /auth/passkey/authenticate/verify` attempts returned 10 × 404 then 2 × 429 (`retryAfter` 900). Output: `real-path.txt`. The GitHub Enterprise token-host check is task 06's (coordinator ruling), so no GHE host was exercised; no credentials for a source-control host were used, and none were needed for these paths.

**Finished:** 2026-10-27T04:26:18+08:00
