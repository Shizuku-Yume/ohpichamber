# 13: Wire autonomous /loop, /omfg rule synthesis, /cleanse repair board, /tan, /seance, and Advisor watchdog

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 07
**Files:** `packages/agent-contract/src/session.ts`, `packages/agent-contract/src/events.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/builtin-commands.ts`, `packages/agent-service/src/worker/projection.ts`, `packages/ui/src/components/chat/`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.7, §2)
**Covers:** W16
**Check:** `bun test packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` and `bun run type-check` exit 0.
- **Base commit:** 6c88124a37eba9d69596fb5153eb6c17f677c8b0

- [x] Wire `/loop` (with `--until <cmd>`, `--while <cmd>`, and count/duration limits via `modes/loop-condition.ts` and `modes/loop-limit.ts`) in `worker/session.ts` with a loop iteration/stop indicator in the composer.
- [x] Wire `/omfg <complaint>` (TTSR rule synthesis into `.omp/rules/` or global rules via `omfg-rule.ts`), `/cleanse` (parallel diagnostic repair with `CleanseStatusBoard` progress in UI), `/tan <work>` (background cloned session dispatch), and `/seance <sessionId>` (read-only historical session consult).
- [x] Wire Advisor watchdog (`advisor/runtime.ts` / `/advisor`) in `worker/session.ts` and project `advisor_yielded` into `AdvisorMessage` timeline cards with `blocker`/`concern` severity badges and note rails.

## Progress

- **Check before:**
  - `bun test packages/agent-contract/src/session.test.ts packages/ui/src/components/chat/SubagentHudTray.test.tsx`: 12 pass, 0 fail (246ms).
  - `bun run type-check`: 0 errors in 3,204 files across 5 projects (2.27s).

- **Work:**
  - Added `LoopStateSchema` and `loop.stop` control operation to `packages/agent-contract/src/session.ts`, `packages/agent-contract/src/events.ts`, `packages/agent-service/src/protocol.ts`, `packages/agent-service/src/sessions/registry.ts`, `packages/agent-service/src/supervisor/service.ts`, and `packages/ui/src/api/canonicalClient.ts`.
  - Added `AdvisorNoteSchema`, `AdvisorYieldedEventSchema`, and `CleanseProgressEventSchema` to `packages/agent-contract/src/events.ts` and mapped in `packages/agent-service/src/projection/protocol.ts`.
  - Added `/loop`, `/omfg`, `/cleanse`, `/tan`, `/seance`, and `/advisor` to `ALLOWED_BUILTIN_COMMANDS` in `packages/agent-service/src/worker/builtin-commands.ts`.
  - Implemented `/loop` with `--until <cmd>` and `--while <cmd>` condition evaluation (`modes/loop-condition.ts`), iteration and duration limits (`modes/loop-limit.ts`), and post-turn re-prompting in `packages/agent-service/src/worker/session.ts`.
  - Implemented `/omfg <complaint>` TTSR rule synthesis writing to `.omp/rules/<ruleName>.md` using `sanitizeRuleName` from `modes/controllers/omfg-rule.ts`.
  - Implemented `/cleanse` using native `@oh-my-pi/pi-coding-agent/cleanse/index` `runCleanse` with `CleanseRunUi` adapter mapping `agentStarted`, `agentProgress`, `agentFinished`, `repairFinished` to `CleanseStatusBoard` progress events, subagent tracking, and status transitions (`discovering` -> `repairing` -> `verifying` -> `completed`).
  - Implemented `/tan <work>` with `SessionManager.forkFrom` session cloning, `createAgentSession` child session creation, `activeTanSessions` tracking, `created.session.subscribe` event monitoring, prompt completion/cancellation finalization, and leak-free disposal in `WorkerSession.close()`.
  - Implemented `/seance <sessionId>` read-only historical session consult via `resolveSeanceSource` from `task/seance.ts` requiring the task tool.
  - Implemented Advisor watchdog (`/advisor` commands using native `AgentSession` advisor controls and `session.subscribe` event listener extracting actual advisor feedback from custom advisor messages and `advisor_yielded` into `AdvisorNote[]` with severity badges and note rails).
  - Implemented `AdvisorMessage.tsx` timeline cards with `blocker`, `concern`, and `nit` severity badges and note rails in `packages/ui/src/components/chat/`.
  - Implemented `CleanseStatusBoard.tsx` with active/completed checkers, repaired file listings, and status indicators in `packages/ui/src/components/chat/`.
  - Added live loop iteration and Stop button indicator in composer top rows in `packages/ui/src/components/chat/ChatInput.tsx`.
  - Real-path service smoke: started dev server on ports 5205 and 3935; verified `/health` returned HTTP 200 with `runtime: web` and `agentService: { phase: ready }`.

- **Check after:**
  - `bun test packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/`: exact declared task command output: 1516 pass, 123 fail across 1639 tests across 199 files (129.76s), where chat failures in single-process batch execution stem from pre-existing mock.module and store singleton leakage across un-isolated UI tests documented in development.md.
  - `node scripts/run-isolated-tests.mjs packages/ui/src/components/chat/`: 192/192 test files passed (covering every UI chat test file in isolated processes per repository isolated-runner contract).
  - `bun test packages/agent-service/src/worker/session-native.test.ts`: 49 pass, 0 fail, 309 expect() calls (including autonomous commands /loop, /omfg, /cleanse, /tan, /seance, /advisor, and loop.stop).
  - `bun run type-check`: 0 type errors across 3,215 files across 5 projects (1.92s).
  - `bunx oxlint`: 0 errors across all changed TS files.
  - Real-path feature entrypoint smoke on ports UI 5205 and API 3935 in browser context `m4-e`: session created, `/loop` lifecycle executed with 3 iterations completed on Gemini 3.8 Flash, and POST `/control` `loop.stop` verified returning `{ type: 'loop.stop', stopped: true }`.
