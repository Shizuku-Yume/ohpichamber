# 10: Expand headless slash commands, magic keywords, turn budgets, URL autocomplete, and composer prediction

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 09
**Files:** `packages/agent-service/src/worker/builtin-commands.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/session-native.test.ts`, `packages/ui/src/components/chat/CommandAutocomplete.tsx`, `packages/ui/src/components/chat/FileMentionAutocomplete.tsx`, `packages/ui/src/components/chat/ChatInput.tsx`, `packages/ui/src/components/chat/composer/`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.7, §2)
**Covers:** W13
**Check:** `bun test packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` and `bun run type-check` exit 0.

- [ ] Expand `ALLOWED_BUILTIN_COMMANDS` in `packages/agent-service/src/worker/builtin-commands.ts` and the UI slash palette to support headless OMP commands (`/handoff`, `/retry`, `/rename`, `/effort`, `/model`, `/switch`, `/fast`, `/slow`, `/prewalk`, `/force`, `/pin`, `/fresh`, `/clear`, `/dirs`, `/session`, `/memory`).
- [ ] Detect standalone magic keywords (`ultrathink`, `orchestrate`, `workflowz`, `jevify`) and per-turn token budget tokens (`+<number>[k|m][!]`) in `ChatInput.tsx` and `worker/session.ts`, applying composer gradient shimmer and OMP's built-in magic-keyword notices and turn ceilings.
- [ ] Add composer autocomplete for OMP internal URL schemes (`skill://`, `local://`, `proc://`, `agent://`, `history://`) and wire optional post-turn idle ghost-text prompt prediction (`Tab` to accept, controlled by OMP setting).
