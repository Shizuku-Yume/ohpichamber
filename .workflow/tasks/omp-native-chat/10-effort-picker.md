# 10: Effort picker from the model's thinking levels

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** The effort picker lists the selected model's real thinking levels (`off` plus its efforts) and sends `reasoningEffort`. A model without reasoning shows no picker. Configured `thinking.effortRouting` routes appear separately, labelled as routes.

**Blocked by:** None
**Files:** `packages/ui/src/components/chat/ModelControls.tsx` (variant reads at 646-664, 760, 2295-2311), `ModelControls.variant.behavior.test.tsx`, `MobileModelButton.tsx`, `packages/agent-service/src/worker/catalog-models.ts` (129-151, `reasoningOptions`), `packages/agent-service/src/worker/session.ts` `selectOptions` (295-301), queue/send option capture in `ChatInput.tsx`.

**Read first:** spec "Effort" and W8; `research/crude-port-ledger.md` CP-03; `contracts.md` "Single Delivery Owner" (captured options include `reasoningEffort`).
**Covers:** W8

**Check:** Before: a UI test with a model whose `reasoningOptions` is `[off, low, medium, high]` and `variants` is empty shows no effort choices. After: `bun run --cwd packages/ui test` shows `off, low, medium, high`, the send captures `reasoningEffort: 'high'` and `variant: null`; a model with `reasoningEffortSupported: false` shows no picker; a model with routes shows them in a separate group. `bun run --cwd packages/agent-service test` has a native test that a prompt at `high` sets OMP thinking level `high` at the fixture provider.

- [ ] Picker reads `reasoningOptions`; `variants` only drives the routes group.
- [ ] The keyboard cycle shortcut cycles efforts, not variants.
- [ ] Queued items keep the captured effort.
- [ ] Existing variant behaviour test rewritten for the new meaning, not re-pinned.
