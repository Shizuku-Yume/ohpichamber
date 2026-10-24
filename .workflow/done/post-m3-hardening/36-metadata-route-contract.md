# 36: Correct the session metadata PATCH route in the contract

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** 342c8182e20c8843176a5b714101f2f0696a5ea9
**Started:** 2026-10-24T14:17:24Z
**Finished:** 2026-10-24T14:24:10Z

**Delivers:** The Canonical API contract documents the route the Host and client implement: `PATCH /api/agent/v1/sessions/:sessionId/metadata`.

**Blocked by:** None
**Files:** `.workflow/omp-migration/contracts.md` (session metadata route row at line 127 and the Host-intercept prose at line 501)

**Read first:** `.workflow/done/post-m3-hardening/07-review-findings-triage.md` Findings item 5; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/AgentServiceReview.md` finding 8; `packages/web/server/lib/openchamber-sessions/routes.js:490-491`; `packages/ui/src/api/canonicalClient.ts:227-230`

**Check:** The contract has one PATCH route for Host-owned metadata, with the path used by the Host router and canonical client; no non-suffixed `PATCH /sessions/:sessionId` statement remains.

## Done when

- [x] The PATCH metadata table row names `/api/agent/v1/sessions/:sessionId/metadata`.
- [x] The Host-intercept prose names the same suffix.
- [x] No other contract statement describes a non-suffixed metadata PATCH.

## Progress

Started 2026-10-24T14:17:24Z on branch `post-m3-hardening/36-metadata-route-contract`, cut from `main` `342c8182e`. Dirty at start: none.

Check before: FAIL (exit 1). Command:

```sh
test "$(grep -cE '^\| `PATCH` \| `/api/agent/v1/sessions/:sessionId/metadata` \|' .workflow/omp-migration/contracts.md)" -eq 1 &&
test "$(grep -cF 'PATCH .../sessions/:sessionId/metadata' .workflow/omp-migration/contracts.md)" -eq 1 &&
! grep -nE 'PATCH.*/sessions/:sessionId([^/A-Za-z]|$)' .workflow/omp-migration/contracts.md
```

The table-row assertion matched 0 (line 127 named the non-suffixed path; its pattern was corrected to include the path backticks before the after run), the prose assertion matched 0, and the non-suffixed scan (corrected to span table cells) matched lines 127 and 501 on the pre-change file.

Check after: PASS (exit 0), `row=1 prose=1`, no non-suffixed PATCH match.

Review boundary: `342c8182e` + `.workflow/omp-migration/contracts.md`, `.workflow/tasks/post-m3-hardening/36-metadata-route-contract.md`; round: 1; briefs: A,B; boundaries: docs-only contract text (no trust boundary); findings: A 0 blocking / 2 nonblocking, B 0 blocking / 3 nonblocking.

Findings and outcomes:
- A1 (nonblocking, check coverage): the negative scan used `PATCH[^|]*`, which cannot cross a table cell, so it missed row 127. Fixed: scan is now `PATCH.*/sessions/:sessionId([^/A-Za-z]|$)`; it matches lines 127 and 501 on the pre-change file and finds nothing after the edit.
- A2 (nonblocking, process): the task was still active and unarchived while recording `Check after`. Fixed in this archive step.
- B1: clean; route row, prose, Host router and client agree.
- B2 (nonblocking, pre-existing): `If-Match` conditional-write prose at line 501 has no implementation; client and Host send no revision header. Outside this task's Done-when, left unchanged; candidate follow-up for triage.
- B3 (nonblocking, pre-existing): queue reorder row at line 139 documents `POST .../queue/reorder` while the Host implements `PUT .../queue/order`. Outside this task's Done-when, left unchanged; candidate follow-up for triage.
- B4 (nonblocking, record accuracy): fixed the stale `Read first` pointers to the archived triage file and the external `AgentServiceReview.md`; the scan-coverage part is covered by the A1 fix.

Security pass: not applicable; docs-only text, no trust boundary or executable path changed.
