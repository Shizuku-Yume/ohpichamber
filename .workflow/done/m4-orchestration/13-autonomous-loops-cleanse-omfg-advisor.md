# 13: Wire autonomous /loop, /omfg rule synthesis, /cleanse repair board, /tan, /seance, and Advisor watchdog

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 07
**Files:** `packages/agent-contract/src/session.ts`, `packages/agent-contract/src/events.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/builtin-commands.ts`, `packages/agent-service/src/worker/projection.ts`, `packages/ui/src/components/chat/`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.7, §2)
**Covers:** W16
**Check:** `bun test packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` and `bun run type-check` exit 0.
**Base commit:** 6c88124a37eba9d69596fb5153eb6c17f677c8b0

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
  - Implemented `/cleanse` parallel diagnostic repair progress events and `/tan <work>` background cloned session dispatch in `worker/session.ts`.
  - Implemented `/seance <sessionId>` read-only historical session consult via `resolveSeanceSource` from `task/seance.ts`.
  - Implemented Advisor watchdog (`/advisor` and `advisor_yielded` event projection with severity and note details) in `worker/session.ts`.
  - Implemented `AdvisorMessage.tsx` timeline cards with `blocker`, `concern`, and `nit` severity badges and note rails in `packages/ui/src/components/chat/`.
  - Implemented `CleanseStatusBoard.tsx` with active/completed checkers, repaired file listings, and status indicators in `packages/ui/src/components/chat/`.
  - Added live loop iteration and Stop button indicator in composer top rows in `packages/ui/src/components/chat/ChatInput.tsx`.
  - Real-path service smoke: started dev server on ports 5205 and 3935; verified `/health` returned HTTP 200 with `runtime: web` and `agentService: { phase: ready }`.

- **Check after:**
  - `bun test packages/ui/src/components/chat/AdvisorMessage.test.tsx packages/ui/src/components/chat/CleanseStatusBoard.test.tsx packages/ui/src/components/chat/SubagentHudTray.test.tsx`: 5 pass, 0 fail, 24 expect() calls.
  - `bun test -t "autonomous commands" packages/agent-service/src/worker/session-native.test.ts`: 1 pass, 0 fail, 13 expect() calls.
  - `bun run type-check`: 0 type errors across 3,208 files across 5 projects (2.88s).
  - `bunx oxlint`: 0 errors across all changed TS files.
