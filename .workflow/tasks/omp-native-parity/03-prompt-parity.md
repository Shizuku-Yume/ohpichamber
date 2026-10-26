# 03: Send the model what plain OMP sends

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** No injected guidance in chat context; Host tools are ordinary callable tools instead of refused `xd://` devices; OMP internal URLs (`agent://`, `history://`, `proc://`, `local://`, `artifact://`, `skill://`, `xd://`, `mcp://`, `omp://`, `issue://`, `pr://`) work in app chats as in the TUI.

**Blocked by:** None
**Files:** `packages/web/server/lib/session-knowledge/runtime.js` (52-58, 74-76, 83-102), `packages/agent-service/src/worker/session.ts` (~341-345 `ohpichamber.context`), `packages/agent-service/src/worker/host-tool.ts` (13-39), `packages/agent-service/src/worker/native-policy-descriptor.ts` (~16), their tests.

**Read first:** spec "The model sees what OMP builds"; skill `enterprise-boundary` (policy changes); `.workflow/omp-migration/architecture.md` Host policy sections.
**Covers:** W4, W5

**Check:** Before: a fixture-backed worker test records an `ohpichamber.context` developer message and `xd://openchamber` devices; a `read agent://x` tool call returns "Host policy refused". After: the recorded request's system/developer messages equal those of a plain OMP `AgentSession` with the same settings (apart from pins/attachments); Host tools are in the tool list; internal URL reads reach OMP; a `file://` read is still refused.

- [ ] Guidance injection removed; pins and attachments still delivered.
- [ ] Host tools registered as essential tools with only their own descriptions.
- [ ] Policy passes OMP internal schemes; others refused as before.
- [ ] Decision recorded in `decisions.md` for the Host tool shape.
