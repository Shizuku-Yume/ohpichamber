# 01: Security and lost-state fixes

**Effort:** upstream-refresh
**Task type:** bugfix
**Base commit:** 524a6b5351ac2592e7bb94e69876cd7f4c3970ab
**Started:** 2026-10-27T03:19:18+08:00
**Status:** paused

**Delivers:** The upstream security and lost-state fixes that map to retained code are in the integration branch, with their focused tests: simple-git 4.0.2, passkey rate-limit, GitLab OAuth refresh lock, safe.directory in managed transfers, bounded terminal replay parsing, server-side session-link lists, lost-prompt confirmation, settings-write recovery, working-directory recovery, pending-inbox restore, archive restore, search indexing after read-point deletion, and the closed-extension answer fix.

**Blocked by:** None
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/01.tsv` (91 paths: 22 clean/new, 67 both-side, 52 conflicts). Main locations: `packages/web/server/lib/{git,terminal,github,gitlab,openchamber-sessions,message-search,ui-auth,tunnels,permission-auto-accept}` and `server/index.js`, `packages/ui/src/{sync,components/layout,components/views,components/chat,lib/guests}`, `packages/sdk/src` and `packages/sdk/examples` (the extension-answer fix changes the SDK host/protocol), `package.json`, `bun.lock`.

**Read first:** Spec "How it is built" and W2; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/relay-transport/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; `CONVENTIONS.md` §8.
**Covers:** W2

**Check:** `bun install` then `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, and each fix has the upstream test adopted with it or a recorded reproduction that fails before and passes after. Real path: in the running app, a Git status/diff refresh works, a second passkey attempt is rate-limited, and a session's linked items survive a UI write and a reload.

## Done when

- [ ] Every commit listed in the spec's W2 sentence has its test or reproduction recorded in `## Progress`.
- [ ] `simple-git` is `^4.0.2` in root, ui and web manifests; `bun.lock` is regenerated; Git status/log/merge flows still work.
- [ ] No token, refresh token or passkey challenge appears in logs.
- [ ] `lib/opencode-trust` and its three folder-trust fixes are not adopted.
- [ ] The SDK changes from the extension-answer fix are present and the v2 bootstrap is untouched (task 04 keeps it).

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

**Not started:**
- Extension answer fix `0fd3535e97` (SDK `onLateGenerateResult`, `generate-results.ts`, PluginPane merge, examples rebuild).
- Verification of the three "not applicable" claims (`bf0090259d`, `a7d9ab322d`, `a8101974fc`) against fork code, with reproductions where the risk exists.
- `bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run test` at one commit, `bunx oxlint` on substantially written files.
- Real path: `bun run dev`; Git status/diff refresh, second passkey attempt rate-limited, provider token only to its checked host (GHE check moved to task 06). Evidence directory is `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-01-2026-10-27/`.
- Task archive, rebase, fast-forward landing, worktree removal.

**Coordinator ruling recorded:** `b9f03f0f10` (GitHub Enterprise token-host check) is **moved to task 06** with the GHE feature `c566642ef7`; it is not part of this task.

**Known evidence constraint:** the pre-fix runs were produced by stashing only the implementation files (`links-fails-before` stash was popped back; tree verified conflict-free). One failed `git stash push` earlier popped an unrelated stash (`uncommitted-task13-worktree-notes`); its two `.workflow` files were restored to HEAD and the stash entry remains in the stash list, so nothing was lost.
