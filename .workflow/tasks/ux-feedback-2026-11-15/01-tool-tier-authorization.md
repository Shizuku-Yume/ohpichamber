# 01: Authorize OMP tools by their declared tier so Vibe mode runs

**Effort:** ux-feedback-2026-11-15
**Task type:** bugfix
**Blocked by:** None
**Covers:** W1
**Files:** `packages/agent-service/src/{native-policy-protocol.ts,protocol.ts}`, `packages/agent-service/src/worker/{session.ts,interaction.ts}`, `packages/web/server/lib/host/{worker-operation-authorizer.js,worker-operation-authorizer.test.js,settings-registry.json,settings-helpers.js}`, `packages/ui/src/lib/settings/registry.ts`, `.workflow/omp-migration/{architecture.md,contracts.md}` (authorizer rule text)
**Read first:** spec "How it is built → Tool tiers"; `research/feedback-2026-11-15/VibeDenials.md` (F2–F6, §2); `decisions.md` 2026-11-15 "The Host classifies OMP tools by the tier each tool declares" and 2026-11-13 "Host authorizes OMP tools by tier"; ADR-05 in `architecture.md`
**Check:** the new registry coverage test fails on `1fc6270437` for `vibe_spawn` and passes after; `bun run --cwd packages/web test -- server/lib/host` and `bun test --timeout 15000 src/worker src/supervisor src/interaction` in `packages/agent-service` exit 0. Real path (Web, isolated data dir, real provider): Vibe + `auto` → "create x.html with an SVG" spawns a worker that writes the file; the session JSONL has zero "The workspace policy does not allow this tool request"; Vibe + `ask` raises one card for `vibe_spawn` and none for `vibe_list`; a write outside the workspace is still denied with the outside-workspace reason; after a Host restart the session keeps its permission mode.

- [ ] The worker resolves each tool's declared `approval` tier from the live session registry, including the per-args form, and sends it as `declaredTier` on `policy.request`; an unresolvable tool sends `exec`.
- [ ] The Host authorizer drops its read and write name arrays, keeps the argument-aware special cases (`edit` effective mode, `context_notes`, `retain`, `learn`, `bash`, `task`, MCP, `provider.use`, `ast_*`, `generate_image`, `lsp`, `web_search`), and classifies every other tool by `declaredTier`; the final fall-through deny is gone.
- [ ] Every remaining denial names the tool and the rule that refused it.
- [ ] `interaction.requestNativeGrant` works without an open turn, keyed by `toolCallId`, so bash inside an async vibe worker is not refused after OMP allowed it.
- [ ] `permissionAutoAccept` is a `profile` registry key on Host and UI, so the sanitizer keeps it; the drift fixture includes it.
- [ ] The coverage test boots a worker and enumerates `getAllToolNames()` in main, plan and vibe modes plus one MCP and one extension tool; no result is a bare deny, and each matches its declared tier. The `BUILTIN_TOOL_NAMES` loop it replaces is deleted.
- [ ] `architecture.md`/`contracts.md` describe the tier-based rule and the remaining hard denials.
