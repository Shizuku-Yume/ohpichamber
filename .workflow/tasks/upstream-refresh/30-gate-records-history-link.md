# 30: Gate, records and upstream history link

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** One verified integration tip with a current receipt, a single authoritative upstream record pinning 0056bf6a9, updated development status, and an `ours` merge that makes 0056bf6a9 the next sync base.

**Blocked by:** 26, 27, 28, 29
**Files:** No upstream adoption paths. Records: `.workflow/upstream-refresh-2026-10-27.json` (successor baseline record), `.workflow/upstream-baseline.json` (mark the 1f9320062 inventory historical, add a pointer), `.workflow/development.md`, `.workflow/specs/upstream-refresh.md`, `.workflow/upstream-review.md` "Current adopted baseline", and the archived task files.

**Read first:** Spec W1, W8-W11 and Notes; `.workflow/standards.md` "Real path"; `.workflow/CONVENTIONS.md` §6-§7; decisions.md: 2026-10-27 - Link upstream history with an ours merge; `plan-path-coverage.tsv`.
**Covers:** W1, W8, W9, W10, W11

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run dead-code`, `bun run docs:validate`, `bun run electron:build` and a packaged launch pass; a real-provider chat completes; `git merge-base <tip> upstream/main` is `0056bf6a9`; the coverage artifact reconciles 4,031 paths; the tree scan finds no `packages/vscode`, `lib/opencode-trust`, OpenCode engine directory or new fallback adapter. One receipt names the commit and worktree.

## Done when

- [ ] Full gate at the integration tip passes and the receipt is stored under `/home/shizuku/Project/ohpichamber-omp-artifacts/`.
- [ ] `git merge -s ours 0056bf6a9` is on the integration branch; `git merge-base --is-ancestor 0056bf6a9 HEAD` succeeds.
- [ ] The successor record pins 0056bf6a9 with date, 813 commits, the measured totals, per-bucket counts, exclusions, and the artifact paths; `upstream-baseline.json` points to it as authoritative for the current pin.
- [ ] `development.md` records what is verified, what is not (macOS/Windows, physical mobile, live external tunnels/providers), and the next step.
- [ ] Every task is archived under `.workflow/done/upstream-refresh/`; the spec status is `done` after maintainer acceptance, `in progress` until then.
- [ ] No project document claims upstream 2.5.2 as the app version.
