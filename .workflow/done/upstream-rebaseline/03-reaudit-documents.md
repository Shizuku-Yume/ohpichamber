# 03: Re-audit migration and owning documents against the refreshed source

**Effort:** upstream-rebaseline
**Task type:** feature
**Blocked by:** None
**Delivers:** Current OhPiChamber documentation grounded in the refreshed upstream source, with preserved historical research and a source-aware next OMP implementation task.
**Files:** AGENTS.md, README.md, .workflow/development.md, .workflow/standards.md, .workflow/omp-migration/, .workflow/isolated-spaces/, affected owning package/module and operational documents.
**Read first:** .workflow/specs/upstream-rebaseline.md, task 01's pinned-source inventory, task 02's runtime evidence, .workflow/omp-migration/scope.md, .workflow/upstream-review.md.
**Covers:** W5
**Check:** Trace current feature/owner/API/lifecycle/configuration claims to the pinned assembled source, run `.workflow/bin/workflow validate` and `.workflow/bin/workflow next --no-color`, and exercise local-document links and referenced command discovery. The migration docs cover the refreshed source; historical claims remain labeled and unsupported capabilities remain gates.
**Started:** 2026-10-11

## Done when

- [x] Re-inventory all refreshed application features and compare them with the preserved historical inventory without rewriting earlier findings as if observed on the new source.
- [x] Re-audit scope traceability, surface coverage, module ownership, process lifecycle, persistence, credentials, sessions/events, Guest Shells, queues, and isolated-space boundaries.
- [x] Update architecture/contracts/implementation-plan assumptions that no longer match the refreshed source; keep unverified OMP schemas explicitly proposed.
- [x] Align project/package/module/setup documents and distinguish latest upstream behavior, restored fork customization, observed verification, and later OMP-only work.
- [x] Preserve old investigations and useful lessons with their original baseline and evidence limits; replace outdated operative exclusions and next-step statements.
- [x] Queue the source-aware OMP M0 capability probe as the next implementation step only after this review; no OMP gate is advanced by the baseline update.
- [x] After the new source is verified and the documentation audit is complete, remove old application-baseline version statements throughout project documents, including `used OpenChamber v1.24.2` phrasing; do not replace them with another permanent hard-coded release in introductions. Retain useful investigation content without treating its old version framing as current guidance.

## Progress

Started with task 02's verified source and recorded evidence. The documentation audit proceeds independently of task 02's remaining runtime limits: missing authenticated Board item/action evidence, unavailable live Docker containment, unavailable native mobile/provider/remote-host evidence, the Web/PWA self-navigation confidentiality limit, and the unavailable independent follow-up review. None of those limits is being erased or treated as a passing OMP/M0 gate.
Check before: The task was queued behind task 02 and had stale current-state wording, so the source-aware W5 audit had not been run as an active task.

Audit result: Current source claims were reconciled in `README.md`, `.workflow/development.md`, `.workflow/specs/upstream-rebaseline.md`, `.workflow/omp-migration/architecture.md`, and `.workflow/omp-migration/contracts.md`. The refreshed scope traceability already records Board, environment overlays, Quake, file moves, Guest lifecycle, small-model callers, and isolated spaces. Historical `.workflow/upstream-review.md`, `.workflow/omp-migration/feature-inventory.md`, and archived task 01 remain unchanged. Task 02's Web/PWA Guest document-authentication issue, missing authenticated Board item/action evidence, unavailable live Docker containment, unavailable native mobile/provider/remote-host evidence, and unavailable independent review remain explicit blockers. No OMP/M0 capability or platform gate is claimed.

Check after: Final `.workflow/bin/workflow validate` passed with `Workflow is valid (5 task files)`; final `.workflow/bin/workflow next --no-color` reported only task 02 in progress and no ready tasks; `bun run docs:validate` passed with `696 pages, 58 sidebar links`; an in-memory local Markdown link scan checked 124 links with zero missing files or anchors; referenced-command discovery found Bun, Node, `.workflow/bin/workflow`, and the documented root scripts `docs:validate`, `build`, `type-check`, `lint`, and `test`.

No application source, task 02, changelog, dependency, Git/GitHub, or `../opencode` files were changed.

**Finished:** 2026-10-11
