# 01: Merge-gap guardrail and restored Host wiring

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** None
**Covers:** W1, W2
**Files:** `scripts/upstream-gaps.mjs` (new) and its allowlist; `scripts/check.mjs`; `packages/web/server/index.js`; `packages/web/server/lib/host/feature-routes-runtime.js`; `packages/web/server/lib/{notifications,auto-review,pr-watch,diagnostics,git}/`; `packages/web/server/lib/host/provider-logo-routes.js` (restored from upstream `lib/opencode/`); `packages/ui/src/hooks/useCallableModelProviders.ts`; `packages/ui/src/lib/diagnostics/export.ts`
**Read first:** spec "How it is built" (merge-gap guardrail, restorations); audit `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-dispatch-2026-11-13/{REPORT.md,audit-merge.md,audit-merge.tsv}` and its `scripts/a1-*`, `a2-*`, `a3-*`; `research/feedback-2026-11-12/02-integrations-remote.md` (item 6); upstream `bc50ba56a:packages/web/server/{index.js,lib/opencode/feature-routes-runtime.js}`; skills `openchamber-change-discipline`, `ui-api-decoupling`, `enterprise-boundary` (notification channels send off-host)
**Check:** `node scripts/upstream-gaps.mjs --check && bun run check && bun run --cwd packages/web test -- server/lib/notifications server/lib/auto-review server/lib/pr-watch server/lib/git server/lib/host` → exit 0; after deleting the `registerNotificationChannelRoutes(...)` call, `node scripts/upstream-gaps.mjs --check` exits non-zero and names it. Real path (Web, isolated data dir): Settings → Integrations opens with no error toast and a notification channel connects; a review flow starts an auto-review run; a session with a PR shows the PR watch strip; a custom provider logo uploads and renders; a passphrase-protected SSH key imports; the diagnostics export lists local files; the walkthrough model picker lists models. Screenshots go in the evidence directory.
**Base commit:** 80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5

- [x] `scripts/upstream-gaps.mjs` compares upstream `bc50ba56a` with the working tree on every class in the spec: route registrations and runtime deps, uncalled route functions, UI/Electron/mobile `/api` calls versus string, parameter and regex routes, settings items, registry keys, sanitizer keys, store fields with setters, and search entries. Allowlist rows cite a `decisions.md` heading or an OMP owner. Gaps owned by later tasks in this effort are listed as `pending <task>` rows, which tasks 02 and 03 remove. `bun run check` runs it.
- [x] Restore from upstream: notification channel routes, the extension channel store, and `deliverToExtensionChannels`; auto-review routes; PR watch routes; provider logo routes; `createExtensionTrackers`; `createClientPushAccess` with `removeClientPushDevices`; the session draft `onChanged` broadcast; `/api/diagnostics/local-files`; the SSH passphrase store passed to `createManagedSshInventory`.
- [x] `useCallableModelProviders` resolves callable providers through OMP `modelRoles` and the model catalog instead of `/api/small-model` (decision 2026-11-05). `/api/diagnostics/opencode-load` and its UI caller are deleted as OpenCode-only.
- [x] The Integrations channel section toasts only on a real failure, not when the capability is absent.
- [x] Each restored route has a route test; the audit's P0 and P1 route rows are all closed or allowlisted.

## Progress

Check after: `node scripts/upstream-gaps.mjs --check && bun run check && bun run --cwd packages/web test -- server/lib/notifications server/lib/auto-review server/lib/pr-watch server/lib/git server/lib/host` -> exit 0; loaded 589 allowlisted gaps, 588 detected gaps, 0 unallowlisted gaps; negative check proved exit 1 naming registerNotificationChannelRoutes; bun run check 5/5 passed; vitest 155 files passed (2431 passed, 5 skipped). Real path: 7/7 items verified on port 4101 with screenshots 01-07 in evidence dir.
Review: pass - diff verified against base commit 80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5, oxlint 0 findings, dead-code inspected, all tests passing.
