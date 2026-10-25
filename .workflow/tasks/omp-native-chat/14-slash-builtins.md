# 14: Allowlisted OMP slash commands

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The slash palette lists `/compact`, `/shake`, `/todo`, `/jobs`, `/usage`, `/context`, `/tools` and the prompt templates. A builtin runs without starting a run and its output shows as a notice; any other builtin is refused.

**Blocked by:** 02
**Files:** `packages/agent-contract/src/` (`command` control), `packages/agent-service/src/worker/session.ts` (new `command` operation; `runCommands: false` at 380 stays for prompts), `packages/agent-service/src/protocol.ts`, `packages/ui/src/components/chat/CommandAutocomplete.tsx`, `commandAutocompleteItems.ts`, `ChatInput.tsx`.

**Read first:** spec "Slash commands" and W13; `research/ompweb-reference.md` section 2; OMP 18.8.9 `slash-commands/acp-builtins` (`executeAcpBuiltinSlashCommand`) and `slash-commands/types.ts` (`SlashCommandRuntime` 66-118).
**Covers:** W13

**Check:** Before: `/context` from the composer is sent as a prompt. After: `bun run --cwd packages/agent-service test` shows `control { type: 'command', text: '/context' }` returns its text, starts no run, and sends nothing to the fixture provider; `/ssh` returns 400 `INVALID_REQUEST`; `/compact` goes through the same path as task 02. A UI test shows the seven builtins and the templates in the palette, and a template still expands through `commands/expand-text`.

- [ ] The allowlist lives in one place in the worker; the palette reads it from the contract, not a second copy.
- [ ] `SlashCommandRuntime` output is captured into the control response; `refreshCommands` and `reloadPlugins` are not offered.
- [ ] Refused during a run with 409, except read-only builtins (`context`, `usage`, `tools`, `jobs`, `todo`).
