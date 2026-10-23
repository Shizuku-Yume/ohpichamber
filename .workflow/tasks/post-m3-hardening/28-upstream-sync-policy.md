# 28: Answer how to keep up with upstream OpenChamber

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** <commit-sha>

**Delivers:** Answer to: how far has the fork diverged from upstream since `1f9320062c9a3c70925cf3243f1ee0c6e5f16765`, by area, and which sync policy (periodic selective import by area, security-only, or none) fits that divergence?

**Blocked by:** None
**Files:** no source changes; read `git diff --stat 1f9320062c9a3c70925cf3243f1ee0c6e5f16765 main` and the local `upstream/*` refs

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/upstream-baseline.json`; `.workflow/upstream-review.md`; `.workflow/decisions.md` "2026-10-10 - Latest upstream first then restore the fork"; `.workflow/spike-tasks.md`
**Covers:** H15

**Check:** `## Findings` gives divergence per package/area, the cost of each policy, and a recommendation; the maintainer's choice becomes a `decisions.md` entry.

## Done when

- [ ] Uses only local refs unless the maintainer permits a fetch.
- [ ] Time box: one divergence measurement and one sample import attempt.
