# 09: Close the five efforts whose work already landed

**Effort:** tech-debt-sweep
**Task type:** refactor
**Blocked by:** None
**Covers:** W10
**Files:** `.workflow/specs/{omp-native-chat,omp-native-parity,omp-through-m3,upstream-rebaseline,ux-and-omp-parity-remediation}.md`; `.workflow/done/<each>/closeout.md` (new); `AGENTS.md`; `.workflow/development.md` (the pending-acceptance lines only); `.workflow/omp-migration/README.md` and `implementation-plan.md` where they call these acceptances pending
**Read first:** `.claude/skills/flow-close/SKILL.md`; decisions.md 2026-11-18 "Close the five landed efforts on their recorded evidence"; each spec's `## How we will know it works`; each effort's archived tasks and their evidence; the latest full gate of a later effort that re-verified the same surfaces (`m6-audit-and-polish` closeout, `ux-feedback-2026-11-15` task 13 gate)
**Check:** `.workflow/bin/workflow validate && .workflow/bin/workflow next --no-color | grep -A3 'Ready to close'` → validate exits 0 and none of the five efforts is listed; `bun run docs:validate` exits 0; `grep -n 'acceptance is pending\|acceptance pending' AGENTS.md` prints nothing.

- [ ] Each closeout uses the flow-close template: `**Accepted:** 2026-11-18 by maintainer (directive in decisions.md 2026-11-18)`, `## Shipped` mapping every W check to its recorded evidence or to the later effort and gate that superseded it, waived checks and skipped reviews listed from the task records, remaining debt pointing at `technical-debt.md` entries or "None".
- [ ] Integration branches are confirmed ancestors of `main` (`git merge-base --is-ancestor`); record the result in each closeout.
- [ ] Specs set to `**Status:** done`. `AGENTS.md`, `development.md` and the migration README stop calling Task18/Task57 or these efforts pending; no other text is rewritten.
- [ ] Do not touch `ux-feedback-2026-11-15`, `rebrand`, `m7-release-verification` or `tech-debt-sweep` itself.
