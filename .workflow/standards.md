# Standards

## What this project is

OhPiChamber is an OpenChamber fork. The technical [M3 W1-W10 gate](specs/omp-through-m3.md) is complete; final maintainer acceptance is pending, and the [rebaseline spec](specs/upstream-rebaseline.md) records the closed source/document prerequisite and unverified runtime certification. M4/M5 remain open and no next implementation is selected. Recover the next task through the workflow.

The pinned upstream application source has been adopted; unavailable runtime certification remains explicit. M0 SDK evidence and the recorded provider/platform limits were accepted, M1 Host extraction, durable operational metadata, authenticated credential preflight and VS Code extension retirement are complete, and the M2 service and credential-handoff gates are verified. The M3 Canonical Client cutover and task 17 legacy lifecycle retirement are implemented: retained UI, settings, Board, Guest Shell and utility callers use the canonical API, and the Host/Electron composition roots carry no legacy execution owner. The final root gate passed at HEAD `8d179c4e2` on 2026-10-22 (all seven phases exit 0; `.workflow/omp-migration/m3/task18-gate-final-2026-10-22.json`); postgate source `8d179c4e2` has the a92 matrix PASS for W7 visual sanity, W8, W9 child/Board/Guest, W10 and PWA (`.workflow/omp-migration/m3/task57-a92-matrix-2026-10-22/`). Task18 and Task57 technical work is archived. Limits: packaged live-region at 400 ms is inconclusive while the Web announcement was observed; PWA auth proof is the Web Host with existing packaged state, not packaged Electron password auth; child snapshot 404 is intentional. The technical W1-W10 gate is complete and final maintainer acceptance is pending; the spec remains in progress. M4/M5 remain open with no next implementation selected. [development.md](development.md) owns current evidence; the old `b9fbb4bb0` gate and `068a` artifacts are historical, and the [old upstream assessment](upstream-review.md) is historical research, not a selective-import policy.

## Starting a conversation

Use `flow-start` and `.workflow/bin/workflow next --no-color` at conversation start or after lost context. Resume the active task; use the matching workflow skill for its next step. Read-only agents may investigate independent boundaries in parallel. One coordinator owns edits in a shared tree.


## Running it

```sh
bun install
bun run dev
bun run test
bun run type-check
bun run lint
```

## Layout

`packages/ui` - shared UI, state, sync, and runtime contracts.
`packages/web` - web surface, Host Gateway, and CLI.
`packages/electron` - native desktop shell and privileged boundary.
`packages/mobile` - Capacitor shell and mobile surface.
`packages/sdk` - Guest SDK contract and examples.
`.workflow/omp-migration` - OMP migration scope, architecture, implemented contract and design records, and gates.
`.workflow/isolated-spaces` - inherited sandbox design and dated experiments, subject to OMP migration decisions.
`.workflow/development.md` - current progress, evidence limits, and next step.
`.workflow/upstream-review.md` - historical pinned selective-sync assessment.
`.workflow/specs/upstream-rebaseline.md` - current baseline-update scope and acceptance criteria.
`packages/**/DOCUMENTATION.md` - module-owned contracts.
`docs` and `packages/docs` - operational references, assets, and inherited product guides.

## How code is written here

Keep host-owned capabilities behind the Host Gateway and keep agent SDK objects private to the Agent Service.
Use package scripts as the command source of truth; validate the narrowest affected surface before broader checks.

## What we do not do

Do not add OMP compatibility layers, dual-engine selectors or fallback engines, or expand VS Code as a final supported surface. These are final migration constraints, not reasons to hold the prerequisite baseline update on OpenCode 1.x. Preserve fork-owned workflow and guidance rather than replacing them with upstream collaboration machinery.

## Branches and landing

Landing: local-merge

Local Git work follows the landing mode below. GitHub commands still require explicit user instruction under the root guide. Preserve unrelated worktree changes and use focused commits.

Task branches integrate into the effort branch, and the effort gate merges that branch to main. `.workflow/merge-strategy.md` describes alternate task-branch modes. Parallel implementation needs separate worktrees; parallel read-only research does not.
