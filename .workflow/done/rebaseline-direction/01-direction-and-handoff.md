# 01: Reset project direction and queue the latest-upstream rebaseline

**Effort:** rebaseline-direction
**Task type:** feature
**Blocked by:** None
**Delivers:** The next conversation recovers the full latest-upstream baseline effort rather than continuing selective 1.x feature ports or starting OMP implementation from stale assumptions.
**Files:** Root guidance/README, .workflow project/migration documents, rebaseline spec, decision, and future tasks.
**Read first:** .workflow/standards.md, .workflow/CONVENTIONS.md sections 2 and 7, .workflow/development.md, .workflow/omp-migration/scope.md.
**Check:** Run `.workflow/bin/workflow validate`, recover the next task with `.workflow/bin/workflow next --no-color`, and check affected local links plus unchanged application-source/dependency paths. The archived direction task leaves upstream-rebaseline/01 ready, with tasks 02 and 03 blocked in order.
**Started:** 2026-10-10
**Finished:** 2026-10-10

## Done when

- [x] Make latest upstream first, then restore OhPiChamber customization, the current main goal.
- [x] Write a standalone spec and next-conversation todo with dependencies and acceptance evidence.
- [x] Preserve historical selective-sync/OMP/sandbox research while qualifying superseded import policy and stale source assumptions.
- [x] Validate workflow recovery, links, and documentation-only change scope; record independent review results.
- [x] Record removal of stale application-version statements as an acceptance condition after the future source update and verification.

## Progress

The maintainer clarified that the project should start from the latest upstream repository, not preserve 1.x while selectively importing features. The final instruction limits this conversation to documentation and future todo; application implementation belongs to a new conversation.

Before: `workflow next --no-color` reported `No tasks found.` Current README/project guidance identified v1.24.2 as the project basis; the development next step was M0, and the old upstream assessment excluded the runtime/feature upgrades now requested.

No Git/GitHub commands were authorized or run. Comparison evidence uses the retained pre-edit file snapshot at `/tmp/ohpi-import-work-qack0k5e/baseline`, not a Git diff. No application source, dependency, lockfile, changelog, or generated asset is changed by this task. Source-based migration re-audit is explicitly queued after the future source refresh.

Pre-archive checks: `.workflow/bin/workflow validate` passed with 5 task files. Task discovery listed this direction task in progress, only `upstream-rebaseline/01` ready, and its two downstream dependencies waiting. The final post-archive discovery check follows below.

The pre-archive refreshed snapshot smoke checked 5,317 existing paths: 15 existing Markdown documents changed, no existing path was removed, and no non-document source/dependency path changed. Five new files are the effort spec, its three future tasks, and this direction task. The affected 20 documents contained 112 checked local links with zero missing files or anchors before the development record gained its archive link. The refreshed comparison included the glossary and additional source-inspection findings and was supplied for review.

Application/runtime tests, native builds, live Docker, provider calls and OMP probes were not run: this deliverable is documentation and task routing, not the source update. No runtime trust boundary changed, so a runtime security review is not applicable. No commit or landing occurred.

Review A identified stale verification counts after the final glossary/research delta. Fixed by rerunning the snapshot/link smoke, replacing the comparison/evidence artifacts, and updating this progress record. Brief A rechecked the correction and passed with no remaining findings; Brief B passed with no findings. Both were independent general-purpose fallbacks because the named workflow-reviewer role is unavailable.

The documentation direction/handoff work is complete and archived without commit or landing. The future upstream-rebaseline effort remains proposed and unstarted; its source-update and source-based audit acceptance are not claimed complete.

Final post-archive checks: `.workflow/bin/workflow validate` reports `Workflow is valid (5 task files).` `.workflow/bin/workflow next --no-color` exposes only `upstream-rebaseline/01` as ready, with tasks 02 and 03 waiting in dependency order and no direction task in progress. Existing Python deprecation warnings do not prevent validation.

Final link/scope smoke checks 20 affected documents and 113 local links with zero errors, including the new development-to-archive link. All 5,317 baseline paths still exist; 15 changed existing paths are Markdown documents and no application/dependency path changed. The active direction-task path is absent and its archive exists. Final evidence artifacts record these post-archive counts and paths.
