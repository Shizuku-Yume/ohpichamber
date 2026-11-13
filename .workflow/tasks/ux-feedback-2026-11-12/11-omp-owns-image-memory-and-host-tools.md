# 11: OMP owns image and memory; host tools exist only when enabled

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 04
**Covers:** W7
**Files:** `packages/agent-service/src/worker/{host-tool,session}.ts`; `packages/agent-contract/src/native-policy-protocol.ts`; `packages/web/server/lib/host/{service.js,generate-image.js}` and the host tool dispatch; `packages/web/server/lib/agent-memory/` (delete); `packages/web/server/lib/session-assist/` recap path; `packages/ui/src/components/sections/openchamber/OpenChamberPage.tsx` tools section; chat tool cards for `generate_image` and OMP memory tools in `packages/ui/src/lib/toolPresentation/`
**Read first:** `research/feedback-2026-11-12/12-omp-settings-and-shells.md` (b), (c); `12-tui-vs-sdk.md` (recap, memory rows); `decisions.md` 2026-11-13 "OMP owns image generation and agent memory"; skills `openchamber-change-discipline`, `ui-api-decoupling`
**Check:** worker tests assert a disabled host tool is absent from the session's active tool list and that `workflow.run` parses in the host action schema; `bun test --timeout 15000 src/worker` in `packages/agent-service`, `bun run --cwd packages/web test -- server/lib/host` and the tool presentation coverage test exit 0. Real path (Web, real provider): asking for an image runs OMP `generate_image` with the `image` role and renders the result card; the agent saves and recalls a memory through `memory.backend = local`; with the notify tool disabled, the model's tool list lacks it; the agent starts a workflow; turning off Chat → Session recap stops OMP idle recaps.

- [ ] Register host tools per worker session only when enabled, and re-register on toggle.
- [ ] Delete `openchamber_image`, its image-model setting and picker; `generate_image` and the `image` role become the image path, with a chat card.
- [ ] Delete the `memory` host tool, its store and settings; OMP memory tools render with cards.
- [ ] Add `workflow.*` actions to the host-tool protocol and register `openchamber_workflow` gated by its own toggle.
- [ ] Chat → Session recap writes OMP `recap.enabled` and exposes `recap.idleSeconds`.
- [ ] Deletes: the two duplicate tools and stores, the call-time-only enablement checks they relied on.
