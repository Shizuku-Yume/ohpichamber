# 21: Verify the M1 extraction gate

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Current evidence proves retained Host owners after extraction, no supported VS Code extension path, explicit credential handoff results and durable Host metadata before Agent Service implementation begins.

**Blocked by:** 05, 06, 20
**Files:** `.workflow/development.md`, `.workflow/omp-migration/implementation-plan.md`, focused M1 acceptance evidence

**Read first:** `.workflow/specs/omp-through-m3.md` M1/W2; tasks 04-06 and 20; revised authoritative M1 gate from task 02
**Covers:** W2

**Check:** One connected Host run exercises settings/themes/project, authenticated FS/Git/PTY and metadata restart; run `.workflow/bin/workflow validate --no-color`. Reuse task-local evidence for unchanged owners. Each required M1 item must be observed or explicitly accepted by the maintainer; an unresolved item keeps this gate task unarchived.

- [ ] Verify extraction preserved behavior, not merely imports.
- [ ] Prove extension package/build/release references are retired while external editor and theme import remain.
- [ ] Verify explicit credential migration results and no automatic startup credential reads.
- [ ] Record that legacy agent execution removal is deliberately blocked on the coordinated M3 cutover, as established in task 02; do not claim deletion happened in M1.
- [ ] Update development progress and only release task 07 when the revised M1 gate is met.
