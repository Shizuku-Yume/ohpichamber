# 01: Authorize OMP tools by their declared tier so Vibe mode runs

**Effort:** ux-feedback-2026-11-15
**Task type:** bugfix
**Blocked by:** None
**Covers:** W1
**Files:** `packages/agent-service/src/{native-policy-protocol.ts,protocol.ts}`, `packages/agent-service/src/worker/{session.ts,interaction.ts}`, `packages/web/server/lib/host/{worker-operation-authorizer.js,worker-operation-authorizer.test.js,settings-registry.json,settings-helpers.js}`, `packages/ui/src/lib/settings/registry.ts`, `.workflow/omp-migration/{architecture.md,contracts.md}` (authorizer rule text)
**Read first:** spec "How it is built → Tool tiers"; `research/feedback-2026-11-15/VibeDenials.md` (F2–F6, §2); `decisions.md` 2026-11-15 "The Host classifies OMP tools by the tier each tool declares" and 2026-11-13 "Host authorizes OMP tools by tier"; ADR-05 in `architecture.md`
**Check:** the new registry coverage test fails on `1fc6270437` for `vibe_spawn` and passes after; `bun run --cwd packages/web test -- server/lib/host` and `bun test --timeout 15000 src/worker src/supervisor src/interaction` in `packages/agent-service` exit 0. Real path (Web, isolated data dir, real provider): Vibe + `auto` → "create x.html with an SVG" spawns a worker that writes the file; the session JSONL has zero "The workspace policy does not allow this tool request"; Vibe + `ask` raises one card for `vibe_spawn` and none for `vibe_list`; a write outside the workspace is still denied with the outside-workspace reason; after a Host restart the session keeps its permission mode.
**Base commit:** f68a30f8628fe696ac6c54493a61597e72be890d
**Status:** active

- [x] The worker resolves each tool's declared `approval` tier from the live session registry, including the per-args form, and sends it as `declaredTier` on `policy.request`; an unresolvable tool sends `exec`.
- [x] The Host authorizer drops its read and write name arrays, keeps the argument-aware special cases (`edit` effective mode, `context_notes`, `retain`, `learn`, `bash`, `task`, MCP, `provider.use`, `ast_*`, `generate_image`, `lsp`, `web_search`), and classifies every other tool by `declaredTier`; the final fall-through deny is gone.
- [x] Every remaining denial names the tool and the rule that refused it.
- [x] `interaction.requestNativeGrant` works without an open turn, keyed by `toolCallId`, so bash inside an async vibe worker is not refused after OMP allowed it.
- [x] `permissionAutoAccept` is a `profile` registry key on Host and UI, so the sanitizer keeps it; the drift fixture includes it.
- [x] The coverage test boots a worker and enumerates `getAllToolNames()` in main, plan and vibe modes plus one MCP and one extension tool; no result is a bare deny, and each matches its declared tier. The `BUILTIN_TOOL_NAMES` loop it replaces is deleted.
- [x] `architecture.md`/`contracts.md` describe the tier-based rule and the remaining hard denials.

## Progress

Slices (each a focused commit on top of `f68a30f8`):

| Slice | Commit |
|---|---|
| Settings: `permissionAutoAccept` as a `profile` registry key on Host + UI, drift fixture line | `33254a74` |
| Docs: tier-based authorizer rule and remaining hard denials in `architecture.md`/`contracts.md` | `74e0ba7d` |
| Worker: `resolveDeclaredTier` from the live registry, `declaredTier` on `policy.request`, turn-less `requestNativeGrant` | `c0b9d767` |
| Host: classify every tool by `declaredTier` after the argument-aware cases; name arrays and fall-through deny removed | `8c7765ef` |
| Coverage test: boot a worker, enumerate `getAllToolNames()` in main/plan/vibe with MCP + extension probes; old `BUILTIN_TOOL_NAMES` loop deleted | `b60df2de` |
| Review round 1 fix: a declared write that names no checkable destination requires approval | `a8d93881` |
| Review round 1 fix: coverage test asserts declared-write containment and the outside-workspace hard denial | `7b29ce22` |

**Check before:** The registry coverage test (`packages/agent-service/src/worker/tool-tier-coverage.test.ts`) run against the pre-fix authorizer on `1fc6270437` failed for `vibe_spawn`: `vibe_spawn: The workspace policy does not allow this tool request` — the old authorizer's unnamed fall-through deny.

**Check after:** After merging `ux-feedback-2026-11-15/integration` at `2c00a187` (clean ort merge, no conflicts) and rebuilding `packages/agent-service`:

- `bun test --timeout 15000 src/worker/tool-tier-coverage.test.ts` (agent-service): **7 pass, 0 fail**, 292 assertions (2.9 s) — `vibe_spawn` is an approval card, not the old fall-through deny.
- `VITEST_MAX_WORKERS=2 bun run --cwd packages/web test -- server/lib/host`: **66 files passed, 667 passed | 1 skipped** (45–50 s).
- `bun test --timeout 15000 src/worker src/supervisor src/interaction` (agent-service): **496 pass, 10 skip, 0 fail**, 506 tests across 64 files (269 s).
- `bun run --cwd packages/agent-service type-check`: exit 0.
- `cd packages/ui && bun test src/lib/settings`: **54 pass, 0 fail**, 922 assertions across 4 files.
- `bun run dead-code`: non-zero exit from its pre-existing baseline (43 unused files, long unused-type list, 7 configuration hints). Nothing new from this task: the only entry touching our files was `NativeToolTierSchema`, which is now file-local, so the single remaining hit in our protocol file is `NativeApprovalGrantSchema` — an export that already existed unchanged at the base commit. No new unreferenced file or export was introduced.

The real path in the `Check` ran before the merge and before `a8d93881`/`7b29ce22`; both only add the declared-write-without-destination approval rule and its test, and the merged tree keeps those checks green above.

**Real path** (Web + real provider, isolated data dir and `HOME`, workspace `/tmp/fb15-01-ws`; full evidence in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task01/real-path.md`): all four scenarios pass. (1) Vibe + `auto` → "create x.html with an SVG" spawned a worker that wrote the file (488 bytes, `write` `isError:false`); zero `The workspace policy does not allow this tool request` across all 13 OMP session JSONL files and the data dir. (2) Vibe + `ask` raised exactly one card (`vibe_spawn`) and none for `vibe_list`/`vibe_wait`; a worker-internal `write` inside the workspace ran without a card. (3) an `auto` worker writing outside the workspace was denied by the `write` tool with "The write tool targets a path outside the authorized workspace" and the file was not created. (4) permission mode survived a Host restart for both `auto` and `ask` sessions. The real path ran before `a8d93881`/`7b29ce22`, which only tighten declared-write-without-destination and add its coverage assertion; they do not touch the vibe, read or exec paths the run exercised.

Two observations recorded from the real path, both pre-existing and out of scope:

a. An unanswered approval card aborts the whole turn after 30 s: OMP's extension `tool_call` handler budget (`{"level":"warn","message":"Extension handler timed out","event":"tool_call","timeoutMs":30000}`, then `stopReason: "aborted"`). Layer: OMP extension runner, not this task.
b. Exec-tier `bash`/`eval` commands are not path-checked, so under `auto` a worker can write outside the workspace through `bash` (ADR-05 command-grant design). The `write` tool is still denied; only `bash` has this legacy behavior.

**Review:** independent reviewer worker `tier-reviewer` (wrote no code): round 1 found 2 blocking (declared write with no checkable destination was allowed; coverage test could not see it), both fixed in `a8d93881` and `7b29ce22`; round 2: no blocking findings (tts outside-path hole closed, fileOps rename escape covered, exemptions open nothing new). Non-blocking: a destination-less write approved by the user proceeds to the tool's own path (card shows the input); generate_image is a name-keyed arg-tier exemption.
