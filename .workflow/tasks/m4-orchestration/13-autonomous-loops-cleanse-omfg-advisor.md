# 13: Wire autonomous /loop, /omfg rule synthesis, /cleanse repair board, /tan, /seance, and Advisor watchdog

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 07, 10
**Files:** `packages/agent-contract/src/session.ts`, `packages/agent-contract/src/events.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/builtin-commands.ts`, `packages/agent-service/src/worker/projection.ts`, `packages/ui/src/components/chat/`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.7, §2)
**Covers:** W16
**Check:** `bun test packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` and `bun run type-check` exit 0.

- [ ] Wire `/loop` (with `--until <cmd>`, `--while <cmd>`, and count/duration limits via `modes/loop-condition.ts` and `modes/loop-limit.ts`) in `worker/session.ts` with a loop iteration/stop indicator in the composer.
- [ ] Wire `/omfg <complaint>` (TTSR rule synthesis into `.omp/rules/` or global rules via `omfg-rule.ts`), `/cleanse` (parallel diagnostic repair with `CleanseStatusBoard` progress in UI), `/tan <work>` (background cloned session dispatch), and `/seance <sessionId>` (read-only historical session consult).
- [ ] Wire Advisor watchdog (`advisor/runtime.ts` / `/advisor`) in `worker/session.ts` and project `advisor_yielded` into `AdvisorMessage` timeline cards with `blocker`/`concern` severity badges and note rails.
