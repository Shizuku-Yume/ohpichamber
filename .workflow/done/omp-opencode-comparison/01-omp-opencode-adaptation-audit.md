# 01: Compare OMP with OpenCode and classify OpenChamber adaptations

**Effort:** omp-opencode-comparison
**Task type:** spike
**Base commit:** f72010e3ef453a5218c3464b674b86c0ccc00a04
**Finished:** 2026-10-23T17:52:46Z
**Check after:** ## Findings

**Question:** How do the pinned OMP runtime, the pinned OpenCode package baseline, and the current OpenChamber fork differ in product and runtime semantics; which OpenChamber behavior is inherited OpenCode adaptation versus fork- or host-specific; which capabilities require OMP-specific redesign rather than a mechanical port; which OMP capabilities are absent or unadapted in OpenChamber; and what adaptation, defer, or retirement order follows?

**Time box:** one read-only evidence pass over the eight domains below. Stop when every matrix answers its rows; record unresolved cells as `unknown` with a GAP id instead of extending the pass. No application run, build, test, new probe, or network access.

**Delivers:** Answer to the question in one research report: `.workflow/research/omp-opencode-openchamber-audit.md`. It records the revision/evidence ledger, eight domain matrices, the OpenChamber-adapted-from-OpenCode trace, the OMP capability-gap list, a P0-P3 adaptation/defer/retire register, and the runtime-evidence limits. It records implications only; it makes no product decision and proposes no implementation.

**Blocked by:** None
**Files:** `.workflow/research/omp-opencode-openchamber-audit.md` (new; the only file this task writes). Do not edit `packages/**`, `.workflow/omp-migration/**`, `.workflow/specs/**`, `.workflow/decisions.md`, or `.workflow/glossary.md`.

**Read first:** `AGENTS.md`; `.workflow/standards.md`; `.workflow/STYLE.md`; `.workflow/omp-migration/README.md`, `scope.md`, `architecture.md`, `contracts.md`, `implementation-plan.md`, `feature-inventory.md`; `.workflow/specs/omp-through-m3.md`; `.workflow/development.md`; the M0 records under `.workflow/omp-migration/m0/`; `.workflow/specs/upstream-rebaseline.md`; `.workflow/upstream-baseline.json`.

## Method

Start with `flow-start` and `.workflow/bin/workflow next --no-color`. This is read-only research: only the report is written.

Fix the revision ledger before reading behavior. Record the exact identity and how it was proven:

- **OMP:** source revision `c9de2b02b997f37cc89639282ed35dec86f139e8`, package `@oh-my-pi/pi-coding-agent` 18.8.9, authored fingerprint `b70a2f4afd9fd8fa9ec20094e9658b528e943eff52608d296af2366b80241ad1`, from `.workflow/omp-migration/m0/source-identity.json` and `source-install.json`. The vendored source is `vendor/omp/c9de2b02/`. Do not invent a checkout revision for `/home/shizuku/Project/oh-my-pi`.
- **OpenCode:** `@opencode/client@2.0.25`, `@opencode/schema@2.0.25`, and `@opencode/protocol@2.0.25` from `bun.lock`; record integrity and whether an installed or archived package copy exists. Record a repository revision only if provable from the package; otherwise write `revision: unproven` and cite the package version. Never cite a moving branch.
- **OpenChamber as built:** current worktree HEAD at audit start (main was `7b495354bd6c744f1c9ea924dd71af21afaf25d9`), plus the adopted upstream application revision `1f9320062c9a3c70925cf3243f1ee0c6e5f16765` from `.workflow/upstream-baseline.json` (metadata version 2.2.0). The historical v1.24.2 / `336e19248fa0bc0bd9d3bd843e1057d4e2cf62e7` inventory is comparison input, not current state.

For each row, trace three sides before judging divergence:

- **OMP:** pinned source path:line, or an existing M0 artifact for exercised behavior.
- **OpenCode:** 2.0.25 package API/schema/source path; state plainly when only the package is available.
- **OpenChamber:** current caller, route, store, component, or host module, and whether the behavior is inherited OpenCode code running today, fork/host-specific, proposed by a migration document, or absent.

Compare semantics, not names: identity, turn/run completion, state authority, persistence owner, scope, event ordering, approval/queue behavior, config precedence, and extension boundaries. Use read-only `grep` or `xd://ast_grep` for dependency and data-flow edges (`@opencode/` imports, `/api/opencode` routes, `opencode.json`/`auth.json` readers, SSE/proxy/lifecycle code, translators, session/agent/config stores). Do not bulk-load packages; do not open `.env*`, credential stores, tokens, or session data.

Label every row with an evidence class: `S` pinned source-level, `R` existing runtime receipt naming only the exercised boundary, or `I` inference with a cited premise and GAP id. Source presence is never `verified`; never promote `I` to `S` or `R`.

### Domain matrix

| # | Domain | Rows must cover |
|---|---|---|
| 1 | Agent/session/model/delegation | Root identity, agent/profile selection, subagent spawning and limits, model roles/fallbacks, turn/run completion |
| 2 | Project/workspace/context | cwd and additional roots, project instructions/imports, context files, memory, worktree binding, directory scope |
| 3 | Tools/approval/security | Tool inventory, approval tiers/modes, ask/approval events, host gatekeeper boundary, tool interception, shell/PTY/browser ownership |
| 4 | Provider/auth/settings | Model registry, auth storage/rotation, config precedence, provider capabilities, secrets boundary |
| 5 | Sessions/history/branch/queue | Persistence format, transcript authority, fork/branch/revert, compaction, resume/recovery, queue durability/delivery |
| 6 | Skills/extensions/MCP | Skill roots/expansion, slash commands, extensions/hooks/custom tools/plugins, MCP config/transports/OAuth, dynamic apply |
| 7 | TUI/CLI/API/runtime surfaces | Interactive/print/RPC/ACP modes, CLI commands, event/stream protocol, hosted-server assumptions, process topology |
| 8 | OpenChamber differentiators | Board/source control, environments, Quake, isolated spaces, goals/assist/walkthrough/routing/fusion, pairing/relay/tunnels, notifications/voice, guest extensions, PWA/mobile |

## Output shape

The report uses these sections in order: purpose and limits; revision/evidence ledger; direct answers to the five questions; domain matrices 1-8; OpenChamber-adapted-from-OpenCode trace; OMP capability gaps; prioritized adaptation/defer/retire register; runtime-evidence and GAP register; review record.

Each domain has two linked tables sharing `ID`:

**Semantics:** `ID | Capability | OMP semantics | OMP evidence | OpenCode semantics | OpenCode evidence | OpenChamber behavior | OpenChamber path | Evidence class | Divergence`

**Disposition:** `ID | Origin (inherited-OpenCode / OpenChamber fork / host-specific / OMP-required) | Current status (verified / implemented-unverified / proposed / absent) | Adaptation (Mechanical port / Contract or projection redesign / Host-owned unchanged / OMP-native replacement / Deferred / Retire) | Final target | Risk P0-P3 | Migration implication (named contract, owner, caller, evidence task, or deletion)`

Rules:

- Mark capability inherited from OpenCode as such even when OpenChamber restyled the UI.
- Distinguish implemented-but-unverified source from verified runtime behavior; a migration document's claim is `proposed`.
- `Final target` states intended OMP-era behavior, not current code.
- Every `Divergence` has evidence or `unknown` plus a GAP id; no empty required cells.
- Trace every claimed OpenCode-derived OpenChamber feature to an OpenCode type/route/event/UI or to fork-owned host code.
- Account for every retirement item named by `scope.md`, including VS Code, cloud session sharing, `opencode.json`/auth importer, lifecycle/proxy/port probing, LSP cleanup, `.opencode/commands`, OpenCode agent identity, OpenCode event/session schema, and engine-switch UI.

Prioritize with concrete implications: **P0** blocks freezing a canonical contract or service invariant; **P1** breaks a retained workflow if mechanically ported at M3; **P2** is a parity/quality gap for retained M4/M5 surfaces; **P3** is explicit defer or retire with no migration work.

## Check

`workflow validate` passes and the report answers the question with auditable evidence. No build, test, runtime, or API command is part of this Check.

- [x] `.workflow/research/omp-opencode-openchamber-audit.md` exists and contains all eight domain matrices and the required sections.
- [x] Every row has a unique ID, both linked tables exist per domain, no required cell is empty, and every citation resolves to the revision/evidence ledger.
- [x] Every `I` row has a GAP id; no source-level claim is labeled `verified`.
- [x] The five requested answers are traceable to rows: semantic differences, OpenCode-derived features, redesign-versus-port, OMP gaps, and prioritized adaptation/defer/retire.
- [x] Runtime evidence is limited to existing M0/development receipts and names the exercised boundary; no new run or secret value appears.
- [x] `.workflow/bin/workflow validate` passes and `git status --porcelain` shows no task change outside the report.

## Done when

- [x] Revision ledger pins OMP source/fingerprint, OpenCode package baseline with proven-or-unproven revision, OpenChamber audit-start HEAD, and adopted upstream revision.
- [x] Inheritance classification separates inherited OpenCode code, OpenChamber fork/host behavior, OMP-native replacement, and absent/unadapted capabilities.
- [x] The OMP capability-gap list and prioritized P0-P3 adaptation/defer/retire register are complete and evidence-linked.
- [x] Evidence gaps and runtime limits are explicit; no final product decision or implementation is recorded.

## Progress

- Dirty at start: none in the Lane E worktree. The main worktree's unrelated dirty paths (including `packages/agent-service/src/sessions/registry.ts`) were preserved and never staged.
- Check before the change: not applicable; `Task type: spike`.
- Work: one read-only evidence pass produced `.workflow/research/omp-opencode-openchamber-audit.md`; two report-only correction rounds addressed review findings; the branch was rebased onto `7cc282d08504afc88d1531b6ba527009de3b0794` with report content preserved (blob `5060da434583863b56a18cd5e6d49b920fc5a96e`).
- Coordinator-authorized root gate (not this task's Check): `bun run test` at `1739fd0da40b553cc399c926bf7e171e3ac4a3f1` with base `ecdeb110d835d09defa60d4e91b0e1dbecf8a3df` exited 1 with 0/7 suites. The log shows missing worktree dependencies/tools (`zod`, `tsx/cjs`, `@legendapp/list/react`, OMP/workspace packages, `vitest`) and the `ensure-electron` `resolveElectronPackageDir` assertion. It is recorded as an environment/setup failure; it does not establish a code pass and is not this spike's Check. Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-e-root-gate-20261023.qtML76/`.
- Review boundary: `7cc282d08504afc88d1531b6ba527009de3b0794...4fe79f6f3cc4a2943ccbc62df202f456dd2df8f8` + `.workflow/research/omp-opencode-openchamber-audit.md`; round: 2; briefs: A,B; boundaries: none (docs-only, no trust boundary); findings: 0 blocking / 0 nonblocking.
- Round 1 at `18ee8f4ac`: Brief A passed with no findings; Brief B passed with one nonblocking citation drift (`shared.js` cited as a current `lib/opencode` owner). Verified at `7cc282d`: the helper is Host-owned at `packages/web/server/lib/host/shared.js`, `scheduled-tasks/loops.js` imports `../host/shared.js`, and no `.opencode/commands` reader remains. Fixed report-only in `4fe79f6f3`.
- Round 2 at `4fe79f6f3`: fresh Brief A and Brief B both passed with no findings. `.workflow/bin/workflow validate` exits 0 (`Workflow is valid (120 task files)`); narrow checks found 22 tables with 0 column mismatches, 85 paired matrix IDs, 0 `I` rows without a GAP, 9 `S/R` rows naming a same-row M0 receipt, 300 concrete citations resolved, and 0 out-of-bounds line ranges. Receipts: `.../lane-e-root-gate-20261023.qtML76/rebase-doc-checks.json` and `delta-doc-checks.json`.
- Ownership: the original `Files` line permitted only the report; the coordinator explicitly authorized this task-record update and archive after validation and both fresh reviews passed.
- Landing: not merged. Branch `lane-e/omp-opencode-comparison` holds the report commits plus this archive commit; `main` was not edited or merged.

## Findings

- Answer summary: OMP is an embeddable single-process runtime whose SDK owns the agent loop, transcript, tools, model registry and credentials, while OpenChamber now serves most product data through its canonical Host/Agent Service contract and retains an OpenCode-shaped interaction layer plus residual proxy and isolated-space runtime. Capabilities that need contract or projection redesign rather than a mechanical port are run/turn completion, approval authority and expiry, queue delivery, transcript authority, credential isolation, worker environment allowlisting, MCP/skills application, and OMP-native task isolation, model roles/fallbacks and checkpoint/rewind. OMP TUI, print, RPC and ACP surfaces are absent by design. Fork differentiators (board/source control, environments, Quake, isolated spaces, goals/assist/walkthrough/routing/fusion, relay/tunnels, notifications/voice, Guest SDK, PWA/mobile) are Host-owned and mostly engine-independent; isolated spaces remain the only place OpenCode still executes, with hardening task 08 owning that decision.
- Confidence limits: source-level evidence and existing receipts only; no new application run, build, probe or network access. OpenCode 2.0.25 is package-level with `revision: unproven`. M3 runtime evidence is excluded. `OCB` citations are pinned to audit-start `f72010e3e`; where a path later moved (notably `shared.js`), the report states the relocation explicitly.
- GAP ids: GAP-01 through GAP-25 in §6 and §8, with every `I` row carrying a GAP. P0 covers canonical-contract/service invariants; P1 covers retained workflows at mechanical port; P2 covers M4/M5 parity; P3 is explicit defer or retire.
- Review outcomes: round 1 Brief A pass (0 findings) and Brief B pass (1 nonblocking, fixed); round 2 fresh Brief A and Brief B both pass with no findings at `4fe79f6f3`.
- Suggested follow-up documents/tasks (not created here): hardening 08 (isolated-spaces decision), 04 (worker environment allowlist proof), 06 (completion-consumer audit), 09 (user-visible text truth pass), plus the P0 contract-freeze work and M4/M5 parity items named in §7.
