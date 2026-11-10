# Systemic review of the 22-point UX report

**Date:** 2026-11-10
**Base:** `main` @ `02d166300`; upstream v2.7.0 = `bc50ba56a`; OMP 18.18.0
**Scope:** read-only. Six sweeps measured how far each reported defect's class reaches. This document supersedes the item-by-item framing of `specs/ux-v270-omp-alignment.md` as planning input; it makes no product decision.

## Why item-by-item remediation keeps failing

The previous effort (`ux-and-omp-parity-remediation`, 24 items, gate "passed") implemented its items literally, and several of them produced today's complaints:

| Previous item | What it built | Today's complaint |
|---|---|---|
| #21 list all OMP built-in commands | 29 CLI commands in Commands page | #9 polluted Commands page |
| #22 Extension Control Center | 21-pill provider wall + raw inspector | #11 cramped Plugins page |
| #19 OMP TUI tabs, structured editors | 157 OMP settings incl. terminal-only and raw editors | #6/#8/#10 bloat |
| #20 restore tool matrix | matrix added beside old list + text input | #7 duplicate controls |
| #18 Web Search provider cards | bespoke page | #4 regressed vs upstream |
| #14 restore unconfigured banner | banner over 26 unconfigured providers | #3 Usage page |
| #1, #2, #5, #8 perf, permission, titles, dictation glass | point fixes | #5, #13, #14, #15 recur |

Its gate verified each item as written, so a wrong item passed. Nothing compared whole surfaces against a reference, and fixes added controls without removing what they replaced.

## Root-cause classes

### R1. Upstream was never merged; the UI is a stale, partly rewritten copy

- Upstream history was linked with `git merge -s ours 0056bf6a9` (decision 2026-10-27), so git treats the hand-refreshed tree as having absorbed upstream. The 2.6.1 sync (`ux-and-omp-parity-remediation/12`) was file-level again.
- `packages/ui/src` vs v2.7.0: 1,363 files differ, 466 upstream files missing (404 existed at the 2.6.1 baseline and were silently deleted), 227 fork-only.
- v2.7.0 window (`6f067414f..bc50ba56a`): 53/53 UI commits have no equivalent in `main`; 663 of 12,835 added lines (5.2%) are present.
- Ledger integrity: 585 rows `adapt-pending`; 44 rows claim `adopted` for files that do not exist; 276 upstream paths have no row.
- Seven upstream CSS utilities were deleted while still in use (`oc-title-rest`, `oc-group-label`, `oc-bar-grow`, file-tree row utilities), and the composer lost `oc-surface-floating`/`oc-composer-sheen` (#15).
- Reported items that are upstream content: #1, #4, #19 (`ShownToolCard`, `HtmlRenderFrame`, `UiPageFrame`), #20 (`contextBreakdown`), #22 (General, Theme picker, Tools, Shortcuts, About, provider logos), part of #15.

### R2. GUI surfaces mirror OMP's terminal data model

- All 157 `OMP_SETTING_IDS` are rendered by a generic type switch: 22 GUI-meaningful, 22 TUI-only, 22 duplicate an OpenChamber control, 91 advanced internals. 146/157 have no consumer outside the page.
- 6 OMP `ui.condition` gates are dropped by the contract; 8 settings print raw ids; 13 of 15 locales lack 591 keys.
- Commands page shows 30 CLI commands (upstream: 2); `modelRoles` has 4 editors, `allowedTools` 3, default effort 3, `modelPresets` 2, recap 2; 16 files synthesize `__default__`/`__inherit__`/`__none__` entries; mode picker searches 4 items.
- Guidance cause: `AGENTS.md` ("Surface OMP's full runtime and TUI capabilities in the GUI") and decision `2026-11-05 - Scope M4 to full OMP 18.16.0 TUI feature/display parity` (which lists "visual selectors for all 16 `modelRoles` + `modelPresets`") were executed as "expose every TUI setting, role and command", while the maintainer's quoted intent was the TUI's functions and displays (`tui里的各项功能与显示`).

### R3. Chat pipeline runs OpenCode-era heuristics instead of OMP semantics

- Projection maps OMP `toolResult` to `role: 'system'` and authors empty `user` messages; the UI hides and re-pairs them.
- No `tool_execution_update` subscription: long `bash`/`task` show no body while running.
- Tool coverage (40 OMP tools + 6 host tools): specialized description 16/40, icon 11/40, header result summary 3/40, `input.i` intent 0/40. `NATIVE_TOOLS` lists a nonexistent `fetch` and omits 9 tools. `ask` result parser anchors on OpenCode text.
- Status line: hashed whimsical phrases; thinking state unreachable; retry/cooldown/permission-wait hardcoded off.
- Holds: 1500-char block hold + 320-char line hold (single-paragraph replies render nothing until 1500 chars), 100 ms flush, 100 ms throttle, 1200 ms status dwell. OMP holds only an unfinished table row.
- Reported items: #16, #17, #18, #20 (system rows).

### R4. UI state disagrees with authoritative state

21 instances (2 P0, 10 P1):
- No boot hydration: `usePermissionStore` hydrates only from a module with no production importer (#13); memory store absent on mobile/mini-chat; MCP status, web-search names read before load.
- Unknown collapsed into a default: `'ask'`, `0`, `false` are indistinguishable from real values.
- Events dropped for unknown entities: `session.updated`, metadata install (#14 titles).
- Cross-clock comparisons: Host `Date.now()` vs native file mtime purges suggestions and work hints (#14), seeds running sessions as idle.
- `scheduleAutoTitle` aborts with no re-arm on a second prompt.

### R5. Declared surfaces with no effect

- 19 persisted settings with no effect (`liveBrowserTabLimit`, `savePastedImagesAsFiles`, `agentSecretToolEnabled`, `agentToolsCodeMode`, `agentScheduleToolEnabled`, `messageLimit`, `cornerRadius`, …); 2 of them are not even persisted server-side.
- About 20 class names with no CSS rule (#2 `activity-spinner`, #15 `oc-glass-composer`).
- 10 telemetry fields hardcoded `null` (#20); `TurnPagesRow` renders `{part.type}`; `turn-pages` timeline row has no renderer.
- Fake rows: Desktop "Bundled (default)", tunnel "More providers coming soon".

### R6. Errors lose their cause; authorizers check pre-operation state

- Worker `operation.error` has no `detail` field; 243 of 263 `WorkerOperationError` sites use the default "SDK worker operation failed"; the Host re-masks parsed problem detail; 68 UI catches show translation-only toasts.
- Six authorizer checks validate a change against the snapshot taken before it (MCP server, MCP OAuth, new permission preset, new agent, provider/model added in-operation, MCP persist). #21 is the first of these.

### R7. Model selector grammar reimplemented everywhere

14 parsers, 12 formatters, 31 ad-hoc `provider/model` comparisons; none strips `:thinkingLevel`. OMP's parser exists only inside `agent-service`. #14 (AI Rename) is one instance; server-side small-model, Git commit model, fallback pinning, scheduled tasks and image generation share it.

### R8. Performance without measurement

#5: all OMP settings tabs mounted, cold worker per session, uncached catalogs. The previous effort claimed fixes for the same symptoms with no recorded measurement.

## Per-class structural fix and guardrail

| Class | Structural fix | Guardrail |
|---|---|---|
| R1 | Real three-way merge of upstream into `main`; ledger derived from git blobs | `scripts/upstream-drift` report: missing, stale, marker-free rewrites, false `adopted` rows |
| R2 | `surface` + `condition` in the OMP settings contract; curated row registry; one shared role editor; commands = prompt templates | Every setting id classified; all-locale key test; no field claimed by two pages |
| R3 | One OMP-keyed tool presentation registry; canonical tool-result placement; status from OMP intent/thinking; OMP streaming cadence; partial tool results | Coverage test over OMP tool names; replay test of a synthetic OMP stream |
| R4 | Boot-hydration registry with `unknown`/`ready`/`error` phase; upsert-or-buffer reducers; same-source freshness | Boot-registry test; unknown-entity reducer test; lint on `>= session.updatedAt` |
| R5 | Settings registry requires an effect; delete or wire dead keys; telemetry from real timings | Registry-effect test; CSS class existence check |
| R6 | `detail` end to end; authorizer evaluates proposed state; one UI problem-message helper | Sentinel error travels worker → toast test; reason required on `denied()` |
| R7 | One selector module in `agent-contract` porting OMP's grammar | Lint on ad-hoc model-ref splitting; round-trip test incl. `:high`/`:max` |
| R8 | Measured budgets via `scripts/perf` | Recorded before/after numbers per change |

## Acceptance must change

Item lists written from complaints certify the agent's reading of the complaint. Acceptance should instead be:
- **Reference comparison:** every Settings page, sidebar, and chat state captured side by side against upstream v2.7.0 built from `bc50ba56a`; chat behavior against OMP TUI on the same scripted prompts. A reviewer other than the implementer judges each pair.
- **Removal accounting:** each task names what it deletes; additive fixes beside an old control are rejected.
- **Guardrails in `bun run check`:** the scripts and tests above, so a class cannot return silently.
- The maintainer's 22 items stay as regression cases inside that matrix.

## Raw sweep reports

Agent transcripts `DeadSettingsAndStubs2`, `StateAuthority2`, `ErrorMaskingAndModelRefs2`, `OmpDumpSurfaces2`, `UpstreamDriftUI2`, `ChatPipelineHeuristics2` (2026-11-10 session). Line references above are from those reports at `02d166300`; R6 C1-C6 and R3 rows 17-18 are static traces, not runtime-observed.
