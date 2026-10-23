# 36: Correct the session metadata PATCH route in the contract

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** The Canonical API contract documents the route the Host and client implement: `PATCH /api/agent/v1/sessions/:sessionId/metadata`.

**Blocked by:** None
**Files:** `.workflow/omp-migration/contracts.md` (session metadata route row at line 127 and the Host-intercept prose at line 501)

**Read first:** `.workflow/tasks/post-m3-hardening/07-review-findings-triage.md` Findings item 5; `AgentServiceReview.md` finding 8; `packages/web/server/lib/openchamber-sessions/routes.js:490-491`; `packages/ui/src/api/canonicalClient.ts:227-230`

**Check:** The contract has one PATCH route for Host-owned metadata, with the path used by the Host router and canonical client; no non-suffixed `PATCH /sessions/:sessionId` statement remains.

## Done when

- [ ] The PATCH metadata table row names `/api/agent/v1/sessions/:sessionId/metadata`.
- [ ] The Host-intercept prose names the same suffix.
- [ ] No other contract statement describes a non-suffixed metadata PATCH.
