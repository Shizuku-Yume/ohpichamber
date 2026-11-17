# 01: Bring dead code to zero

**Effort:** tech-debt-sweep
**Task type:** refactor
**Blocked by:** 02, 03, 05, 06, 07, 08
**Covers:** W1
**Files:** `knip.json`; every file `bun run dead-code` reports on the integration tip
**Read first:** `.workflow/specs/tech-debt-sweep.md` (item 1); `.agents/skills/openchamber-change-discipline/SKILL.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task13/gate/final-07-dead-code.log`; `AGENTS.md` Validation
**Check:** `bun run dead-code && bun run type-check && bun run lint && VITEST_MAX_WORKERS=2 bun run --cwd packages/ui test && bun run --cwd packages/web test` → all exit 0; `dead-code` prints no unused file, export, type or hint.
**Base commit:** ca71544157c045f4200a81191a950667058793bc

- [x] Rerun `bun run dead-code` on the integration tip after tasks 02-08 landed; that list, not the old log, is the work list.
- [x] Each unused file is checked for dynamic imports, string-addressed loaders, tests and docs before deletion; retired relics (OpenCode, VS Code, old workflow cards) are deleted with their tests and stale doc mentions.
- [x] Each unused export is un-exported or deleted. Exports that are a real public contract (`@openchamber/sdk`, `@openchamber/agent-contract` consumers, package entrypoints) are declared as entries in `knip.json`, one named path each; no blanket ignore globs.
- [x] The 7 configuration hints are resolved.
- [x] Exports flagged in files other tasks just added (pins, unread, warming) are checked against their callers; a real caller wins over deletion.

## Progress

- **Check before:** `bun run dead-code` exited 1 on `ca71544157c045f4200a81191a950667058793bc` with 43 unused files, 168 unused exports, 118 unused exported types, and 7 configuration hints (`check-before-dead-code.log` / `check-before-dead-code.json`).
- **Changes & surface parity:**
  - `knip.json` & `packages/agent-service`: resolved all 7 configuration hints, declared `src/interaction/host-policy.ipc.child.ts` (dynamically `fork()`ed by `host-policy.ipc.test.ts:17`) as a named entry, and un-exported 7 internal symbols across `native-policy-protocol.ts`, `protocol.ts`, `worker/host-tool.ts`, and `worker/suggestion.ts`.
  - `packages/web`: deleted 6 unused server/API files (`opencode/prompt-response.js`, `opencode/response-envelope.js`, `opencode/session-activity.js`, `quota/route-error.js`, `session-work/membership.js`, `src/api/github-references.ts`), un-exported 20 internal server symbols, and deleted 11 unused server exports.
  - `packages/ui`: deleted 36 unused UI modules (plus throwaway `packages/ui/keys-tmp.ts`), internalized 105 internal-only exports/types, and removed 143 unused exports/types across `apps/`, `components/`, `hooks/`, `api/`, `lib/`, `stores/`, and `sync/`. Checked newly added workbench exports (`session-pins.ts`, `useSessionPinnedStore.ts`, `session-unread.ts`, `sync-context.tsx`, `event-reducer.ts`, `canonicalClient.ts`): `session-warming*` had 0 findings; internal/unused exports were internalized or removed after verifying zero external callers.
  - Minimal cross-file updates outside `knip.json` and knip-reported files: removed `packages/ui/keys-tmp.ts`, updated `packages/ui/src/lib/ime.escapeSurfaces.test.ts` and stale doc/comment references (`settings/DOCUMENTATION.md`, `shortcuts/DOCUMENTATION.md`, `easter-eggs/DOCUMENTATION.md`, `files/DOCUMENTATION.md`, `auto-review/DOCUMENTATION.md`, `pr-watch/DOCUMENTATION.md`, `DiffFindBar.tsx`, `useDiffFindSurface.ts`), removed 3 stale rows from `scripts/upstream-gaps.allowlist.tsv`, and updated `.workflow/upstream-deltas.tsv` (removed 11 deleted/reverted rows, added 45 decision rows).
  - Surface parity (Web/PWA, Electron, hosted mobile, Capacitor mobile, Guest SDK): all retained surfaces remain unchanged in user-reachable behavior; only unreferenced modules, dead exports/types, retired OpenCode/VS Code relics, stale doc/allowlist entries, and knip configuration hints were removed or updated.
- **Check after:**
  - `bun run dead-code` -> exit `0` (0 unused files, 0 unused exports, 0 unused exported types, 0 configuration hints; `final-01-dead-code.log`). Bare `bunx knip@5.80.0` (without `--include`) reports 0 unused files/exports/types and exits `1` on pre-existing unused-dependency/unlisted-binary/unresolved-import checks plus 1 hint on `oxlint.anti-slop.config.ts` (kept because `bun run dead-code` requires it; `final-01-knip-with-hints.log`).
  - `bun run type-check` -> exit `0` across all 5 projects (`final-02-type-check.log`).
  - `bun run check` -> exit `0` (all 5 guardrails passed: `type-check`, `upstream-drift`, `error-cause`, `css-classes`, `upstream-gaps`; `final-02b-check.log`).
  - `bun run lint` -> exit `0`, 0 warnings (`final-03-lint.log`).
  - `bun run docs:validate` -> exit `0` (`final-04-docs-validate.log`).
  - `VITEST_MAX_WORKERS=2 bun run --cwd packages/ui test` -> exit `0`, `1243/1243` test files passed (`wave3-ui-test.log`; `git diff` confirms zero `packages/` changes since this run).
  - `VITEST_MAX_WORKERS=2 bun run --cwd packages/web test` -> exit `0`, `525` passed / `9` skipped test files (`8582` passed / `142` skipped tests; `wave3-web-test.log`; `git diff` confirms zero `packages/` changes since this run).
  - `bunx oxlint` on all modified TS/JS files -> exit `0`, 0 findings (`wave3-oxlint-changed.log`).
  - Real-path Web run on `127.0.0.1:4301`: `bun run --cwd packages/web build` exit `0` (`real-path-web-build.log`), `/health` `200`, `/api/agent/v1/ready` `200`, `0` initial console errors at `1440x900`, live provider chat round-trip `"Reply with exactly the single word: PONG"` -> `"PONG"` (`real-path-chat-4301.png`, `real-path-receipt.json`). All receipts under `/home/shizuku/Project/ohpichamber-omp-artifacts/tech-debt-sweep-2026-11-18/task01/`.
- **Review:** pass (base ca71544157c045f4200a81191a950667058793bc) — independent read-only review via `independent-reviewer` (0 blocking findings; 1 nonblocking stale doc/comment pointer in `packages/mobile/` resolved).
