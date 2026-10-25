# 10: Effort picker from the model's thinking levels

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** dee0c88ebd6c52810fefaa74d5848a23ecf6a0d9
**Started:** 2026-10-25T20:46:09+08:00
**Status:** active

**Delivers:** The effort picker lists the selected model's real thinking levels (`off` plus its efforts) and sends `reasoningEffort`. A model without reasoning shows no picker. Configured `thinking.effortRouting` routes appear separately, labelled as routes.

**Blocked by:** None
**Files:** `packages/ui/src/components/chat/ModelControls.tsx` (variant reads at 646-664, 760, 2295-2311), `ModelControls.variant.behavior.test.tsx`, `MobileModelButton.tsx`, `packages/agent-service/src/worker/catalog-models.ts` (129-151, `reasoningOptions`), `packages/agent-service/src/worker/session.ts` `selectOptions` (295-301), queue/send option capture in `ChatInput.tsx`.

**Read first:** spec "Effort" and W8; `research/crude-port-ledger.md` CP-03; `contracts.md` "Single Delivery Owner" (captured options include `reasoningEffort`).
**Covers:** W8

**Check:** Before: a UI test with a model whose `reasoningOptions` is `[off, low, medium, high]` and `variants` is empty shows no effort choices. After: `bun run --cwd packages/ui test` shows `off, low, medium, high`, the send captures `reasoningEffort: 'high'` and `variant: null`; a model with `reasoningEffortSupported: false` shows no picker; a model with routes shows them in a separate group. `bun run --cwd packages/agent-service test` has a native test that a prompt at `high` sets OMP thinking level `high` at the fixture provider.

- [x] Picker reads `reasoningOptions`; `variants` only drives the routes group.
- [x] The keyboard cycle shortcut cycles efforts, not variants.
- [x] Queued items keep the captured effort.
- [x] Existing variant behaviour test rewritten for the new meaning, not re-pinned.

## Progress

- Dirty at start: none.
- Surfaces: Web and Electron use the shared desktop composer; hosted mobile and Capacitor use the shared mobile composer. All will select catalog efforts separately from configured routes; no transport or runtime API changes.
- Root cause: the UI's effort selector treated `Model.variants` (native routing destinations) as reasoning efforts; it submitted that value as `variant` and omitted `reasoningEffort`. Queue capture persisted the same obsolete value. Native option validation already accepts actual reasoning efforts, while explicit `off` must be resolved as a supported selector.
- Check before: full `bun run test` baseline timed out after all scripts, SDK, UI, and agent-contract suites passed; agent-service was terminated at the 300-second timeout. The task-specific UI/Agent Service checks were not run before changes.
- Reviewed implementation ownership: shared picker, composer send and queue capture are now updated together; MobileModelButton remains unchanged because it is display-only.
- Check after (focused UI): `bun test packages/ui/src/components/chat/ModelControls.variant.behavior.test.tsx packages/ui/src/stores/messageQueueStore.server.test.ts packages/ui/src/hooks/useKeyboardShortcuts.test.tsx` — 58 pass.
- Check after (Agent Service): `bun test packages/agent-service/src/worker/catalog-models.test.ts packages/agent-service/src/worker/session-native.test.ts` — 50 pass.
- Final checks after review fixes: `bun run --cwd packages/ui test` — 809/809 test files passed; `bun run --cwd packages/ui type-check` passed; focused Agent Service tests — 50 pass; Agent Service type-check — passed. Agent Service full suite — 244 pass, 7 skipped. UI lint reports 3 errors in unrelated `LegacyDataNotice.tsx`.
- Real path: lane-d dev server returned 200 for `/` and 401 for unauthenticated catalog access; no UI/provider send was possible without credentials/browser session. Fixture-backed worker check proves native `high` delivery.
- Review round 1 boundary: Base `dee0c88ebd6c52810fefaa74d5848a23ecf6a0d9` plus all task paths; brief A found four blockers and brief B two, all fixed: route mapped efforts are reconciled; cycling uses session-saved effort; slash-fork preserves route/effort; expanded queued model clears incompatible effort; first BTW prompt forwards effort. Security pass: no trust boundary changes.
- Delta review against the fixes and focused tests found no remaining blockers.
**Finished:** 2026-10-26T02:16:10+08:00
