# 01: Nest workflow agent sessions under parentSessionId and enforce null root agentId

**Effort:** m4-orchestration
**Task type:** bugfix
**Blocked by:** None
**Files:** `packages/web/server/lib/workflows/agent-session.js`, `packages/web/server/lib/workflows/agent-session.test.js`, `packages/web/server/lib/workflows/runtime.js`, `packages/web/server/lib/workflows/runtime.test.js`, `packages/web/server/lib/workflows/DOCUMENTATION.md`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/decisions.md` (2026-11-05 - Nest workflow agent sessions under parentSessionId and ignore workflow agent personas); `packages/web/server/lib/workflows/DOCUMENTATION.md`
**Covers:** W1
**Check:** `bunx vitest run server/lib/workflows` in `packages/web` and `bunx oxlint packages/web/server/lib/workflows` exit 0.
- **Base commit:** 1e903152221e0efef535f8f45bc29458ede64ccb

- [x] `agent-session.js` passes `...(parentSessionId ? { parentSessionId } : {})` to `sessionService.create(...)` so workflow branch sessions nest under the proposing session.
- [x] `agent-session.js` forces `agentId: null` in `optionsFor` and `start` (ignoring any `agent` field in workflow script options while retaining `model`, `label`, and `schema`), so `assertRootPromptAdmission` never rejects a workflow branch send with HTTP 400 `INVALID_REQUEST`.
- [x] `agent-session.test.js` and `runtime.test.js` verify `parentSessionId` linkage and verify that a workflow branch passing `{ agent: 'reviewer' }` sends `agentId: null` and passes `assertRootPromptAdmission`.
- [x] `packages/web/server/lib/workflows/DOCUMENTATION.md` reflects `parentSessionId` linkage and `agentId: null` enforcement.

## Progress

- **Check before:**
  - Baseline vitest `bunx vitest run server/lib/workflows` in `packages/web`: 5 test files passed, 63 tests passed.
  - Baseline defects reproduced:
    - In `agent-session.js`, `sessionService.create` omitted `parentSessionId`, leaving workflow child branch sessions unlinked from their proposing sessions.
    - In `agent-session.js`, `options.agentId` was set to `agent || null`, passing non-null agent personas (such as `{ agent: 'reviewer' }`) to `sessionService.send`, violating Host root prompt admission (`assertRootPromptAdmission` in `packages/web/server/lib/message-queue/prompt-admission.js`) and causing HTTP 400 `INVALID_REQUEST` failures.
    - In `agent-session.js`, `title` was passed as `metadata: { title }` instead of top-level `title`, failing strict `SessionCreateRequestSchema` validation during live service invocation.
- **Work:**
  - `packages/web/server/lib/workflows/agent-session.js`:
    - Updated `optionsFor` to strictly enforce `agentId: null` regardless of arguments.
    - Updated `start` to pass `...(parentSessionId ? { parentSessionId } : {})` and top-level `...(title ? { title } : {})` to `sessionService.create`, while forcing `agentId: null`.
    - Updated `createSession` to pass top-level `...(title ? { title } : {})`.
  - `packages/web/server/lib/workflows/agent-session.test.js`:
    - Integrated `SessionCreateRequestSchema.parse(payload)` in `fakeSessionService.create` to ensure contract validation.
    - Integrated `assertRootPromptAdmission(payload)` in `fakeSessionService.send` to enforce Host prompt admission.
    - Added focused behavior test verifying `parentSessionId` linkage, `title`, and null `agentId` admission with `{ agent: 'reviewer' }`.
  - `packages/web/server/lib/workflows/runtime.test.js`:
    - Added comprehensive integration behavior test connecting `createWorkflowRuntime` to `createWorkflowAgentSessions` verifying:
      - Workflow run with branch specifying `{ agent: 'reviewer', label: 'review', schema: ... }`.
      - Child session created with `parentSessionId` set to proposing session.
      - Prompt dispatched with `agentId: null` passing `assertRootPromptAdmission`.
      - Schema answer validated and accepted.
      - Report delivered to proposing session waking it.
  - `packages/web/server/lib/workflows/DOCUMENTATION.md`:
    - Updated ownership description and OMP fork architecture notes to document `parentSessionId` linkage and `agentId: null` enforcement.
- **Check after:**
  - `bunx vitest run server/lib/workflows` in `packages/web`: 5 test files passed, 65 tests passed (100% pass, 0 failures).
  - `bunx oxlint packages/web/server/lib/workflows`: 0 errors, 0 warnings.
  - `bun run type-check:web` & `bun run type-check`: 0 type errors across 3,197 files.
  - `bun run dead-code`: 0 new dead-code findings introduced in changed files.
- **Real-Path Smoke Verification:**
  - Dev server executed on assigned isolated ports `OPENCHAMBER_HMR_UI_PORT=5201`, `OPENCHAMBER_HMR_API_PORT=3931`, `OPENCHAMBER_PORT=3931`, `OPENCHAMBER_DATA_DIR=/home/shizuku/Project/ohpichamber-omp-artifacts/m4-a-2026-11-05/data`, `OPENCHAMBER_WORKFLOWS_ENABLE=1`.
  - Real-provider credentials loaded via `~/.config/ohpichamber/omp-m0-provider.env` (`CLIProxyAPI/gemini-3.5-flash-lite`, openai-completions); zero secrets printed or logged.
  - Native agent config protection verified: `~/.omp/agent/config.yml` SHA256 `bffd05544a3ae0ab1fd14af23c4a151a09a7ff0bad86e07ebab882bdf240766a` unchanged before and after (0 writes).
  - Headless Chrome DevTools isolated browser session (`isolatedContext=m4-a`, `pageId=2`):
    - Created proposing session: `2b4c58f2-a807-423a-a26e-f3dfa33676e9`.
    - Executed workflow `w1-reviewer-flow` (`wf_rkVgFr5Y1CuiTLMZ`) with branch specifying `agent: 'reviewer'`, `label: 'reviewer-code-check'`, and JSON schema.
    - Observed child session created: `sessionId: "736d815e-a78b-44ff-ad36-28909f45a6b2"` with `parentSessionId: "2b4c58f2-a807-423a-a26e-f3dfa33676e9"` and `rootSessionId: "736d815e-a78b-44ff-ad36-28909f45a6b2"`.
    - Dispatched child turn with `agentId: null`, successfully passing Host prompt admission (`assertRootPromptAdmission`).
    - Real provider completed turn and schema answer was validated: `{"passed": true, "verdict": "verified"}`.
    - Workflow report delivered into proposing session `2b4c58f2-a807-423a-a26e-f3dfa33676e9` waking it.
    - Evidence files recorded:
      - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-a-2026-11-05/real-provider-workflow-run.json`
      - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-a-2026-11-05/ui-initial.png`
      - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-a-2026-11-05/ui-final.png`
      - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-a-2026-11-05/ui-snapshot-initial.txt`
- Independent review: Approved by director.
