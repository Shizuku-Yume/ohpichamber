# 04: Take model and thinking defaults from OMP

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** cbe1f912b3
**Started:** 2026-10-27T00:25:10+08:00 (earliest recorded check; the working session began before it)
**Finished:** 2026-10-27T00:42:37+08:00

**Delivers:** New chats use OMP's `modelRoles.default` and `defaultThinkingLevel`; the effort the composer shows is the effort sent and survives reload; efforts are never sent as `variant`; app-level default model/effort settings are retired.

**Blocked by:** None
**Files:** `packages/agent-service/src/worker/catalog-models.ts`, `packages/agent-contract`, `packages/ui/src/components/chat/ModelControls.tsx`, `ChatInput.tsx`, `packages/ui/src/stores/useConfigStore.ts`, `DefaultsSettings` and desktop default settings, draft/session effort persistence.

**Read first:** spec "Defaults come from OMP"; `.workflow/done/omp-native-chat/10-effort-picker.md`; skill `ui-api-decoupling`; OMP `session/settings.ts` (`cfgDefaultThinkingLevel`) and `settings.getModelRole` in the pinned package.
**Covers:** W6

**Check:** Before: a fixture test with `defaultThinkingLevel: high` and no client effort records thinking off; a UI test shows High while the send captures `reasoningEffort: null`. After: worker runs at `high`; the catalog carries OMP defaults; the draft shows them; a reload shows the stored level; Off sends `off`; no effort reaches `variant`.

- [x] Worker defers to OMP resolution when the client gives no choice.
- [x] Catalog exposes OMP default model and thinking level.
- [x] UI draft, send and reload agree on one effort value.
- [x] App-level defaults removed.

## Progress

- Dirty at start: none (clean worktree on `omp-native-parity/04-omp-defaults` at `cbe1f912b3`). Started timestamp is the earliest recoverable evidence mtime; the session's first tool activity was not timestamped.
- Surfaces: shared web/Electron desktop composer and hosted/Capacitor mobile composer read the same catalog default and send `reasoningEffort`; pinned side-panel composer reads its saved session effort under the same root key. No new runtime or transport surface.
- Check before (actual, not assumed): the new native fixture (`session-native.test.ts`, reasoning-capable model, OMP default `high`, all-null captured options) already recorded `reasoning_effort: 'high'` on the base tree. The spec's "worker forces off when the client sends none" did not reproduce: the guard at `session.ts:323` is false for `null` controls, and the strict contract forbids `undefined` there. No production guard change was kept (reverted as unreproduced); the missing/undefined distinction is still covered by the fixture tests. The real defects were the UI showing Off/sending null and the catalog not publishing OMP defaults.
- Implemented:
  - `ModelCatalog` carries `defaults: { model: {providerId, modelId} | null, thinkingLevel: string | null }`. The worker resolves them as OMP startup does (`modelRoles.default` → allowed-model role resolution → automatic credential-aware pick; role-explicit suffix → model `thinking.defaultLevel` → `cfgDefaultThinkingLevel`), using the pinned `resolveAllowedModels`, `resolveModelRoleValue`, `pickDefaultAvailableModel`. `auto` is exposed as-is and never sent as an effort.
  - The UI config store sources `settingsDefaultModel` and new `settingsDefaultReasoningEffort` from the catalog. Global `settingsDefaultVariant`, the desktop `defaultModel`/`defaultVariant` settings, their registry entries and Host normalization, and the global settings-route cascade are removed; project default model/route and small-model/walkthrough preferences are retained.
  - `DefaultsSettings` no longer has default model/thinking rows or writes those desktop settings. `PermissionDefaultModeField.tsx` is now reported unused by knip (it was imported but not rendered before this task); not deleted as unrelated.
  - `ModelControls` composes session effort → native persisted level → explicit draft effort → OMP catalog default → `off`; invalid explicit effort clears to unset, not `off`. Routes remain a separate picker.
  - `ChatInput` sends `reasoningEffort` through a pure resolver (`composer/submit/resolveReasoningEffort.ts`), never as `variant`; a queued item's captured effort (including captured unset/auto) is delivered as captured. `sendMessage` persists the sent effort per session+agent+model, using `ROOT_SELECTION_AGENT` for root chats.
  - Native session state now carries `selection: { model, thinkingLevel }` in the snapshot projection from the JSONL's last `model_change`/`thinking_level_change`, and live `thinking_level_changed` publishes `session.updated.selection` so a reload sees the level the worker just set.
- Check after (full logs in `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-c-2026-10-26/`):
  - `bun run --cwd packages/ui type-check` — pass (full, no errors).
  - `bun run --cwd packages/agent-service type-check` — pass.
  - Agent contract tests — 186 pass.
  - Focused Agent Service: catalog-models, projection and worker fixture tests pass; new tests prove no-effort → `high`, explicit `off` → native `off`, catalog defaults from role/suffix/settings, and persisted selection projection.
  - UI focused logs: `resolveReasoningEffort` 3 pass; `ModelControls.variant.behavior` 13 pass; `useConfigStore` 101 pass; selection-store 5 pass; message-queue server 31 pass; persistence 57 pass; small-model/session-title support tests pass individually.
  - Pre-existing/unrelated failures, reproduced in isolation: `session-ui-store.test.js` slash-expansion tests expect command `agentId` but receive the submitted build agent (2 failures); `session-native.test.ts` approve-compact plan test times out at 30s. Neither path is changed by this task; reported, not suppressed.
  - oxlint on changed files reports only pre-existing anti-slop findings on untouched lines; new helper/file code has none. `bun run dead-code` reports existing unused files/exports plus `PermissionDefaultModeField.tsx` now unused; inspected, not mass-fixed.
- Review boundary: Base `cbe1f912b3` plus the task paths above. Fast delta review found no blockers; it specifically verified captured queue precedence, root sentinel lookup, native snapshot authority, default-resolution order against the pinned SDK, auto omission, non-reasoning guard and credential selection.
- Real path (UI 5193 / API 3923, data dir in evidence, isolated context `onp-c`, page 7): draft showed High for `CLIProxyAPI/gpt-6.1-sol` from catalog defaults `{model: gpt-6.1-sol, thinkingLevel: high}`; the actual `POST /sessions/:id/runs` carried `reasoningEffort: "high"`, `variant: null`; explicit Off carried `reasoningEffort: "off"`, `variant: null`; the live snapshot then reported `thinkingLevel: "off"`; reload showed Off. Screenshot `task04-reload-off.png`; captured payloads `create-run-request.network-request`, `create-run-off-request.network-request`, `models-response.network-response`, `snapshot-response*.network-response`. Dev server stopped after the run.
- Changed paths: `packages/agent-contract/src/{catalogs,snapshot,events}.ts` + tests; `packages/agent-service/src/{projection/journal,projection/protocol,worker/catalog-models,worker/projection,worker/session}.ts` + tests; `packages/ui/src/components/chat/{ModelControls,ChatInput,pinnedComposerSelection}.tsx|ts` + tests and new `composer/submit/resolveReasoningEffort.ts`; `packages/ui/src/stores/{useConfigStore,settings/registry}.ts` + tests; `packages/ui/src/sync/{selection-store,session-ui-store}.ts` + tests; `packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx`; `packages/ui/src/components/sections/routing/RoutingPage.tsx`; `packages/ui/src/lib/guests/start-session.ts`, `lib/worktreeSessionCreator.ts`; `packages/web/server/lib/host/{settings-helpers.js,settings-registry.json}`; `packages/web/server/lib/scheduled-tasks/session-defaults.js`; locale files had dead keys removed (no new strings); `.workflow/decisions.md`.
- Removed dead test `DefaultsSettings.test.tsx` (its only case asserted the retired desktop default model/variant flow).

