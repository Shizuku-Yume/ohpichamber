# 10: Expand headless slash commands, magic keywords, turn budgets, URL autocomplete, and composer prediction

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 09
**Files:** `packages/agent-service/src/worker/builtin-commands.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/session-native.test.ts`, `packages/ui/src/components/chat/CommandAutocomplete.tsx`, `packages/ui/src/components/chat/FileMentionAutocomplete.tsx`, `packages/ui/src/components/chat/ChatInput.tsx`, `packages/ui/src/components/chat/composer/`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.7, §2)
**Covers:** W13
**Check:** `bun test packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` and `bun run type-check` exit 0.
- **Base commit:** 6bae5ac7d0131932de77e8e797d52e6eb3d3e4d0

- [x] Expand `ALLOWED_BUILTIN_COMMANDS` in `packages/agent-service/src/worker/builtin-commands.ts` and the UI slash palette to support headless OMP commands (`/handoff`, `/retry`, `/rename`, `/effort`, `/model`, `/switch`, `/fast`, `/slow`, `/prewalk`, `/force`, `/pin`, `/fresh`, `/clear`, `/dirs`, `/session`, `/memory`).
- [x] Detect standalone magic keywords (`ultrathink`, `orchestrate`, `workflowz`, `jevify`) and per-turn token budget tokens (`+<number>[k|m][!]`) in `ChatInput.tsx` and `worker/session.ts`, applying composer gradient shimmer and OMP's built-in magic-keyword notices and turn ceilings.
- [x] Add composer autocomplete for OMP internal URL schemes (`skill://`, `local://`, `proc://`, `agent://`, `history://`) and wire optional post-turn idle ghost-text prompt prediction (`Tab` to accept, controlled by OMP setting).

## Progress

Check before:
- Baseline tests pass for `session-native.test.ts` and chat unit tests.
- `bun run type-check`: 0 errors.

Work:
- Expanded `ALLOWED_BUILTIN_COMMANDS` in `builtin-commands.ts` with all 16 headless commands (`/handoff`, `/retry`, `/rename`, `/effort`, `/model`, `/switch`, `/fast`, `/slow`, `/prewalk`, `/force`, `/pin`, `/fresh`, `/clear`, `/dirs`, `/session`, `/memory`).
- Added descriptions for all built-in commands in `CommandAutocomplete.tsx` and tested palette resolution in `CommandAutocomplete.test.tsx` and `slashCommands.test.ts`.
- Supported `/dirs` as read-only and `/clear` in worker `session.ts` to reset conversation context and turn budgets in place.
- Added `parseTurnBudget` and `containsMagicKeyword` parsing in `worker/session.ts` `prepare()`, injecting OMP hidden notices (`ultrathink-notice`, `orchestrate-notice`, `workflow-notice`, `jevify-notice`), bumping thinking effort to `max` on `ultrathink`, and enforcing turn budget ceilings through `beginTurnBudget(total, hard)`.
- Added standalone magic keyword detection (`ultrathink`, `orchestrate`, `workflowz`, `jevify`) and turn budget token highlighting (`+Nk!`) in `tokenize.ts`, masking code blocks and inline code.
- Added composer autocomplete for OMP internal URL schemes (`skill://`, `local://`, `proc://`, `agent://`, `history://`) in `FileMentionAutocomplete.tsx`.
- Wired ghost-text prompt prediction in `ChatInput.tsx` with `Tab` to accept and `Escape` to dismiss.
- Verified via automated unit tests, type-check, oxlint, and live browser smoke check on port 5202 in isolated context `m4-b`.

Check after:
- `bun test packages/agent-service/src/worker/session-native.test.ts`: pass (48 tests).
- `bun test packages/ui/src/components/chat/composer/language/__tests__/tokenize.test.ts packages/ui/src/components/chat/FileMentionAutocomplete.test.tsx packages/ui/src/components/chat/CommandAutocomplete.test.tsx packages/ui/src/components/chat/composer/submit/__tests__/slashCommands.test.ts`: 59 pass, 0 fail (159 expect calls).
- `bun run type-check`: 0 errors across 3,205 files in 5 projects.
- `bunx oxlint`: 0 errors.
- Live browser smoke on port 5202: all magic keyword shimmers verified, code masking verified, turn budget badge verified.
