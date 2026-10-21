# OMP migration development documents

These documents define the adopted OMP-only migration of OhPiChamber. The source-aware review covers the pinned upstream baseline recorded in [the preservation inventory](../upstream-baseline.json). The [historical inventory](feature-inventory.md) retains its original observations. Implementation evidence belongs to [development.md](../development.md); this design set does not certify it. Start with the repository [agent guide](../../AGENTS.md) for development rules and task-specific reading requirements.

Read [development progress and lessons](../development.md) for verified work, remaining gates, and findings from implementation. Keep progress there rather than treating this design set as a completion log.

The [latest-upstream rebaseline](../specs/upstream-rebaseline.md) has adopted the application source and closed its prerequisite at the source/document boundary under the recorded maintainer decision. Unavailable runtime certification remains unverified, not passed. M1 Host extraction, VS Code retirement, the M2 service and credential-handoff gates, and the M3 Canonical Client/UI cutover including task 17 legacy retirement are implemented. The final root gate passed at HEAD `8d179c4e2` on 2026-10-22 (all seven phases exit 0; `.workflow/omp-migration/m3/task18-gate-final-2026-10-22.json`); source `8d179c4e2` carries the repairs included in that gate and the a92 matrix PASS for W7 visual sanity, W8, W9 child/Board/Guest, W10 and PWA. Task18/Task57 technical work is archived; the technical W1-W10 gate is complete and final maintainer acceptance is pending. The spec remains in progress. M4/M5 remain open with no next implementation selected. The earlier `b9fbb4bb0` gate and `068a` artifacts are historical.

## Decisions

- OMP is the only agent runtime in the final target, after the upstream baseline refresh and migration-design re-audit.
- OpenCode is not an OMP compatibility target. Inheriting upstream's existing runtime during the rebaseline is permitted; adding an `OpenCodeBackend`, OpenCode-shaped canonical routes, a configuration adapter, or a fallback engine to the OMP design is not.
- VS Code extension support is out of scope. The migration retains Web/PWA, Electron, Capacitor mobile, and the OpenChamber Guest SDK surfaces listed in the feature inventory.
- The existing OpenChamber host remains the owner of filesystem, Git, worktree, PTY, browser, authentication, pairing, relay, notifications, and extension sandbox behavior.
- The OMP Agent Service owns agent execution and exposes the OpenChamber Canonical API under `/api/agent/v1`.
- The target uses OMP's SDK inside an isolated Bun Agent Service with dedicated SDK worker processes. Shared-process concurrency requires M0 evidence before replacing this isolation, as defined in architecture ADR-03.
- The browser and mobile clients do not receive OMP SDK objects. They consume JSON-safe canonical records and ordered events.

## Reading order

1. [scope.md](./scope.md). Product boundary, retained surfaces, removed VS Code scope, and feature ownership.
2. [architecture.md](./architecture.md). Runtime topology, ownership, process boundaries, and design decisions.
3. [contracts.md](./contracts.md). Canonical API contract, records, events, errors, and state transitions.
4. [implementation-plan.md](./implementation-plan.md). Milestones, work packages, gates, and acceptance evidence.
5. [feature-inventory.md](./feature-inventory.md). The historical feature inventory, preserved for comparison and expanded through the post-rebaseline review.

## Status vocabulary

- **Baseline**: observed in the supplied inventory or current repository.
- **Decision**: selected product or architecture direction.
- **Proposed**: contract or implementation shape to validate before coding.
- **Verification gate**: work that must run against the installed OMP version before the design is treated as executable.
- **Out of scope**: intentionally not maintained by the OMP-only fork.

## Non-goals of this document set

These documents define design and decisions; they do not by themselves certify the implemented Agent Service, Canonical API, data migrations or UI cutover. [development.md](../development.md) owns acceptance evidence. They do not define a second compatibility layer for OpenCode. They do not make the removed VS Code extension a supported runtime.

Resolve migration design conflicts using the [document hierarchy in scope.md](./scope.md#document-hierarchy). The feature inventory is the historical baseline, not an override of the scope or contracts. Record product decision changes in `scope.md` and update affected design documents before changing implementation.
