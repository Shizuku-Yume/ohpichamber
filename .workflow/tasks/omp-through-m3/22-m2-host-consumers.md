# 22: Cut over server-owned execution consumers

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Host session work, permission handling, queue dispatch, routing, small-model calls and notification events use the Canonical Agent Service instead of OpenCode execution helpers.

**Blocked by:** 10, 11, 12
**Files:** `packages/web/server/index.js`, `packages/web/server/lib/session-work/`, permission, queue, routing, small-model and notification modules; focused tests and owner docs

**Read first:** `.workflow/specs/omp-through-m3.md` M2 host integration; contracts; `packages/web/server/index.js` stream/session-work/queue/permission composition; nearest owning documentation
**Covers:** W3, W4, W5, W6, W10

**Check:** Run the existing isolated runner on the affected Host owners, then one disposable Host/Agent Service scenario with OpenCode absent → a queued follow-up dispatches once, a real approval blocks then resolves, notifications consume the canonical terminal event, and host FS/Git/PTY/Guest routes remain independent. Record the concrete commands in Progress; remove temporary smoke code.

- [ ] Inventory all server-side execution consumers, including retained M4 features whose execution dependency must change now.
- [ ] Replace agent URLs, auth helpers and event consumers directly; do not preserve a dual execution authority.
- [ ] Preserve existing orchestration policy and Host authorization rather than redesigning M4 algorithms.
- [ ] Keep provider credentials inside the verified OMP-owned boundary, including quota access that previously read OpenCode credentials.
- [ ] Test service unavailable and partial failure without converting them to empty authoritative success.
- [ ] Leave application activation to task 17 after all UI callers move; the disposable service run has no OpenCode fallback.
