# 07: Define the Canonical Agent Service contract package

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Versioned internal Agent Service types and validation cover sessions, projects, messages, events, approvals/questions, queue records, catalogs, shell jobs, cursors and typed errors without importing SDK objects into Host Gateway or UI.

**Blocked by:** 21
**Files:** `packages/agent-contract/`, `.workflow/omp-migration/contracts.md`, package manifests and contract tests

**Read first:** `.workflow/specs/omp-through-m3.md` M2/W3-W6; `.workflow/omp-migration/contracts.md`; architecture process boundary; M0 artifacts; existing SDK and runtime contract conventions
**Covers:** W3, W4, W5, W6

**Check:** `bun test packages/agent-contract` → valid and invalid fixtures exercise every exported DTO, event envelope, cursor and error class; no contract imports `@opencode/*` or leaks SDK class instances.

- [ ] Define DTOs from verified behavior and intentional service projections, not inherited OpenCode shapes.
- [ ] Define event sequence/cursor rules, replay semantics, terminal states and restart invalidation.
- [ ] Define CAS versions for approvals/questions and queue state transitions.
- [ ] Define catalog, completion and Guest Shell result/error shapes with bounded output and redaction rules.
- [ ] Keep SDK-private types behind the service package boundary.
