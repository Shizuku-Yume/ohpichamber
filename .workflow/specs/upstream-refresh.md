# Upstream-first area refresh to upstream 0056bf6a9

**Status:** in progress
**Priority:** high
**Integration branch:** upstream-refresh/integration

## What this is for

OhPiChamber adopted the upstream OpenChamber tree at `1f9320062` on 2026-10-10. Upstream has since moved 813 commits to `0056bf6a9` (v2.5.2 plus one commit) and changed 4,031 paths (+299,677 / -82,213). The fork changed 3,410 paths over the same period, 1,552 of them on both sides, and 640 of those 1,230 shared files conflict textually. Nothing from upstream after that pin has reached the fork: new features, security fixes and data-loss fixes are all missing, and the drift grows with every upstream release.

The maintainer answered open question 7 of [post-M3 hardening](post-m3-hardening.md) by adopting the upstream-first area refresh and starting it now, including features rather than only security and bugfixes (`decisions.md: 2026-10-27 - Adopt the upstream-first area refresh now`). The earlier commit-level porting policy stays superseded: one sampled cherry-pick of a five-file sync fix produced three conflicting files, and the fork-side customization is too large for per-commit import.

Measurement evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/` (`summary.md`, `aggregate.json`, `conflicts.json`, `commits.csv`, `summary-deps.md`, `raw/`, and the per-task path lists in `plan-paths/`).

## What it does

When this effort is done, the integration branch carries upstream's `0056bf6a9` behavior in every retained shared area, adapted to OMP, with the fork's own work preserved:

- Security and lost-state fixes from the range are in place: the `simple-git` 4.0.2 update, passkey sign-in rate limiting, the GitLab OAuth refresh lock, safe.directory preservation in managed transfers, bounded terminal replay parsing, and the session-link, prompt, settings-write, working-directory, inbox, archive and search fixes.
- The repository builds and checks with the toolchain upstream authors against: TypeScript 7, Bun 1.4.4, oxlint 1.88 and Electron 44. Package versions stay `3.0.0` (mobile `1.13.2`); no upstream release number is adopted.
- The small areas match upstream: mobile, extensions, scripts, the Guest SDK (with the fork's private `MessagePort` v2 transport and `3.0.0` version), and the Electron shell.
- Upstream features are usable through the real UI: source-control hosts (GitHub Enterprise, Gitea, Gerrit, Forgejo, GitLab), Board and review surfaces, the works view and reworked sidebar, the settings regroup and rebranding, Markdown/diff rendering, composer and permissions, project knowledge, workflows, the integrations catalog, tunnels/relay/notifications, Arabic/Hebrew RTL, and diagnostics/overview.
- Product docs describe the refreshed behavior, in English and the translated locales that upstream maintains.
- The branch's history links to upstream `0056bf6a9`, so the next sync compares against that commit instead of `336e19248`.
- Every upstream-changed path has one recorded disposition: adopted, adapted, or excluded with a reason.

Excluded on purpose: `packages/vscode`, OpenCode-engine paths, upstream folder trust, isolated-spaces code, `.github` collaboration/CI, `changelog/`, `nix/`, `pr-evidence/`, and upstream `.agents/.claude/.opencode` guidance. Counts and reasons are in "How it is built".

## How it is built

### Mechanism

- Comparison base is `1f9320062` (the adopted tree), never `336e19248` (the real merge base, which is 915 upstream commits older). `git merge upstream/main` is forbidden: it produces 2,810 conflicting paths.
- Every task owns a disjoint path list (`.workflow` artifacts, `plan-paths/NN.tsv`). For each path:
  - Clean or new on the fork (`clean_live`, `new_adoptable`): take the upstream file at `0056bf6a9` whole.
  - Changed on both sides (`both_live`): three-way merge with `git merge-file` or `git show` blobs, base `1f9320062`, ours the integration branch, theirs `0056bf6a9`; resolve toward OMP invariants.
  - Fork deleted, upstream changed: stay deleted; record it.
  - Upstream deleted: apply the deletion when the fork did not change the file; when it did, review and record the decision.
- Resolution rules: no OpenCode engine, adapter, fallback or dual-engine selector; no VS Code surface; host capabilities stay behind the Host Gateway; SDK objects stay private to the Agent Service; user-facing text follows the locale rules.
- The final tree is the fork's, not upstream's: adopting a file does not authorize deleting fork-owned behavior inside it.
- Recorded as `decisions.md: 2026-10-27 - Refresh paths three-way from the adopted baseline`; the history link at task 30 later restores normal `git merge-base` behavior.

### Sequence

1. Foundations: 01 security and lost-state fixes, then 02 toolchain and root build contract (TypeScript 7, Bun 1.4.4, oxlint 1.88, Electron 44, lockfile regenerated, `bun-patches` evaluated). Toolchain first is deliberate: upstream area source is authored against TypeScript 7, and refreshing under 5.9 would re-touch every refreshed file during migration (`decisions.md: 2026-10-27 - Bump the toolchain before refreshing ui and web`).
2. Small areas in parallel after 02: 03 mobile/extensions/scripts, 04 Guest SDK and 05 Electron shell start as soon as 02 lands. 22 web host core also follows 02, and 06 server source-control hosts follows 22; 33 adds the project repository batch routes, 34 adds the Change-Id amend route and client contract, and 07 review surfaces follows 06, 33 and 34. 09 layout/works and 10 design system start after 02 and 23 as their blockers allow.
3. UI features after the design system and UI state tasks: 08 sessions/sidebar, 11 settings, 12 Markdown/diff, 13/14 chat, 15 composer, 16 knowledge, 17 workflows, 18 integrations, 19 tunnels, 20 i18n, 21 diagnostics. Each takes its own path list; shared interfaces are named in the task files.
4. 22 web host core and 23 UI state (sync/stores) are the two hardest adaptation tasks; they land before the feature tasks that depend on their routes and stores.
5. Documentation last: 26 English docs and assets, then 27-29 translated locales.
6. One-view sidebar follow-up: 31 rebuilds the desktop sidebar on upstream's one-view row model after 07, then 32 brings the mobile sheet onto it. Task 26 documentation waits for both.
7. 30 is the gate: full checks at the integration tip, one current receipt, the baseline record updated, `development.md` updated, history link created with `git merge -s ours 0056bf6a9`, and the tasks archived.

### Parallel sessions

Work runs in lanes. Each lane is one conversation in its own worktree under
`/home/shizuku/Project/ohpichamber-worktrees/`, branched from `upstream-refresh/integration`,
and edits only the paths its tasks own. A lane rebases onto the integration branch and reruns
its Check before every landing.

| Lane | Tasks, in order | Owns | Waits for |
|---|---|---|---|
| A Foundations | 01 → 02 | security/data-loss fixes, root manifests, lockfile, TypeScript/Bun/oxlint/Electron, `bun-patches`, `tools/` | nothing |
| B Small areas | 03 → 04 → 05 | mobile, extensions, scripts, Guest SDK, Electron package | 02 |
| C Server | 22 → 06 → 33 → 34 → 07, then 16/17/19/21 server halves | web host core, source-control host modules, project repository batch routes, Change-Id amend route/client contract, review server, later feature routes | 02; 06/07 after 22; 07 after 33 and 34 |
| D UI foundation | 10 → 23 → 24 → 25 | design system/assets/theme, sync/stores, hooks/api/apps, misc UI | 02; 23-25 after 10 |
| E UI features | 08, 09, 11, 12 → 13 → 14 → 15, 18, 20 | session/sidebar, layout/works, settings, markdown, chat, composer, catalog, i18n | 10 and 23; 12-15 chained; 08/09/11/18/20 independent |
| F Docs | 26 → 27, 28, 29 | `packages/docs`, `docs/` assets | every adoption task (26 is the documentation gate, not a verification gate) |
| H One-view sidebar | 31 → 32 | desktop one-view rows, mobile sheet | 07; 32 after 31 |
| G Gate | 30 | records, baseline pin, history link | 26-29 |

Shared interfaces: `packages/web/server/index.js` route registration belongs to 22; later server
tasks add their own module registration and coordinate with lane C. `packages/ui/src/lib/i18n`
belongs to 20; other tasks add keys only through it. `packages/ui/src/sync` and `stores` belong
to 23; feature tasks read them and send interface changes to lane D instead of editing them.

### Green gate per task

Every task leaves the integration branch green: `bun install --frozen-lockfile` succeeds with the regenerated `bun.lock`, and `bun run type-check`, `bun run lint` and `bun run test` exit 0, plus the task's own observation. A task that cannot be green is split by `flow-break` amend, not landed broken. The final gate repeats the full set at the tip, adds `bun run dead-code`, `bun run docs:validate`, an Electron package build and launch, and one real-provider chat.

### Exclusions and their sizes

| Exclusion | Paths | Reason |
|---|---:|---|
| `packages/vscode` | 85 | Package removed by the fork; 68 delete/modify and no live path |
| OpenCode engine paths | 138 | Replaced by the Agent Service; 83 already deleted, no retained owner |
| Isolated spaces (`lib/spaces`) | 91 | Unreleased; Task38 removes the OpenCode runtime, and no OMP runtime exists yet |
| `.github` | 324 | Fork removed upstream collaboration and CI; includes `renovate.json` |
| `changelog/` | 10 | Maintainer-owned release notes; includes `CHANGELOG.md` |
| `pr-evidence/` | 10 | Upstream review images |
| `nix/` | 7 | New upstream packaging area (`nix/`, `flake.*`) with no fork counterpart |
| Upstream agent guidance | 30 | `.agents`, `.claude`, `.opencode` are fork-owned |
| Fork design docs | 8 | `docs/isolated-spaces` is a fork record; upstream deleted its copies |
| Upstream root docs | 4 | `AGENTS.md`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md` are fork-owned |

707 paths are excluded in total. The other 3,324 are assigned: 2,932 to adoption tasks 01-25 and 392 to documentation tasks 26-29. The full 4,031-path assignment is `plan-path-coverage.tsv`.

## What it must not do

- Use `git merge upstream/main`, cherry-pick the range, or adopt files outside the task's path list.
- Reintroduce OpenCode as an engine, adapter, config reader, dual-engine selector or fallback, or restore `packages/vscode`.
- Adopt upstream folder trust (`lib/opencode-trust`) or build an OMP equivalent; the maintainer declined it (`decisions.md: 2026-10-27 - Do not adopt upstream folder trust`).
- Change package versions to upstream's: the fork stays `3.0.0` and mobile `1.13.2` (`decisions.md: 2026-10-27 - Keep the fork version at 3.0.0`).
- Restore upstream collaboration machinery, release notes, `nix/`, or continue the unreleased spaces runtime.
- Claim a platform or provider result without running it; name the stand-in instead.
- Touch `main`'s working tree. Its uncommitted `.workflow` edits belong to another session; this effort commits on the integration branch only (`decisions.md: 2026-10-27 - Plan the refresh on an integration branch`).
- Land a task that is not green, or silence a check to get there.

## What was considered and rejected

- **Commit-level cherry-pick of the range.** The historical policy; a sampled five-file sync fix conflicted in three files and seven hunks, and 1,552 files changed on both sides make per-commit resolution costlier than per-path adoption.
- **`git merge upstream/main`.** The obvious mechanism, rejected on measurement: the real merge base is `336e19248`, so a merge compares 915 extra upstream commits and reports 2,810 conflicting paths; the requested `--merge-base=1f9320062` is ignored by git 2.56 for this history.
- **Security-only sync.** Cheaper, but the maintainer asked for features now, and leaving 1,223 new upstream files unread keeps the fork further behind each cycle.
- **Refresh UI and web under TypeScript 5.9, then migrate.** Avoids a compiler migration first, but every refreshed file would be touched twice and reviewed against a compiler upstream does not use.
- **Bump the toolchain last.** Same argument in reverse; deferred migration leaves the new source unverified by the compiler it was written for.
- **Replace the whole tree with upstream's and reapply the fork.** Discards the OMP adaptation carried in 640 conflicting files and the fork's own subsystems, and cannot express per-path dispositions.
- **Leave history unlinked.** Avoids an empty merge commit, but every future sync would repeat the `1f9320062` base trick; the merge keeps the next comparison honest.

## How we will know it works

- **W1.** `plan-path-coverage.tsv` reconciles all 4,031 paths changed by upstream since `1f9320062` to a task or a named exclusion, with no unassigned path, and the final report states each exclusion's reason.
- **W2.** Each security and lost-state fix named in task 01 has a focused test or a recorded reproduction that fails on the pre-refresh tree and passes after; the `simple-git` update leaves the Git status/log flows working; no credential path logs or exposes a token. The GitHub Enterprise token-host check (b9f03f0f10) is not in task 01: it depends on the provider registry and is checked with task 06 under W5.
- **W3.** At task 02's commit, a frozen install follows a clean `bun install`, and `bun run type-check` (TypeScript 7), `bun run lint` (oxlint 1.88) and `bun run test` exit 0; `packageManager` is `bun@1.4.4`, Electron resolves to 44.x, and all package versions remain `3.0.0`/`1.13.2`.
- **W4.** Mobile assets build, the built-in extensions build, scripts pass their own tests, the Guest SDK keeps the `v: 2` `MessagePort` bootstrap with version `3.0.0`, and the Electron shell packages and launches on Linux.
- **W5.** With the app running, the Board lists issues/PRs for a local fixture repository, the Git/Files/diff views render a changed worktree, and one real source-control host (or a named stand-in) connects with credentials. A token is sent only to a checked enterprise host: a malformed GitHub Enterprise instance answers 400 before any request, with b9f03f0f10's test. Provider-specific behavior that cannot be reached is named as a limit.
- **W6.** Each UI feature task is exercised at its commit through the running app: sessions and sidebar, works view and layout, design system/rebranding, settings pages, Markdown/diff rendering, chat transcript and work status, composer attachments and permissions, project knowledge, workflows, integrations catalog, tunnel/relay status, RTL layout, diagnostics/overview, and the remaining guest/browser/terminal surfaces. Each record names what was observed and any stand-in.
- **W7.** `bun run docs:validate` exits 0; English and translated docs describe the refreshed UI, name no OpenCode engine, and every documented feature exists in the tree.
- **W8.** At the integration tip, `bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run test`, `bun run dead-code` and `bun run docs:validate` exit 0, the packaged Electron app launches, and a real-provider chat completes; one receipt names the commit and worktree.
- **W9.** `git merge-base --is-ancestor 0056bf6a9 <integration tip>` succeeds and `git merge-base <integration tip> upstream/main` is `0056bf6a9`, so the next sync diffs from the new pin.
- **W10.** One authoritative baseline record pins `0056bf6a9` with date, commit count and fork deltas; `development.md` carries the refreshed status and limits; every task is archived; no project document claims an upstream version as the app version.
- **W11.** A tree scan finds no `packages/vscode`, no `lib/opencode-trust`, no restored OpenCode engine directory, and no OMP fallback/adapter introduced by the refresh.

## Open questions

- **ripgrep for `GET /api/fs/find-in-files`.** The adopted route runs ripgrep, discovered by `packages/web/server/lib/fs/ripgrep.js` in this order: a packaged desktop `Resources/ripgrep`, the `@vscode/ripgrep` platform package, then `rg` on `PATH`. Upstream ships `@vscode/ripgrep: ^1.18.0` as a dependency of `@openchamber/web` (plus Electron's `prepare:ripgrep` staging); the fork does not, and adding a dependency needs the maintainer's decision. On a host with none of the three, the route answers `501 { reason: 'search-unavailable' }`; that is what a user sees today, and the find-in-files suites skip instead of failing the suite. No fork UI calls the endpoint yet — upstream's `searchContents` client and the sidebar's Contents search are deferred to tasks 24/12 — so no empty result list is shown; when those land they must keep the 501-to-`unavailable` mapping and render the file tree's explicit "server cannot search contents" state, with a test. Maintainer decision: add `@vscode/ripgrep` at upstream's `^1.18.0` (and the Electron staging) or keep 501 as the supported no-rg behavior.
- Provider credentials for source-control hosts, Tailscale, and a physical mobile device may be unavailable; each task names the stand-in and records the limit instead of claiming a result.

## Notes

**Deviation from `flow-break`.** The plan is committed on `upstream-refresh/integration` cut from `main` at `dee0c88ebd`, not on `main`. `main`'s working tree holds another session's uncommitted `.workflow` edits (`decisions.md`, `implementation-plan.md`, `post-m3-hardening.md`, tasks 26/29, the m5 spec and tasks); committing there would capture or disturb them. The integration branch is created from the same commit, so the plan is identical. When `main` moves, merge it into the integration branch and reconcile the other session's document edits (`decisions.md: 2026-10-27 - Plan the refresh on an integration branch`).

**Relation to other specs.** [Upstream rebaseline](upstream-rebaseline.md) owns the 2026-10-10 adoption of `1f9320062` and is not superseded; this effort continues it with a dated, measured refresh. [Post-M3 hardening](post-m3-hardening.md) is the effort whose question 7 this answers.

**Measurement.** Upstream tip `0056bf6a9` (2026-10-26, 813 commits, `v2.5.2-1`). Delta: 4,031 paths, +299,677/-82,213; 1,135 clean, 1,223 new, 991 both-live, 226 fork-deleted, 456 upstream deletions; 640 of 1,230 shared files conflict. Fork load: 3,410 changed paths (+206,927/-242,154). Per-bucket counts are in `plan-path-summary.md`; per-path lists in `plan-paths/NN.tsv`.

**Task scale.** 34 tasks across eight lanes; 01-02 are serial, the rest parallelize as the lane table in each task's `Blocked by` allows. Tasks 31-32 are the one-view sidebar follow-ups that tasks 08/24 deferred; they own paths already counted in those tasks' lists, so the 4,031-path accounting is unchanged. Task 33 owns the missing project repository batch behavior in task 01's route file plus fork-owned space-boundary files, and task 34 owns the already-counted Change-Id route/test and client contract, so neither adds an upstream path.
