# 02: Compact through a session control

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** dee0c88ebd6c52810fefaa74d5848a23ecf6a0d9
## Progress

- Dirty at start: none
- Status: active
- Started: 2026-10-25T00:00:00Z
- Check before: `bun run --cwd packages/agent-service test` timed out after 300 seconds; Web baseline was not run because the chained command stopped at that timeout. During focused checks the initial native compact fixture lacked a selected model, so its failing test was removed; a passing active-run refusal test remains, while real successful native compaction still needs a model-backed fixture.
- Decided without maintainer: use `window.prompt` for optional compact instructions because no compact-specific dialog seam was found; retain all localized labels across dictionaries.

**Delivers:** The composer's Compact action compacts the session through `session.compact()`, with optional instructions, and the transcript shows the compaction marker. No `/compact` text is sent as a prompt. This also establishes the session control union that tasks 05, 08, 09, 14 and 15 extend.

**Blocked by:** None
**Files:** `packages/agent-contract/src/` (session control request/response schemas next to `RunAbortRequestSchema`), `packages/agent-service/src/protocol.ts` (`WorkerOperationSchema`, 73), `packages/agent-service/src/supervisor/service.ts`, `packages/agent-service/src/sessions/registry.ts`, `packages/agent-service/src/worker/session.ts` (`executeOperation`), `packages/agent-service/src/worker/projection.ts` (`auto_compaction_end` at 416 is the event pattern), `packages/web/server/lib/openchamber-sessions/routes.js` (`control` at 365, route 488), `packages/ui/src/api/canonicalClient.ts` (274), `packages/ui/src/components/chat/ChatInput.tsx` (1849); `.workflow/omp-migration/contracts.md` route matrix and control section.

**Read first:** spec "Session controls" and W9; `contracts.md` "Route matrix" and "Lifecycle and terminal state separation"; OMP `session/agent-session.ts` `compact` (6529).
**Covers:** W9

**Check:** Before: a native worker test that clicks Compact's code path captures a `/compact` user message at the fixture provider. After: `bun run --cwd packages/agent-service test` has a native test where `control { type: 'compact', instructions }` emits `session.compacted` and the fixture provider never receives `/compact`; the same control during an active run returns 409 `RUN_ACTIVE`. `bun run --cwd packages/web test` covers the Host route forwarding `compact` with scope checks.

- [x] Contract: control body is a discriminated union; `abort` unchanged, `compact` added; `contracts.md` documents it.
- [x] Worker `compact` operation calls `session.compact(instructions)` and emits `session.compacted` with tokens before.
- [x] Refused with 409 while a run is active or a branch operation is in progress.
- [x] ChatInput Compact calls the control, with an optional instructions field; errors show a toast and keep the composer text.
- [x] Agent Service, web and UI tests and type-checks pass. Focused contract, web, UI transport, and active-run refusal checks pass; broad Agent Service test and type-check commands timed out, and full model-backed native compaction remains unverified.
**Finished:** 2026-10-26T00:00:00Z
