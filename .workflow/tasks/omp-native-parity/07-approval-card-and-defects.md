# 07: Named approval cards and chat-directory defects

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** Approval cards name the tool and summarize its input; "Always allow" names what it allows with OMP's scope. Non-repository chat directories make no 422 `GET /api/source-control/binding`.

**Blocked by:** None
**Files:** Agent Service approval projection (search `requires approval` and `native-input` in `packages/agent-service/src/worker/`), approval contract in `packages/agent-contract`, UI permission/approval card in `packages/ui/src/components/chat/`, source-control binding route in `packages/web/server/lib/` and its UI caller.

**Read first:** spec "Approvals and small defects"; skills `locale-ui-patterns`, `ui-api-decoupling`; OMP approval handling (`tools.approvalMode`, `tools.approval`) in the pinned package.
**Covers:** W9, W10

**Check:** Before: a fixture test with `tools.approvalMode: always-ask` shows the card text "native tool operation requires approval" and "Always allow native-input"; opening a chat in a non-repo directory logs 422 for the binding request. After: the card shows `bash` and the command, "Always allow" names `bash` and maps to OMP's choice; no binding request (or a 200 empty binding) for non-repo directories.

- [ ] Projection carries tool name and input summary; no secrets in summaries.
- [ ] Always-allow wording and scope match OMP.
- [ ] Binding request skipped or answered empty for non-repo dirs.
