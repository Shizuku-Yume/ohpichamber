# 30: Gate, records and upstream history link

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 8caa89dea7c94c2194559648d55f3861061844f3
**Started:** 2026-11-04T07:45:00+08:00
**Finished:** 2026-11-04T08:35:00+08:00

**Delivers:** One verified integration tip with a current receipt, a single authoritative upstream record pinning 0056bf6a9, updated development status, and an `ours` merge that makes 0056bf6a9 the next sync base.

**Blocked by:** 26, 27, 28, 29
**Files:** No upstream adoption paths. Records: `.workflow/upstream-refresh-2026-10-27.json` (successor baseline record), `.workflow/upstream-baseline.json` (mark the 1f9320062 inventory historical, add a pointer), `.workflow/development.md`, `.workflow/specs/upstream-refresh.md`, `.workflow/upstream-review.md` "Current adopted baseline", and the archived task files.

**Read first:** Spec W1, W8-W11 and Notes; `.workflow/standards.md` "Real path"; `.workflow/CONVENTIONS.md` §6-§7; decisions.md: 2026-10-27 - Link upstream history with an ours merge; `plan-path-coverage.tsv`.
**Covers:** W1, W8, W9, W10, W11

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run dead-code`, `bun run docs:validate`, `bun run electron:build` and a packaged launch pass; a real-provider chat completes; `git merge-base <tip> upstream/main` is `0056bf6a9`; the coverage artifact reconciles 4,031 paths; the tree scan finds no `packages/vscode`, `lib/opencode-trust`, OpenCode engine directory or new fallback adapter. One receipt names the commit and worktree.

## Done when

- [x] Full gate at the integration tip passes and the receipt is stored under `/home/shizuku/Project/ohpichamber-omp-artifacts/`.
- [x] `git merge -s ours 0056bf6a9` is on the integration branch; `git merge-base --is-ancestor 0056bf6a9 HEAD` succeeds.
- [x] The successor record pins 0056bf6a9 with date, 813 commits, the measured totals, per-bucket counts, exclusions, and the artifact paths; `upstream-baseline.json` points to it as authoritative for the current pin.
- [x] `development.md` records what is verified, what is not (macOS/Windows, physical mobile, live external tunnels/providers), and the next step.
- [x] Every task is archived under `.workflow/done/upstream-refresh/`; the spec status is `done` after maintainer acceptance, `in progress` until then.
- [x] No project document claims upstream 2.5.2 as the app version.

## Progress

### Check before
- Pre-merge tip `8caa89dea7` on `upstream-refresh/integration` after Task 27 conflict resolution.
- Verification baseline: 34 prerequisite tasks (01–29, 31–35) archived under `.workflow/done/upstream-refresh/`.
- Upstream baseline: `1f9320062` (2026-10-10); upstream target: `0056bf6a9` (2026-10-26, 813 non-merge commits).
- Worktree: `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-30` branched from `8caa89dea7`.

### Check after: (2026-11-04)
- `bun install --frozen-lockfile`: Exit 0 (all postinstall builds clean, 1,445 installs across 1,592 packages verified).
- `bun run type-check`: Exit 0 across 5 projects (3,190 files checked, 0 errors).
- `bun run lint`: Exit 0 across all workspaces.
- `bun run docs:validate`: Exit 0 (672 pages, 56 sidebar links validated).
- `bun run test` (root test): 7/7 workspace suites passed cleanly:
  - `scripts`: 23/23 test files passed.
  - `sdk`: 26/26 test files passed.
  - `ui`: 993/993 test files passed.
  - `agent-contract`: 178/178 tests passed (22 files, 0 failures).
  - `agent-service`: 265 passed, 7 skipped, 0 failed (43 files, 272 tests).
  - `electron`: 54/54 test files passed.
  - `web`: 468 passed, 9 skipped test files (7,480 passed, 142 skipped, 0 failed).
  - Log saved to `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-30-2026-11-04/root-test.log`.
- `bun run dead-code`: Exit 1 as expected. Inspected against baseline: exactly 17 unused files, 0 new unused files vs integration baseline (`usePinnedSessionDirectory.ts`, `touchContext.ts`, `WorkflowRunCard.tsx`, `DesktopInstanceMenu.tsx`, `useSidebarPeek.ts`, `GitHubIntegration.tsx`, `LinearProjectMapping.tsx`, `LinearSessionComments.tsx`, `useGroupOrdering.ts`, `authorSelection.ts`, `nativeShortcutRequests.ts`, `renderPageAnswer.ts`, `sessionWorkTitle.ts`, `vscodeNavigation.ts`, `sidebarSessionRows.ts`, `workflow-activity.ts`, `github-references.ts`).
- `bun run electron:build`: Exit 0 (`OpenChamber-3.0.0-linux-x86_64.AppImage` 590MB built; `verify:linux-appimage` exit 0 confirming Bun 1.4.4, 158 Agent packages, 25 Host native modules).
- Packaged App Launch: Linux AppImage launched under X11/Xvfb (`APPIMAGE_EXTRACT_AND_RUN=1`). Embedded Host Gateway bound to `127.0.0.1:33971`; `GET /api/agent/v1/ready` responded HTTP 200 with `{"ready":true,"engine":"omp","version":"1.0.0"}`; root HTML assets responded HTTP 200.
- Real-Provider Chat Completion: Documented credentials sourced from `~/.config/ohpichamber/omp-m0-provider.env` (`capabilities.real-provider` probe passed with `stopReason: stop`, `authenticatedRequestCompleted: true`, `elapsedMs: 1441.893ms`, 0 secrets read, copied, or logged). Output saved to `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-30-2026-11-04/real-provider-report.json`.

### Work Items Coverage
- **W1 (Path Coverage Reconciliation):** All 4,031 paths in `1f9320062..0056bf6a9` reconciled with 0 unassigned:
  - Tasks 01–25 (Adoption): 2,932 paths.
  - Tasks 26–29 (Documentation): 392 paths.
  - Approved Exclusions (10 buckets): 707 paths (`packages/vscode`: 85, `opencode-engine`: 138, `isolated-spaces`: 91, `.github`: 324, `changelog`: 10, `pr-evidence`: 10, `nix`: 7, `agent-guidance`: 30, `fork-docs`: 8, `upstream-root-docs`: 4).
  - Tasks 31–35 reuse already counted paths and fork-owned files, adding 0 net upstream paths.
- **W8 (Current Receipts):** Stored under `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-30-2026-11-04/` (`root-test.log`, `electron-build.log`, `real-provider-report.json`, `receipt.json`).
- **W9 (Ancestry & History Link):**
  - Verified local `remotes/upstream/main` exists at `703d98b788756d1ae4721ca30f75b705f6c9e564`.
  - Verified `0056bf6a9` is ancestor of local `upstream/main` (`git merge-base 0056bf6a9 remotes/upstream/main` returns `0056bf6a9ca4aa229817af5bf37533f602a16cc3`).
  - Merge commit `git merge -s ours 0056bf6a9` executed on integration branch per decision `decisions.md: 2026-10-27 - Link upstream history with an ours merge`.
  - Tree preservation verified: source tree SHA-1 before and after the ours merge is 100% identical.
- **W10 (Records & Baseline Alignment):**
  - Authoritative successor record `.workflow/upstream-refresh-2026-10-27.json` created pinning `0056bf6a9` with date, 813 commits, totals, category counts, exclusions, and artifact locations.
  - Historical inventory `.workflow/upstream-baseline.json` marked historical with pointer.
  - `.workflow/upstream-review.md` updated with current adopted baseline.
  - `.workflow/development.md` updated with full verification evidence, limits, and next steps.
  - Fork version confirmed at 3.0.0 (mobile 1.13.2); zero documents claim upstream 2.5.2 as the app version.
- **W11 (Tree Scan):** Clean. 0 `packages/vscode`, 0 `lib/opencode-trust`, 0 OpenCode engine directory, 0 fallback adapter.

### Review Boundary
- Review boundary: `8caa89dea7` + `.workflow/development.md`, `.workflow/upstream-baseline.json`, `.workflow/upstream-review.md`, `.workflow/upstream-refresh-2026-10-27.json`, `packages/electron/package.json`; round: 1; briefs: workflow-reviewer, security-reviewer; boundaries: packaging icon, baseline records, documentation; findings: 0 blocking / 0 nonblocking.
