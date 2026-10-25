# 02: Compact through a session control

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** The composer's Compact action compacts the session through `session.compact()`, with optional instructions, and the transcript shows the compaction marker. No `/compact` text is sent as a prompt. This also establishes the session control union that tasks 05, 08, 09, 14 and 15 extend.

**Blocked by:** None
**Files:** `packages/agent-contract/src/` (session control request/response schemas next to `RunAbortRequestSchema`), `packages/agent-service/src/protocol.ts` (`WorkerOperationSchema`, 73), `packages/agent-service/src/supervisor/service.ts`, `packages/agent-service/src/sessions/registry.ts`, `packages/agent-service/src/worker/session.ts` (`executeOperation`), `packages/agent-service/src/worker/projection.ts` (`auto_compaction_end` at 416 is the event pattern), `packages/web/server/lib/openchamber-sessions/routes.js` (`control` at 365, route 488), `packages/ui/src/api/canonicalClient.ts` (274), `packages/ui/src/components/chat/ChatInput.tsx` (1849); `.workflow/omp-migration/contracts.md` route matrix and control section.

**Read first:** spec "Session controls" and W9; `contracts.md` "Route matrix" and "Lifecycle and terminal state separation"; OMP `session/agent-session.ts` `compact` (6529).
**Covers:** W9

**Check:** Before: a native worker test that clicks Compact's code path captures a `/compact` user message at the fixture provider. After: `bun run --cwd packages/agent-service test` has a native test where `control { type: 'compact', instructions }` emits `session.compacted` and the fixture provider never receives `/compact`; the same control during an active run returns 409 `RUN_ACTIVE`. `bun run --cwd packages/web test` covers the Host route forwarding `compact` with scope checks.

- [ ] Contract: control body is a discriminated union; `abort` unchanged, `compact` added; `contracts.md` documents it.
- [ ] Worker `compact` operation calls `session.compact(instructions)` and emits `session.compacted` with tokens before.
- [ ] Refused with 409 while a run is active or a branch operation is in progress.
- [ ] ChatInput Compact calls the control, with an optional instructions field; errors show a toast and keep the composer text.
- [ ] Agent Service, web and UI tests and type-checks pass.
