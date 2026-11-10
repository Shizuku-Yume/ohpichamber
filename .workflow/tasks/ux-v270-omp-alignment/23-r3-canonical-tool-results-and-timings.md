# 23: Canonical tool results, partial output, step timings and render tool (R3, service side)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 19
**Covers:** W4, W6
**Files:** `packages/agent-contract/src/{messages,events}.ts`; `packages/agent-service/src/worker/{projection,host-tool}.ts`; `packages/agent-service/src/native-policy-protocol.ts`; `packages/web/server/lib/openchamber-control/`; `packages/ui/src/sync/event-reducer.ts` (tool events only); `packages/ui/src/components/chat/lib/messageDisplayNormalization.ts`; `packages/ui/src/components/chat/{MessageList,ChatMessage}.tsx` (system-row handling only); `packages/ui/src/components/chat/lib/turns/streamingTailEntry.ts`
**Read first:** `research/ux-v270-systemic-review.md` R3; `.workflow/omp-migration/contracts.md`; OMP `pi-agent-core` event types (`tool_execution_update`); skills `sync-state-invariants`, `relay-transport`, `ui-api-decoupling`
**Check:** `bun --cwd packages/agent-contract test && bun --cwd packages/agent-service test && VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/sync packages/ui/src/components/chat/lib` → exit 0, with projection tests showing no `system` role for tool results, no synthetic empty user messages, partial tool output events and per-step timings; real path: a long `bash` call shows output while running, and an `openchamber_render` call renders inline

- [ ] Change the contract so a tool result belongs to the message that owns its tool call (or a canonical tool role), and stop authoring empty user messages for non-user turns.
- [ ] Subscribe the projection to OMP partial tool results and emit them as live updates.
- [ ] Record `startedAt`, first-token time and `completedAt` per step, plus OMP's structured tool error (kind and detail) instead of `"Tool execution failed"`.
- [ ] Register `openchamber_render` in the native host-tool protocol and worker host tools, served by the Host `openchamber-control` owner, so the merged upstream render cards receive it.
- [ ] Update the reducer and live-tail paths to the new placement; tool-result live parts are requested with their turn.
- [ ] Deletes: `role: 'system'` for tool results, client-side re-pairing in `messageDisplayNormalization`, the empty-user hiding heuristic.
