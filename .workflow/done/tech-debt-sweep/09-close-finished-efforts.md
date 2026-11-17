# 09: Close the five efforts whose work already landed

**Effort:** tech-debt-sweep
**Task type:** refactor
**Blocked by:** None
**Covers:** W10
**Files:** `.workflow/specs/{omp-native-chat,omp-native-parity,omp-through-m3,upstream-rebaseline,ux-and-omp-parity-remediation}.md`; `.workflow/done/<each>/closeout.md` (new); `AGENTS.md`; `.workflow/development.md` (the pending-acceptance lines only); `.workflow/omp-migration/README.md` and `implementation-plan.md` where they call these acceptances pending
**Read first:** `.claude/skills/flow-close/SKILL.md`; decisions.md 2026-11-18 "Close the five landed efforts on their recorded evidence"; each spec's `## How we will know it works`; each effort's archived tasks and their evidence; the latest full gate of a later effort that re-verified the same surfaces (`m6-audit-and-polish` closeout, `ux-feedback-2026-11-15` task 13 gate)
**Check:** `.workflow/bin/workflow validate && .workflow/bin/workflow next --no-color | grep -A3 'Ready to close'` → validate exits 0 and none of the five efforts is listed; `bun run docs:validate` exits 0; `grep -n 'acceptance is pending\|acceptance pending' AGENTS.md` prints nothing.
**Base commit:** 30c4e1aa5509e9598ebc93f4ae53bd7cf38826eb

- [x] Each closeout uses the flow-close template: `**Accepted:** 2026-11-18 by maintainer (directive in decisions.md 2026-11-18)`, `## Shipped` mapping every W check to its recorded evidence or to the later effort and gate that superseded it, waived checks and skipped reviews listed from the task records, remaining debt pointing at `technical-debt.md` entries or "None".
- [x] Integration branches are confirmed ancestors of `main` (`git merge-base --is-ancestor`); record the result in each closeout.
- [x] Specs set to `**Status:** done`. `AGENTS.md`, `development.md` and the migration README stop calling Task18/Task57 or these efforts pending; no other text is rewritten.
- [x] Do not touch `ux-feedback-2026-11-15`, `rebrand`, `m7-release-verification` or `tech-debt-sweep` itself.

## Progress

- **Check before:** `.workflow/bin/workflow validate` exited 0 (316 task files); `.workflow/bin/workflow next --no-color` listed `omp-native-chat, omp-native-parity, omp-through-m3, upstream-rebaseline` under `Ready to close` (and `ux-and-omp-parity-remediation` had `Status: in progress`); `grep -n 'acceptance is pending\|acceptance pending' AGENTS.md` matched line 39. Receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/tech-debt-sweep-2026-11-18/task09/check-before.log`.
- **Check after:** `.workflow/bin/workflow validate` exited 0 (316 task files); `.workflow/bin/workflow next --no-color | grep -A3 'Ready to close'` printed nothing (grep exit 1, zero efforts ready to close; none of the five efforts listed); `bun run docs:validate` exited 0 (696 pages, 58 sidebar links); `grep -n 'acceptance is pending\|acceptance pending' AGENTS.md` printed nothing (exit 1). Confirmed `git merge-base --is-ancestor` onto `main` (`7997867af1f4e8f3bc9fa00ec0c569f1670632c9`) for all five efforts. Receipts: `/home/shizuku/Project/ohpichamber-omp-artifacts/tech-debt-sweep-2026-11-18/task09/evidence.md`, `workflow-validate.log`, `workflow-next.log`, `ready-to-close-check.log`, `docs-validate.log`, `agents-grep.log`, `ancestry-receipt.log`.
- **Review:** pass (base `30c4e1aa5509e9598ebc93f4ae53bd7cf38826eb`) — independent read-only review by worker `reviewer-task09`; 0 blocking findings.
