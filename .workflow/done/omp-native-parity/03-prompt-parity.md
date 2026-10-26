# 03: Send the model what plain OMP sends

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** cbe1f912b3eda59858061e1dccdffa4c496cb4b9
**Started:** 2026-10-26T23:48:52+08:00
**Finished:** 2026-10-27T00:37:26+08:00

**Delivers:** No injected guidance in chat context; Host tools are ordinary callable tools instead of refused `xd://` devices; OMP internal URLs (`agent://`, `history://`, `proc://`, `local://`, `artifact://`, `skill://`, `xd://`, `mcp://`, `omp://`, `issue://`, `pr://`) work in app chats as in the TUI.

**Blocked by:** None
**Files:** `packages/web/server/lib/session-knowledge/runtime.js` (52-58, 74-76, 83-102), `packages/agent-service/src/worker/session.ts` (~341-345 `ohpichamber.context`), `packages/agent-service/src/worker/host-tool.ts` (13-39), `packages/agent-service/src/worker/native-policy-descriptor.ts` (~16), their tests.

**Read first:** spec "The model sees what OMP builds"; skill `enterprise-boundary` (policy changes); `.workflow/omp-migration/architecture.md` Host policy sections.
**Covers:** W4, W5

**Check:** Before: a fixture-backed worker test records an `ohpichamber.context` developer message and `xd://openchamber` devices; a `read agent://x` tool call returns "Host policy refused". After: the recorded request's system/developer messages equal those of a plain OMP `AgentSession` with the same settings (apart from pins/attachments); Host tools are in the tool list; internal URL reads reach OMP; a `file://` read is still refused.

- [x] Guidance injection removed; pins and attachments still delivered.
- [x] Host tools registered as essential tools with only their own descriptions.
- [x] Policy passes OMP internal schemes; others refused as before.
- [x] Decision recorded in `decisions.md` for the Host tool shape.

## Progress

- **Dirty at start:** none
- **Check before:** the new parity test was run against the base worker sources (`session.ts`, `host-tool.ts`, `native-bash-policy.ts` from `cbe1f912b3`) and failed: the base request still listed `xd://openchamber`, `xd://web`, `xd://memory` and `xd://notify`, and its `Bash` inventory label was lowercase. Log `evidence/task03-worker-before.log` (`probe_exit:1`). The base worker source also emitted `ohpichamber.context`; the new test's developer-message assertion is the regression for that path. The baseline plan-proposal `approve-compact` test times out with the base `session.ts` too (recorded below).

### Changes

- `session-knowledge/runtime.js` now assembles only pinned notes and pinned plan bodies. `buildKnowledgeSignature` covers pins only, so enabled memory or session linking can no longer create an empty delivery; memory remains in `collectSummary` for the panel. `session-knowledge/routes.js` keeps only summary and pin routes.
- `worker/session.ts` no longer emits `ohpichamber.context` custom messages or the captured `context.instructions` developer message. `kind: 'instruction'` (user-requested skill expansion) still becomes a developer message; captured context and pins become hidden user text. Attachments still use `fileMention`.
- UI `session-ui-store`, `reviewFlow` and `useMultiRunStore` no longer fetch, attach or report prompt knowledge; `sessionKnowledgeApi` keeps summary and pin CRUD only.
- `worker/host-tool.ts` registers `openchamber`, `web`, `memory` and `notify` with `loadMode: 'essential'`, so they are ordinary callable tools. `worker/native-bash-policy.ts` keeps the native `Bash` label so the tool inventory matches plain OMP.
- `native-policy-protocol.ts` adds the exact OMP scheme allowlist and `internalReadUrls` on the native descriptor. `native-policy-descriptor.ts` uses OMP's `InternalUrlRouter.normalize`/`canHandle` for reads, keeps selectors and aliases, checks every local target in a mixed list, rejects NUL, and leaves write/edit/grep/glob filesystem-only. `worker-operation-authorizer.js` admits internal read URLs only for `read` and admits native `wait`.
- Decisions: `decisions.md` entries `2026-10-27 - Host tools are essential callable tools, not xd:// devices` and `2026-10-27 - Host policy passes only allowlisted OMP internal URL reads`.
- Docs: `session-knowledge/DOCUMENTATION.md`, `agent-service/DOCUMENTATION.md`, `components/session/project-context/DOCUMENTATION.md`, `server/lib/agent-tool/DOCUMENTATION.md`.

### Verification

- `bun test packages/web/server/lib/session-knowledge/runtime.test.js` — 22 pass.
- `bun test src/worker/native-policy-descriptor.test.ts` — 14 pass.
- `bunx vitest run server/lib/host/worker-operation-authorizer.test.js` — 23 pass.
- `bun test src/worker/session-native.test.ts -t 'plain OMP system|steer/follow-up|Host tool executes'` — 3 pass, including the fixture-recorded system/developer comparison with a plain OMP `AgentSession` and callable Host tools.
- `bunx oxlint` on authored files: clean for new code; remaining findings are pre-existing `typeof` checks in `session-knowledge/runtime.js`, `worker-operation-authorizer.js` and the UI store, and pre-existing test assertions.
- Merge sync: integration tip `9116c83429` was merged into this branch as `47a255852`; `agent-contract` and `agent-service` were rebuilt, and the four focused suites were rerun (14 + 22 + 23 + 3 pass). `packages/agent-service` type-check exits 0 at the merged tip. UI/web still report the inherited i18n `chat.btw.titleFallback` errors in pt-BR/uk/zh-CN/zh-TW; no changed line is implicated.
- Type-check: `packages/agent-service` passes at the merged tip. UI/web report the inherited i18n errors above; no error points at a changed line.
- Pre-existing red: `native plan proposal supports approve-compact through canonical questions` times out with our `session.ts` and with the base `session.ts` restored; not caused by this task. `session-ui-store` slash-expansion/review-flow agentId expectations also fail at base-independent code paths (the route never applied `expanded.agentId`); not touched here.
- Real path: UI 5192, API 3922, project `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-b-2026-10-26/workspace`, model Gemini 3.8 Flash at High. A safer prompt was sent after Gemini refused the `/etc/passwd` wording: `read agent://` then `read file:///home/shizuku/.../workspace/README.txt`. Bare `agent://` is OMP's own grammar error (`agent:// URL requires an output ID`), so this live run proves policy pass-through and the `file://` refusal, not a successful agent resource read. The second (file) read returned `Host policy refused the tool operation`; assistant line in `evidence/snapshot-tool-results.txt`. Valid internal-resource proof: a `local://task03-proof.txt` artifact was preseeded in the real OMP session artifact root (no write tool), then the live app read it (`LOCAL_INTERNAL_OK` with resolved artifact path) and called `wait` (OMP's own `Nothing to wait for...`), with no Host refusal. Evidence: `evidence/snapshot-local-proof.txt`.

**Check after:** focused suites above pass (22 + 14 + 23 + 3). The fixture parity test compares the worker request with a plain OMP `AgentSession`; the only removed system-prompt lines are the four Host tools' own inventory entries, asserted before removal to be exactly `- <tool>: \`<tool>\``, and the pin is present only as hidden user text. Live: `read agent://` reached OMP's grammar (`agent:// URL requires an output ID`), `file://` returned Host policy refused, a preseeded real `local://` artifact read returned `LOCAL_INTERNAL_OK`, and `wait` reached OMP's `Nothing to wait for` without Host refusal. The one pre-existing red test, the inherited type-check error and the pre-existing UI test failures remain recorded above. Independent fast security/quality closure review passed with 0 blocking / 0 nonblocking. Official A (after doc fixes) and B reviews pass with 0 findings.

**Review boundary:** cbe1f912b3eda59858061e1dccdffa4c496cb4b9 + working-tree changes; round: 1; briefs: A,B,sec; boundaries: UI→Host prompt delivery, session-knowledge, Host tool registration, native read authorization, Host↔supervisor↔worker↔SDK, filesystem vs OMP URLs; findings: 1 blocking / 0 nonblocking (stale project-context/agent-tool docs, fixed and rechecked).
