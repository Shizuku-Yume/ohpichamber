# 14: Allowlisted OMP slash commands

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** 5d1a78ee48b54bcb9e89056c60e5cf993a019c61
**Started:** 2026-10-26T01:19:53+08:00
**Status:** active

**Delivers:** The slash palette lists `/compact`, `/shake`, `/todo`, `/jobs`, `/usage`, `/context`, `/tools` and the prompt templates. A builtin runs without starting a run and its output shows as a notice; any other builtin is refused.

**Blocked by:** 02
**Files:** `packages/agent-contract/src/` (`command` control), `packages/agent-service/src/worker/session.ts` (new `command` operation; `runCommands: false` at 380 stays for prompts), `packages/agent-service/src/protocol.ts`, `packages/ui/src/components/chat/CommandAutocomplete.tsx`, `commandAutocompleteItems.ts`, `ChatInput.tsx`.

**Read first:** spec "Slash commands" and W13; `research/ompweb-reference.md` section 2; OMP 18.8.9 `slash-commands/acp-builtins` (`executeAcpBuiltinSlashCommand`) and `slash-commands/types.ts` (`SlashCommandRuntime` 66-118).
**Covers:** W13

**Check:** Before: `/context` from the composer is sent as a prompt. After: `bun run --cwd packages/agent-service test` shows `control { type: 'command', text: '/context' }` returns its text, starts no run, and sends nothing to the fixture provider; `/ssh` returns 400 `INVALID_REQUEST`; `/compact` goes through the same path as task 02. A UI test shows the seven builtins and the templates in the palette, and a template still expands through `commands/expand-text`.

- [x] The allowlist lives in one place in the worker; the palette reads it from the contract, not a second copy.
- [x] `SlashCommandRuntime` output is captured into the control response; `refreshCommands` and `reloadPlugins` are not offered.
- [x] Refused during a run with 409, except read-only builtins (`context`, `usage`, `tools`, `jobs`, `todo`).

## Progress

- Dirty at start: none.
- Task 02's done receipt is present on the integration tip; started from `5d1a78ee48b54bcb9e89056c60e5cf993a019c61`.
- Surfaces: Web, Electron desktop, hosted mobile and Capacitor mobile all use the shared composer and canonical Host control route; no platform-specific transport or native capability is added.
- Risks: cross-workspace contract and external control behavior; worker owns command authorization/output, Host remains authorization/forwarding only, shared UI owns notices. No persisted format changes.
- Check before: root `bun run test` passed (7/7 workspace suites); the task check was not runnable before the feature because command controls did not exist.
- Check after: `bun run --cwd packages/agent-service test` passed (244 pass, 7 skip); Agent Service and UI type-checks passed; contract tests passed (11 tests); UI slash tests passed (34 tests).
- Real path: not run; this task's worker/contract path was exercised by the native fixture and no provider-backed UI run was available in the focused check.
- Review boundary: exact base `5d1a78ee48b54bcb9e89056c60e5cf993a019c61` + contract, Agent Service and shared UI command paths; review agents were unavailable in this harness, so no separate review briefs ran. Security boundary is worker command admission and Host forwarding.
- Decided without maintainer: keep the existing command catalog response and add its worker-owned builtin name list, so palette and execution share one authoritative allowlist without another UI list.

**Finished:** 2026-10-26T02:10:00+08:00
