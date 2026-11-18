# 06: Per-session cache warming on the Agent Service

**Effort:** tech-debt-sweep
**Blocked by:** None
**Covers:** W6
**Files:** `packages/agent-contract/src/` (session warming schema); `packages/agent-service/src/supervisor/` (route, revision, persistence) and `src/worker/catalog-warming.ts` (per-session application); `packages/web/server/lib/host/` canonical route allowlist if needed; `packages/ui/src/api/canonicalClient.ts`; a UI store and sync subscriber; the session context menu toggle; the Settings field beside the workspace warming control; `packages/ui/src/lib/i18n/messages/*` (15 locales); `.workflow/omp-migration/contracts.md`
**Read first:** `.workflow/specs/tech-debt-sweep.md`; `.workflow/technical-debt.md` "Per-session warming has no Agent Service implementation"; decisions.md 2026-10-29 "Delete upstream's per-session warming" and 2026-11-18 "Build per-session cache warming"; the workspace warming route (`workspace-routes.ts` `cache-warming`) and `catalog-warming.ts`; the upstream feature in git history before the 2026-10-29 deletion (`git log --all -S session-warming -- packages/web/server/lib/session-warming`) for UX only; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/components/sections/PATTERNS.md`
**Check:** `bun run --cwd packages/agent-contract test && bun test packages/agent-service/src && VITEST_MAX_WORKERS=2 bun run --cwd packages/ui test && bun run --cwd packages/web test` → exit 0. Real path with the real provider on the Web surface: two sessions in one workspace, warming on for A only; canonical state and worker activity show A kept warm and B not; restart the Host, A's setting persists; the workspace control still sets all workers. Screenshots of the menu toggle and Settings field.
**Base commit:** 7997867af1f4e8f3bc9fa00ec0c569f1670632c9

- [x] Canonical `GET/PUT` session-level warming with revision CAS and a per-session apply outcome; the session value overrides the workspace mode for that session, and the precedence is documented in `contracts.md`.
- [x] The worker applies the mode through OMP's native per-session warming API; no Host-side timer or ping loop.
- [x] The setting persists with the session's Host state and is cleared when the session is deleted.
- [x] The session menu toggle and the Settings field follow PATTERNS.md; copy in all 15 locales.
- [x] Delete the technical-debt entry in the same commit.

## Progress

Check after: exit 0 — agent-contract 263 pass / 27 files; agent-service 542 pass, 10 skip / 73 files; ui 1241/1241 files pass; web 525/534 files pass (8582 pass, 142 skip); type-check 0 errors across 5 projects; lint 0 errors; oxlint + anti-slop 0 errors on authored files; dead-code 0 new findings. Real path on Web port 4306 with CLIProxyAPI/gemini-3.5-flash-lite passed: Session A warming on (1 native CacheWarmer replay, persisted across Host restart), Session B cold (0 replays), workspace toggle applied across inheriting workers while respecting per-session overrides, and session deletion cleared session-cache-warming.json. Receipts & screenshots in /home/shizuku/Project/ohpichamber-omp-artifacts/tech-debt-sweep-2026-11-18/task06/.

Review: pass (base 7997867af1f4e8f3bc9fa00ec0c569f1670632c9) — independent read-only vibe session reviewer-task06 (Round 2 pass after rebuilding web dist and refreshing logs for the draft_* sync guard)

Surface parity: Web/PWA, Electron desktop, Hosted mobile, and Capacitor mobile all consume `/api/agent/v1/sessions/:sessionId/cache-warming` through `canonicalClient` + `runtimeFetch` and share `useSessionWarmingSync` in `SyncRuntimeEffects`.
