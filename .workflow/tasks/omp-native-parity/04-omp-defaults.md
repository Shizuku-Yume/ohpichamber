# 04: Take model and thinking defaults from OMP

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** New chats use OMP's `modelRoles.default` and `defaultThinkingLevel`; the effort the composer shows is the effort sent and survives reload; efforts are never sent as `variant`; app-level default model/effort settings are retired.

**Blocked by:** None
**Files:** `packages/agent-service/src/worker/session.ts` (297-301, 323-325 `selectedReasoning ?? 'off'`), `packages/agent-service/src/worker/catalog-models.ts` (130-138), catalog contract in `packages/agent-contract`, `packages/ui/src/components/chat/ModelControls.tsx` (~653), `packages/ui/src/stores/useConfigStore.ts` (209, 278), `DefaultsSettings` and desktop default settings, draft/session effort persistence.

**Read first:** spec "Defaults come from OMP"; `.workflow/done/omp-native-chat/10-effort-picker.md`; skill `ui-api-decoupling`; OMP `session/settings.ts` (`cfgDefaultThinkingLevel`) and `settings.getModelRole` in the pinned package.
**Covers:** W6

**Check:** Before: a fixture test with `defaultThinkingLevel: high` and no client effort records thinking off; a UI test shows High while the send captures `reasoningEffort: null`. After: worker runs at `high`; the catalog carries OMP defaults; the draft shows them; a reload shows the stored level; Off sends `off`; no effort reaches `variant`.

- [ ] Worker defers to OMP resolution when the client gives no choice.
- [ ] Catalog exposes OMP default model and thinking level.
- [ ] UI draft, send and reload agree on one effort value.
- [ ] App-level defaults removed.
