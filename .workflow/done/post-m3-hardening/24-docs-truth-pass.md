# 24: Make product docs claim only verified behavior

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** a37446ac7a309f5ce8a9a27bec0de3e326a73cf9
**Started:** 2026-10-24T07:05:21Z
**Finished:** 2026-10-24T08:20:00Z

**Delivers:** Product docs and package READMEs describe M4 features, Mobile and npm standalone as they are verified today, labeling unverified behavior.

**Blocked by:** None
**Files:** `packages/docs/README.md` (3-5); `packages/docs/content/docs/auto-model-routing.mdx` (8-14) and other M4 feature pages; `packages/mobile/README.md` (line 9 still says OpenCode-backed); `packages/web/README.md`; translations

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``SurfacesReview.md` findings 5, 7 and `PlanGapAnalysis.md` (c); `.workflow/done/omp-through-m3/retrospective.md` "Debt left behind"
**Covers:** H14

**Check:** `bun run docs:validate` passes, and a reviewer reading each changed page against `development.md` evidence finds no claim stronger than the evidence.

## Done when

- [x] Labels are consistent across locales. The same note wording is used on the five M4 pages, and the mobile, Session Assist and project-notes notes are translated in all 11 locales with the established `Guest iframe` term.
- [x] The Mobile README describes the current Canonical API host, not OpenCode.
- [x] Delegate the prose to `writer`; facts come from the cited evidence. A writer agent drafted the English paragraphs from the development/retrospective evidence; wording was checked against the same evidence before translation.

## Progress

Dirty at start: none. Task24 uses branch `post-m3-hardening/24-docs-truth-pass` in worktree `/home/shizuku/Project/ohpichamber-worktrees/post-m3-hardening-lane-g-24`, based at main `a37446ac7a309f5ce8a9a27bec0de3e326a73cf9` after Task23 landed. Goal: product docs and package READMEs claim only behavior backed by `development.md`/retrospective evidence; label M4 features, Mobile and npm standalone as unverified where the evidence does not support them, consistently across locales.

Check before: `bun run docs:validate` passed (672 pages, 56 sidebar links) but the validator checks only frontmatter and sidebar routes; it cannot see that `packages/docs/README.md` called the guides "current OMP product behavior", that `auto-model-routing.mdx` and the other M4 pages described open features as working, or that `packages/mobile/README.md` still described an "OpenCode-backed UI". `development.md` (2026-10-20 entries) and the retrospective "Debt left behind" list those M4 features and M5 mobile certification as open and the standalone npm runtime as unverified.

Change: one verification note per page in English and all 11 locales (87 localized page edits plus the two READMEs). `auto-model-routing`, `session-goals`, `scheduled-tasks`, `multi-run` and `notifications` carry the same M4 note under the H1; `mobile` and `notes-todos-plans` carry page notes under the H1; the Session Assist note sits under the "Recap and next-message suggestion" heading and names automatic classification, the "looks done" hint and Session Assist. `packages/docs/README.md` now says the guides describe intended behavior and label unverified features, and names mobile device certification and the standalone npm runtime as unverified. `packages/mobile/README.md` now says the app bundles the UI only and connects to an OpenChamber server whose Host Gateway serves the Canonical API, embeds no host or agent runtime, leaves Capacitor reconnect/push/offline and device certification unverified, and keeps Guest iframe support as an M5 item. `packages/web/README.md` was read and left unchanged: it already labels the standalone npm runtime unverified and packaged Electron certification open from the 2026-10-20 evidence entries, so no stronger claim remained.

Check after: `bun run docs:validate` -> 672 pages, 56 sidebar links; `git diff --check` clean. Review (round 1, boundary `a37446ac7` + committed claim `aeb210b81` + working tree): Brief A found one blocking finding (the Session Assist note did not cover automatic classification and the "looks done" hint) and Brief B found three blocking findings (mobile and project-notes notes placed after the intro paragraph instead of under the H1; "Guest frames" terminology instead of the established "Guest iframe"). All four were fixed for English and every locale; docs validation and diff check reran clean; delta rechecks for both briefs returned PASS with no remaining findings. No new decisions qualified for `decisions.md`.
