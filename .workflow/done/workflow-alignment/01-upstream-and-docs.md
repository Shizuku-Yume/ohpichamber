# 01: Review upstream changes and make workflow the development entrypoint

**Effort:** workflow-alignment
**Task type:** feature
**Blocked by:** None
**Delivers:** Maintainer can see which upstream changes fit the fork and use one workflow entrypoint with accurate implementation facts and reachable development documents.
**Files:** AGENTS.md, README.md, .workflow/, .workflow/development.md, .workflow/omp-migration/, .workflow/isolated-spaces/, incoming documentation and skill pointers.
**Read first:** .workflow/standards.md, .workflow/CONVENTIONS.md sections 2, 4, 5, 6, 7, .workflow/omp-migration/scope.md, .workflow/development.md.
**Check:** Run `.workflow/bin/workflow validate`, `.workflow/bin/workflow next --no-color`, and an in-memory local-link, old-path and source-fact smoke for the relocated documents. Validation has no errors; next exposes this active task before archive and no unfinished task after archive; every relocated-document link resolves; old development paths are absent; source facts remain pre-M0.
**Started:** 2026-10-10
**Finished:** 2026-10-10

## Done when

- [x] Compare upstream v2.1.1 with pinned head 78dacb27fee580ec945a828d781cfe39b200b7bd and record pick, exclude and defer recommendations with source evidence.
- [x] Correct current facts without claiming upstream changes are applied or migration gates passed.
- [x] Move development records and design documents from docs to .workflow and update all incoming references.
- [x] Make flow-start the entrypoint for future conversations and preserve fork constraints in workflow execution.
- [x] Exercise workflow validation, task discovery and documentation links; record evidence and limits.

## Progress

The user requested documentation and workflow alignment, then added upstream change assessment before editing facts. Source changes and cherry-picks are outside this task.

Git authorization was not supplied. Dirty-at-start and Base commit are not recorded because the repository forbids Git commands without explicit user instruction. Existing files are read through snapshot-anchored tools; unrelated content is preserved. No branch, commit, push, fetch, or landing is performed.

Check before: `workflow validate` passed with 0 task files; `workflow next --no-color` reported `No tasks found.` Development documents still live under docs, and workflow routing is appended at the end of AGENTS rather than the default conversation entrypoint.

Check before for the new document destinations failed in the in-memory path smoke: `.workflow/development.md`, the migration index/scope/contracts, isolated-space design and upstream assessment were absent. The old 34-document local-link baseline resolved 78 links with no errors, proving existing links needed preservation rather than repair.


Read-only review runs in parallel. All documentation integration is owned by the coordinator in the current tree. Upstream input is pinned rather than fetched into repository refs. Runtime tests from earlier tasks remain historical evidence, not reruns for this task.

Upstream assessment completed before fact edits. Six read-only boundary reviews were reconciled into `.workflow/upstream-review.md`. Conflicting suggestions to restore bots, import OpenCode proxy/provider code, or call a Node image bump standalone hardening were rejected or deferred under fork scope. No upstream code was applied.

Moved 15 development/design documents to `.workflow` at the same relative depth; removed one byte-identical, unreferenced inventory duplicate. Updated incoming package and skill pointers, leaving operational/product/module documents in their owners. Reclassified historical test counts and SDK versions, corrected mobile canonical-API and direct-Agent-Service transport claims, and kept all migration gates pre-M0.


Check after: actual `workflow validate` reports `Workflow is valid (1 task files).` `workflow next --no-color` exposes this task as in progress and no ready tasks. The initial validation found the new decision's Mine value was not exactly `no`; corrected that format and reran successfully. Python emits existing positional regex-argument deprecation warnings, but validation succeeds; workflow implementation is unchanged.

In-memory smoke checks 35 affected documents and 101 local links with zero missing files or anchors. All 15 destinations exist and old source files are absent. Repository text search finds no old development paths. Source-fact checks retain metadata 1.24.2, Node >=22, no Agent Service/agent contract package or canonical route in the host entrypoint, existing VS Code source, and unwired spaces without dispatcher. All cited upstream commit IDs resolve against the pinned 309-commit manifest.

Review uses the captured pre-edit document snapshot rather than an unauthorized Git diff. Both required briefs run in independent general-purpose agents because the named workflow-reviewer role is unavailable. Application tests, benchmarks, native builds, live Docker and OMP probes are not applicable to this docs-only change and were not run.

Review A, built as asked and process: pass, zero blocking or nonblocking findings. Review B, quality: pass, zero findings. Both used independent general-purpose fallback agents and the pre-edit file baseline. No runtime security boundary changed, so a runtime security pass was not applicable.

This task is complete and archived without commit or landing under the explicit Git authorization rule. No agent-owned product decision was added; the workflow ownership decision records the maintainer's request. Final archive validation and task-discovery evidence follows.

Final archive smoke: `.workflow/bin/workflow validate` reports `Workflow is valid (1 task files).`; `.workflow/bin/workflow next --no-color` reports `No tasks found.` The archived task remains valid and no unfinished task is exposed. Existing Python deprecation warnings remain outside this docs-only scope.

Final link smoke after archival and evidence linking: 35 documents, 102 local links, zero errors. The active task path is absent and the archived path exists.
