# Retrospective: omp-through-m3

**Status:** prepared record; final maintainer acceptance pending. This retrospective is not finalized and does not close the effort.

## Goal

Migrate the adopted OpenChamber application to OMP through M3 acceptance, retaining Web/PWA, Electron, hosted/mobile and Guest SDK surfaces while retiring OpenCode execution and VS Code extension paths.

## What shipped

A user can create, stream, abort, reload and reopen canonical OMP sessions on Web and packaged Electron; reconnect from an authoritative snapshot without duplicated parts; answer approvals and questions under CAS and restart expiry; use durable queue delivery, canonical provider/model/agent/MCP/skill catalogs and Guest Shell; and use Board launch, child-session navigation and the restored tool/diff/output UI. The technical W1-W10 gate is complete; final maintainer acceptance is pending, and M4/M5 remain open.

Spec checks (W1–W10 plus PWA) all pass:

- **W1:** pass. Archived installable-SDK evidence and the accepted provider/platform limits remain the basis; unavailable provider/platform observations remain unverified.
- **W2:** pass. Host settings/theme/project/auth/FS/Git/PTY owners and the final root gate.
- **W3:** pass. Canonical create/stream/abort/reload/reopen on Web and packaged Electron, with archived session receipts.
- **W4:** pass. Canonical approval/question CAS, reconnect preservation and restart expiry.
- **W5:** pass. Durable Host queue ownership, leases, captured attachments and idempotent delivery.
- **W6:** pass. Service-backed model/provider/agent/MCP/skill/Shell catalogs.
- **W7:** pass for visual/tool behavior; packaged live-region at 400 ms remains inconclusive (Web announcement observed).
- **W8:** pass. Snapshot/cursor recovery with an empty `part.started`, one delta and a stable one-token body.
- **W9:** pass. Packaged child task/history/link/sidebar/page-back, Board draft and Guest Shell start/read/stop.
- **W10:** pass. Zero production old-client references and zero retired legacy URLs in the sanitized capture; source deletion plus archived static evidence.
- **PWA:** pass. Unauthorized manifest exposes only Appearance Settings; authorized manifest exposes real session titles and `?session=` URLs. Provenance is the Web Host with existing packaged state, not packaged Electron password authentication.

Final gate: `8d179c4e2`, receipt `.workflow/omp-migration/m3/task18-gate-final-2026-10-22.json`, all seven phases exit 0, artifact `a92fbb36…`. The root test omits the agent-contract and agent-service suites; focused evidence covers projection 16/16 and agent-service 220 pass / 7 skip / 0 fail. Prior-scope aggregate brief A/source/security/content reviews passed; the final C1-C4 closure-content recheck passed. This is not final maintainer acceptance. Task18 and Task57 technical work is archived; the spec remains in progress.

## Decisions that shaped it

- **2026-10-11 - Accept measured worker memory as an M0 limitation:** kept dedicated workers while recording the failed 100 MiB target as a resource limit. Measured M2 service RSS was 63,292 KiB; workers were 381,612 / 390,796 / 392,356 KiB. The higher cost has no later dedicated acceptance/revisit decision, so retain the resource risk.
- **2026-10-11 - Continue from the assembled migration baseline:** preserved a separate local baseline for isolated worktrees and restricted task commits to task-owned changes.
- **2026-10-12 - Keep provider and platform evidence as M0 prerequisites:** initially held the gate on real provider/OAuth and non-Linux evidence.
- **2026-10-12 - Leave unavailable platform evidence outside the M0 release condition:** withdrew Task30 as a mandatory pass when no real macOS/Windows runner was available; Task30 stayed archived, not renumbered or deleted.
- **2026-10-12 - Enter M1 with the observed provider path and explicit OAuth limitation:** accepted the measured stored-key path and kept official provider/OAuth behavior unverified.
- **2026-10-13 - Remove the M2 queue and consumer acceptance cycle:** ordered task 10/12 → 22 → 11 final acceptance → gate 23 without weakening the queue or credential-handoff checks.
- **2026-10-18 - Canonical agent profiles are the selectable UI roster:** used native `name`/`description` and removed legacy hidden/mode/display filters instead of creating an adapter.
- **2026-10-18 - Native agent controls and ConfigStore catalog retirement:** moved ModelControls and startup to `useAgentsStore`, removed client-side permission simulation, and kept policy in the native SDK/Host boundary.
- **2026-10-21 - Finish M3 by owning the observed dirty work and closing the gate cycle:** assigned live reopen, reconnect continuity, startup recovery, Web Search and restoration work to owned tasks rather than letting the final gate absorb unowned changes.

For the other decisions, no new `Revisit when` trigger was observed in M3; this is not a claim that no trigger exists. The measured service/worker RSS above has no dedicated later acceptance or revisit decision, so the resource risk remains. M4/M5 are not authorized by implication.

## Plan versus actual

- Tasks at break: 18 (Tasks 01–18).
- Added later: 56 (Tasks 19–74).
- Split: Task 17's owner closure was split into Tasks 44, 36 and 18; no separate split count is asserted and no task was renumbered.
- Dropped: 0. Task30 was withdrawn from the mandatory M0 gate but remains archived; it was not renumbered or deleted.
- Spec changes after confirmation: multiple plan amendments/continuations (the Tasks 19–74 packet) and the recorded Task30 platform-waiver decision; no exact count is asserted. W1–W10 acceptance criteria and product scope did not change.
- Recorded interruptions included Task36 blocked runtime receipt, Task15 Host task-policy dependency, Task65 paused/blocked reconnect path, and Task39 missing baseline (archive-only closure). Resolved by owning fixes and final gate.

## Review findings

- **Correctness:** the PWA manifest still read the retired legacy endpoint through undefined OpenCode helpers; native child result submission was rejected by the yield authorizer; a paired child result link disappeared once the task result existed; and W8 seeded the streaming part with the first delta, so history contained the token twice. All four were fixed.
- **Missing deliverable:** earlier packaged evidence covered only launch, a write row, and partial dialog/diff behavior. The final matrix added packaged child/Board/Guest, PWA, W8 recovery and the restored tool rows; no gap was deferred to M4/M5.
- **Standards/process:** evidence provenance drifted across superseded artifacts (`598bf582…`, `c438247e…`, `04dd…`, `068a…`, `eafd9462…`) and root-test omissions were initially unstated. The close labels old artifacts historical, names the current `a92fbb36…`/`8d179c4e2` evidence, records the agent-contract/agent-service omission, and keeps only current claims in status owners.
- **Pattern:** canonical projection and authorization edges failed at the boundary between seeded state and live events, and between completed child results and navigation. The response was to add focused regressions and re-run the assembled gate, not to add fallback paths.

## What changes

- **PWA legacy endpoint:** the manifest route now lists through `openChamberSessionService` after authorization and maps shortcuts with registered Host workspace boundaries; existing focused Web tests and the PWA matrix cover it.
- **Yield authorization:** child result submission now applies exact deny/profile/permission checks and grants no machine capability; the authorizer regression covers 20/20 cases.
- **Child result link:** the paired result link remains visible with the completed child record; the existing child-history/link checks cover it.
- **W8 duplicate seeded start:** the projector seeds `part.started` empty and applies the first delta once; the focused projection regression covers 16/16 cases.
- **No new `standards.md` line:** these are executable regressions, not judgement calls that need prose guidance. No lint rule, CI step, or standards entry was added at this stage.

## Debt left behind

- `technical-debt.md` has no entries; no open `Hotfix:` follow-up task touches this effort.
- **M4:** orchestration features such as Goals, Assist, queue orchestration, routing, Project Context, Agent Todo, Scheduled Tasks, Multi-run/Fusion and notifications remain open; this prepared record selects no M4 implementation.
- **M5:** packaged/mobile/Docker release certification remains open, including Capacitor reconnect/push/offline behavior, Electron updater handling, isolated-space Docker containment/escape evidence, and the supported platform matrix.
- **Packaged live-region:** the 400 ms `aria-live` measurement was inconclusive; only the Web announcement was observed, so no packaged assistive-technology claim is made.
- **PWA auth scope:** proof uses the Web Host with existing packaged state, not packaged Electron password authentication.
- **Other limits:** child snapshot 404 is the intentional history-only contract; non-Linux/macOS resources, official provider/OAuth grants, standalone npm runtime distribution and mobile/Electron platform certification remain unverified.
