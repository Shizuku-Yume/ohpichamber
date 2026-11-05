# 01: Nest workflow agent sessions under parentSessionId and enforce null root agentId

**Effort:** m4-orchestration
**Task type:** bugfix
**Blocked by:** None
**Files:** `packages/web/server/lib/workflows/agent-session.js`, `packages/web/server/lib/workflows/agent-session.test.js`, `packages/web/server/lib/workflows/runtime.js`, `packages/web/server/lib/workflows/runtime.test.js`, `packages/web/server/lib/workflows/DOCUMENTATION.md`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/decisions.md` (2026-11-05 - Nest workflow agent sessions under parentSessionId and ignore workflow agent personas); `packages/web/server/lib/workflows/DOCUMENTATION.md`
**Covers:** W1
**Check:** `bunx vitest run server/lib/workflows` in `packages/web` and `bunx oxlint packages/web/server/lib/workflows` exit 0.

- [ ] `agent-session.js` passes `...(parentSessionId ? { parentSessionId } : {})` to `sessionService.create(...)` so workflow branch sessions nest under the proposing session.
- [ ] `agent-session.js` forces `agentId: null` in `optionsFor` and `start` (ignoring any `agent` field in workflow script options while retaining `model`, `label`, and `schema`), so `assertRootPromptAdmission` never rejects a workflow branch send with HTTP 400 `INVALID_REQUEST`.
- [ ] `agent-session.test.js` and `runtime.test.js` verify `parentSessionId` linkage and verify that a workflow branch passing `{ agent: 'reviewer' }` sends `agentId: null` and passes `assertRootPromptAdmission`.
- [ ] `packages/web/server/lib/workflows/DOCUMENTATION.md` reflects `parentSessionId` linkage and `agentId: null` enforcement.
