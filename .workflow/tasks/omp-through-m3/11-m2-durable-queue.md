# 11: Cut over the durable Host Gateway queue

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Host-owned SQLite prompt queue records canonical deliveries, survives Host/service restart, preserves per-session order, attachments and revisions, and exposes explicit storage/delivery failure without losing unrelated queues.

**Blocked by:** 09
**Files:** `packages/web/server/lib/queue/`, host routes, migrations, queue tests and documentation

**Read first:** `.workflow/specs/omp-through-m3.md` M2/W5; architecture Host Gateway persistence and queue sections; existing queue owner and schema; agent contract job/session events
**Covers:** W5

**Check:** Run focused tests in the discovered queue owner with `node scripts/run-isolated-tests.mjs <queue-owner-directory>`, then a temporary Host/service restart scenario → enqueue/claim/ack/retry/fail/restart preserves attachments, revisions, order and idempotent delivery; outage or corrupt data never becomes authoritative empty success. Record concrete paths before implementation and remove temporary smoke code.

- [ ] Keep SQLite persistence and queue authorization in the Host Gateway.
- [ ] Store canonical session/job references without SDK objects or provider secrets.
- [ ] Convert the existing atomic JSON queue explicitly, preserving captured attachments, revisions and valid unrelated records when conversion fails partially.
- [ ] Make claim, acknowledgement, retry and terminal failure transitions atomic and observable.
- [ ] Reconcile queue records with service restart and worker terminal state explicitly.
- [ ] Preserve unrelated projects when one record is malformed or failed.
