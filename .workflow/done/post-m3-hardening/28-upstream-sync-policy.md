# 28: Answer how to keep up with upstream OpenChamber

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** 84a2df78fa8884e0bf2fe91698b525e1f0dc5cfe
**Started:** 2026-10-24T19:51:28+08:00
**Finished:** 2026-10-24T20:07:46+08:00

**Question:** How far has the fork diverged from upstream since `1f9320062c9a3c70925cf3243f1ee0c6e5f16765`, by area, and which sync policy (periodic selective import by area, security-only, or none) fits that divergence?
**Time box:** one divergence measurement and one sample import attempt; no fetch and no source changes.

**Delivers:** Answer to: how far has the fork diverged from upstream since `1f9320062c9a3c70925cf3243f1ee0c6e5f16765`, by area, and which sync policy fits that divergence. Records the measured divergence, the cost of each policy and a recommendation; the maintainer owns the final policy choice (open question 7).

**Blocked by:** None
**Files:** `.workflow/tasks/post-m3-hardening/28-upstream-sync-policy.md` only; no source changes. Reads `git diff --stat 1f9320062c9a3c70925cf3243f1ee0c6e5f16765 main` and local `upstream/*` refs.

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/upstream-baseline.json`; `.workflow/upstream-review.md`; `.workflow/decisions.md` "2026-10-10 - Latest upstream first then restore the fork"; `.workflow/spike-tasks.md`; `.workflow/CONVENTIONS.md` §6-§9; `.workflow/STYLE.md`
**Covers:** H15

**Check:** `## Findings` gives divergence per package/area, the cost of each policy, and a recommendation; the maintainer's choice becomes a `decisions.md` entry. This lane may change only task files, so it records the recommendation and hands the decision entry to the maintainer instead of writing it.

## Done when

- [x] Uses only local refs unless the maintainer permits a fetch.
- [x] Time box: one divergence measurement and one sample import attempt.

## Progress

- Dirty at start: none. No path was modified before the branch was cut.
- Branch/worktree: `post-m3-hardening/28-upstream-sync-policy` in `/home/shizuku/Project/ohpichamber-worktrees/lane-f-spikes`. The named branch did not exist; it was created at the exact start `84a2df78fa8884e0bf2fe91698b525e1f0dc5cfe`, which is `main` on 2026-10-24. `main` was not checked out or modified.
- Check before: spike, skipped per `flow-implement` step 1.
- Read: `specs/post-m3-hardening.md` (lane F order, H15, open question 7), `upstream-baseline.json`, `upstream-review.md`, the 2026-10-10 decisions entry, `spike-tasks.md`, `flow-implement`, `flow-verify`, `CONVENTIONS.md` §6-§9 and `STYLE.md`.
- Divergence evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/task28-2026-10-24/divergence-stat.txt` (the named `git diff --stat`), `divergence-numstat.tsv`, `divergence-name-status-renames.tsv`, `divergence-by-area.json`, `divergence-summary.txt`, `divergence-dirstat.txt`, `aggregate_divergence.py` and `method-and-limits.txt`.
- Sample-import evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/task28-2026-10-24/sample-import.patch`, `sample-import.log`, `sample-import-conflicts.txt`, `sample-import-conflict-hunks.txt`, `sample-import-status.txt`, `sample-import-worktree-add.log`, `sample-import-target.txt` and `sample-import-cleanup.log`.
- Sample-import cleanup: `git cherry-pick --abort` returned 128 because `cherry-pick -n` left no sequencer state; `git worktree remove --force` then `git worktree prune` removed the detached worktree. The worktree no longer exists, and the task branch stayed clean. No patch was applied to the task branch, `main` or repository source.
- Evidence provenance: exactly one sample attempt was executed, in the external artifact worktree. A later read-only preflight report repeated the same 3-file/7-hunk result under a `/tmp/task28-sample-import` path, but it did not execute a worktree-add or cherry-pick, that path does not exist, no worktree is registered, and the report followed this task's committed evidence. `/home/shizuku/Project/ohpichamber-omp-artifacts/task28-2026-10-24/preflight-provenance.txt` records the check; the preflight is not counted as a second attempt.
- Check after: `## Findings` records the divergence per package/area, the cost of all three policies and a recommendation. The single divergence measurement and single sample import attempt are recorded below. The maintainer's decision entry is handed off, not landed; open question 7 remains maintainer-owned.
- Validation: `.workflow/bin/workflow validate` passed on this archived record; no full root gate was run because this is a task-record-only spike and the coordinator asked for task-appropriate validation.
- Review boundary: `84a2df78fa8884e0bf2fe91698b525e1f0dc5cfe` + archived task path only; briefs A,B; boundaries: none (task-record-only, no runtime or trust boundary); findings: 0 blocking / 0 nonblocking. Brief A session `task28-preflight-audit` passed at `84a2df78f -> f8a4eeec7`. Brief B session `task28-preflight-audit` passed at `84a2df78f -> f6c952f9c`; child session `task28-upstream-sync.Task28FinalBriefB` also passed at `84a2df78f -> f8a4eeec7`.
- Review history: earlier rounds found and fixed the recommendation/direction reconciliation, a missing T column, a historical-lower-bound cost claim, and a blanket OpenCode exclusion; all blocking findings were resolved before the final passes. No child session self-identified as Brief A: the preflight session served Brief A at `f8a4eeec7` and a separate read-only Brief B turn at `f6c952f9c`. The child `task28-upstream-sync.Task28FinalBriefB` is an additional Brief B confirmation at `f8a4eeec7`, not a substitute for the preflight Brief B. CONVENTIONS §7 security pass does not apply: task-record-only diff, no trust boundary.
- Final state: branch-only, based on exact `main` `84a2df78fa8884e0bf2fe91698b525e1f0dc5cfe`; working tree clean; `main` remains at that SHA. The commit containing this Progress record is a metadata-only descendant of `f8a4eeec7`; it adds no source, spec, decision or evidence change. The exact final metadata SHA is reported with the handoff because a commit cannot contain its own hash.
- Landing: branch-only, no source, no `main` write. Branch is based directly on the exact `main`; rebase is required only if `main` moves before landing.

## Findings

### Answer

The fork is not a lightly patched OpenChamber. Between the pinned baseline `1f9320062` and `main` `84a2df78f`, the tree differs in **3,288 paths with +188,609 / -221,284 lines** (3,358 add/delete/modify entries when renames are split). The change is an engine replacement and product migration: `packages/vscode` is removed, `packages/agent-service` and `packages/agent-contract` are new, and the UI, web host and docs were reworked heavily. A full-tree merge would have to reconcile at least this fork-side difference; it is not a viable per-cycle policy.

The policy that fits is **periodic selective import by area**, but not the pre-2026-10-10 commit-level pick/exclude port. `.workflow/upstream-review.md` records the maintainer's current direction: adopt the latest upstream source as the application/runtime/dependency/build baseline, then restore fork customization. Applied periodically, that means taking a current upstream area's source as the baseline and reapplying the fork's documented OMP changes before the area is accepted. The measured fork-side burden alone is too large for a full-tree refresh every cycle; the upstream-side delta after `1f9320062` is not visible locally and adds unmeasured work. The sample cherry-pick of one small upstream sync bugfix (`987ee221c`, 5 files) failed with 3 conflicting files and 7 conflict hunks, so commit-by-commit porting is not the mechanism. Security/data-loss fixes are the first queue. The maintainer must decide the final policy and should authorize a fetch before committing to a cadence; a proposed entry is handed off below, not written to `decisions.md`.

### Method and limits

- Comparison point: `1f9320062c9a3c70925cf3243f1ee0c6e5f16765`, the pinned upstream revision in `.workflow/upstream-baseline.json`.
- Target: `main` = `84a2df78fa8884e0bf2fe91698b525e1f0dc5cfe`.
- Commands: `git diff --stat <pinned> main`, `git diff --numstat <pinned> main`, `git diff --name-status -M <pinned> main`, `git diff --numstat --no-renames <pinned> main`, and `git ls-tree -r --name-only <ref> | wc -l`. The per-area table uses the rename-aware output; `aggregate_divergence.py` maps rename destinations and reports zero unmatched paths.
- Local refs only. No fetch, GitHub command or network request ran.
- The pinned commit exists locally but is not an ancestor of `main`: the rebaseline adopted source, not history. It is unreferenced by any local branch or tag and survives only as a local commit object, so every comparison uses the literal SHA. `refs/remotes/upstream/main` is `de84da29e`, dated 2026-10-06 and 233 commits behind the pinned baseline. The newest upstream ref by tip date is `refs/remotes/upstream/bohdan/dev` (`b6c5f141b`, 2026-10-07), with 63 commits not in the pinned baseline.
- **Limitation:** no local ref represents upstream mainline work after the 2026-10-10 baseline. The measurement is current fork divergence from that baseline, not a count of upstream commits added after it, not an estimate of refreshing an area from current upstream, and not a no-sync future cost. The sample import uses an upstream branch commit, not mainline.
- **Limitation:** the diff includes deliberate OMP migration and workflow/document changes, not only upstream drift. Line counts include 363 binary entries.
- **Limitation:** the sample attempt was not conflict-resolved, applied or tested, so its cost is a lower bound for one small fix, not an estimate for a release-sized import.

### Divergence per package/area

Top-level areas, rename-aware. `R` is a detected rename; `T` is a type change. Churn is insertions/deletions against the pinned baseline.

| Area | Paths | A | D | M | R | T | Insertions | Deletions |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `packages/ui` | 1,159 | 86 | 179 | 885 | 9 | 0 | 48,790 | 107,767 |
| `packages/web` | 521 | 96 | 114 | 261 | 50 | 0 | 23,870 | 54,692 |
| `packages/vscode` | 166 | 0 | 166 | 0 | 0 | 0 | 0 | 43,517 |
| `packages/agent-service` | 106 | 106 | 0 | 0 | 0 | 0 | 20,986 | 0 |
| `packages/agent-contract` | 49 | 48 | 0 | 0 | 1 | 0 | 3,916 | 6 |
| `packages/docs` | 414 | 0 | 24 | 390 | 0 | 0 | 1,713 | 4,156 |
| `packages/sdk` | 34 | 3 | 0 | 31 | 0 | 0 | 1,891 | 1,490 |
| `packages/electron` | 40 | 7 | 8 | 25 | 0 | 0 | 1,204 | 798 |
| `packages/mobile` | 2 | 0 | 0 | 2 | 0 | 0 | 49 | 4 |
| `packages/extensions` | 2 | 0 | 0 | 2 | 0 | 0 | 6 | 2 |
| `scripts` | 35 | 25 | 1 | 9 | 0 | 0 | 3,329 | 973 |
| `vendor` | 19 | 19 | 0 | 0 | 0 | 0 | 1,319 | 0 |
| root files | 24 | 0 | 12 | 11 | 0 | 1 | 1,256 | 1,780 |
| `.github` | 320 | 0 | 316 | 4 | 0 | 0 | 47 | 2,189 |
| `changelog` | 10 | 0 | 8 | 2 | 0 | 0 | 55 | 1,623 |
| `docs` | 6 | 1 | 4 | 1 | 0 | 0 | 413 | 65 |
| `.opencode` | 16 | 1 | 15 | 0 | 0 | 0 | 80 | 1,371 |
| `.agents` | 42 | 22 | 8 | 12 | 0 | 0 | 1,402 | 729 |
| `.claude` | 32 | 22 | 10 | 0 | 0 | 0 | 1,324 | 10 |
| `.workflow` | 281 | 271 | 0 | 0 | 10 | 0 | 76,959 | 112 |
| `pr-evidence` | 10 | 0 | 10 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **3,288** | **707** | **875** | **1,635** | **70** | **1** | **188,609** | **221,284** |

The product packages account for 2,493 of the 3,288 paths. The `.workflow` total is mostly new workflow material (`upstream-baseline.json` alone is +34,353 lines; `.workflow/omp-migration` is +29,006), not upstream source. `.github` is mostly removal of upstream collaboration evidence and workflows.

Most-changed product subareas:

| Subarea | Paths | Insertions | Deletions |
|---|---:|---:|---:|
| `packages/web/server` | 503 | 23,657 | 54,411 |
| `packages/ui/src/components` | 538 | 20,270 | 39,574 |
| `packages/ui/src/sync` | 147 | 11,824 | 33,122 |
| `packages/ui/src/lib` | 293 | 7,870 | 20,095 |
| `packages/ui/src/stores` | 96 | 6,174 | 12,774 |
| `packages/agent-service/src/worker` | 48 | 10,996 | 0 |
| `packages/agent-service/src/supervisor` | 30 | 5,560 | 0 |
| `packages/agent-service/src/sessions` | 6 | 2,263 | 0 |
| `packages/ui/src/api` | 8 | 1,432 | 0 |
| `packages/ui/src/hooks` | 43 | 743 | 1,463 |

Engine-specific signs: 227 deleted paths name OpenCode; 154 new paths are under `packages/agent-service`/`packages/agent-contract`; the whole `packages/vscode` package (166 paths) is removed. Another 156 changed paths under `packages/web` and 47 under `packages/ui` name OpenCode. The remaining changed paths are shared product surface.

### Sample import attempt

One attempt, no retry:

- Source: local `refs/remotes/upstream/bohdan/dev` commit `987ee221c` — `fix(sync): follow a session into its new directory on session.moved` (2026-10-07, 5 files). It is not reachable from the pinned baseline (`git merge-base --is-ancestor` exit 1).
- Target: detached worktree at `main` `84a2df78f`.
- Command: `git worktree add --detach /home/shizuku/Project/ohpichamber-omp-artifacts/task28-2026-10-24/sample-import-worktree 84a2df78f`, then `git cherry-pick -n 987ee221c`.
- Result: exit 1. Conflicts in `packages/ui/src/sync/session-actions.ts` (1 hunk), `packages/ui/src/sync/sync-context.tsx` (5 hunks) and `packages/ui/src/sync/DOCUMENTATION.md` (1 hunk). `session-actions.test.ts` auto-merged and `__tests__/session-moved-event.test.ts` was added. No resolution was attempted and no test ran.
- Interpretation: the sample exercises commit-level cherry-pick, the mechanism superseded on 2026-10-10, and shows it is not viable even for a small fix. It sets one per-fix data point for security-only. It does **not** measure the recommended area refresh, which adopts an area's upstream source and then restores fork changes; that refresh still has to carry at least the fork-side area divergence above, plus the unmeasured upstream delta, and the time box allowed only one attempt.

### Cost of each policy

| Policy | Ongoing cost | Benefit | Main risk |
|---|---|---|---|
| **Periodic selective import by area (upstream-first area refresh)** | Choose an area; fetch current upstream (needs maintainer permission); adopt the upstream area source as baseline; reapply the fork's OMP customizations; resolve area-scale conflicts; run affected tests plus the root gate; record the disposition. The fork-side restoration is at least the measured UI/web difference (1,159/521 changed paths); the upstream delta after `1f9320062` is unmeasured. Commit-level cherry-pick is not a shortcut; the sample failed. | Aligns with the 2026-10-10 upstream-first direction; inherits shared UI/web/electron/SDK fixes and security/data-loss fixes; avoids a full-tree refresh every cycle. | Large area rework; unmeasured upstream-side changes; accidental reintroduction of OpenCode/VS Code if area boundaries are wrong; OMP regressions during customization restoration. |
| **Security-only** | Watch upstream security/data-loss commits and advisories; port each to local paths; test. The sample measured one commit-level per-fix cost (3 conflicts/7 hunks), but upstream work after the baseline is unmeasured; lower volume than area refresh, and some fixes target removed OpenCode/VS Code paths. | Lowest useful effort; preserves the OMP architecture; narrows review to security-relevant changes. | Misses non-security fixes; no baseline refresh, so the unmeasured upstream delta accumulates; depends on a reliable watcher. |
| **None** | No recurring sync effort. The fork's imported baseline remains `1f9320062`; upstream changes after it are not visible locally and are not included in this measurement. Dependency and toolchain updates remain a separate obligation. | Zero import work; no new upstream merge conflicts. | No upstream security/data-loss fixes; the unmeasured upstream delta accumulates. The measured fork-side divergence is not a no-sync future cost. Not recommended while the fork ships upstream-derived UI/web code. |

### Recommendation

Adopt **periodic selective import by area**, implemented as an **upstream-first area refresh**: for a chosen shared area, take the current upstream area source as the baseline, then restore the fork's documented OMP customizations. This follows `.workflow/upstream-review.md`'s current direction and is not the superseded pre-2026-10-10 commit-level pick/exclude port.

Priority order:

1. Security and data-loss fixes that map to retained code.
2. Generic UI/web/electron/SDK bugfixes in shared surfaces.
3. Selected feature work only after the maintainer accepts the area and its tests.

Exclude OMP-owned engine code (`packages/agent-service`, `packages/agent-contract`) and the removed VS Code package because they have no upstream area to refresh. For retained OpenCode-derived source, follow the upstream-first rule: refresh the owning area, then restore the fork's OMP replacement or removal; the fork's owning task (for example Task38 for the isolated-space proxy) decides whether the path is retained, replaced or removed. Do not apply the historical pre-2026-10-10 exclusion table as a blanket filter. Exclude upstream collaboration/review evidence, release notes and workflow machinery. Refresh one area on an area-sized branch, restore the fork's customizations against OMP invariants, run the affected tests and the root gate, and record the disposition. Do not attempt a full-tree merge every cycle.

If the maintainer wants the lowest reasonable process, **security-only** is the fallback. **None** is not recommended for an application that still carries upstream-derived UI/web code, unless the maintainer accepts owning all security fixes locally.

The measured 3,288 paths are a **fork-side historical lower bound**, not a future refresh or no-sync cost. They show the customization burden that any area refresh must restore; the upstream delta after `1f9320062` is unmeasured locally and would add work. The time box allowed one sample import, and that sample tested the superseded commit-level path, so it rules out commit-level porting and sets one per-fix data point for the security-only fallback; it does not measure area refresh. The recommendation rests on the maintainer's 2026-10-10 upstream-first direction and the size of the fork-side restoration burden, not on a quantified future-refresh estimate. A maintainer-authorized fetch is needed before committing to an area or cadence.

### Maintainer handoff

The final choice is **open question 7** and belongs to the maintainer. This lane may change task files only, so no `decisions.md`, spec, development or glossary entry was written; the decision must not be treated as landed.

Proposed `decisions.md` entry for the maintainer (not written):

```markdown
## 2026-10-24 - Refresh upstream OpenChamber by area

- **Decided:** adopt periodic selective import by area as an upstream-first area refresh: for a chosen shared area, take the current upstream area source as the baseline, then restore the fork's OMP customizations; prioritize security/data-loss fixes; exclude the OMP-owned agent service/contract and the removed VS Code package; for retained OpenCode-derived paths, refresh the owning area upstream-first, then restore the fork's OMP replacement or removal under the owning task (for example Task38), rather than applying the historical pre-2026-10-10 exclusion table as a blanket filter; exclude upstream workflow/release material; require a named owner, maintainer-approved fetch, the affected tests and the root gate. This is not the pre-2026-10-10 commit-level pick/exclude port.
- **Instead of:** security-only, no upstream sync, a full-tree merge every cycle, or commit-level selective porting.
- **Because:** the fork-side difference from the pinned baseline is 3,288 paths (a historical lower bound on customization restoration), and one small commit-level import failed with three conflicts; a full-tree merge each cycle is not viable, while area refresh follows the current upstream-first direction. The upstream delta after `1f9320062` is unmeasured locally, so the maintainer should authorize a fetch before committing to an area or cadence. No sync would leave upstream security and data-loss work unowned.
- **Mine:** no
- **Revisit when:** upstream stops touching shared surfaces, an area refresh cannot preserve an OMP invariant, or the maintainer chooses a different cadence.
- **Effort:** post-m3-hardening
```
