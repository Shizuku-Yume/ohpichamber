# 30: Verify non-Linux and macOS worker resources

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** <commit-sha>
**Disposition:** withdrawn as a mandatory M0 prerequisite by the maintainer; no platform probe ran and no platform behavior is marked passed.
**Finished:** 2026-10-12

**Delivers:** Actual worker resource and lifecycle evidence for every required non-Linux/macOS target, or a precise platform-unavailable blocker. Linux measurements and the accepted Linux limitation are not reused as cross-platform evidence.

**Blocked by:** 28
**Files:** `.workflow/omp-migration/m0/platform-worker-resources.json`; this task; disposable external platform runner/process state only

**Read first:** `.workflow/specs/omp-through-m3.md` M0/W1; `.workflow/omp-migration/architecture.md` ADR-03 and worker topology; `.workflow/omp-migration/implementation-plan.md` evidence boundaries; existing `.workflow/omp-migration/m0/isolation-artifact.json`; archived task 01 and the maintainer decision accepting the Linux memory limitation
**Covers:** W1

**Check:** Run the existing dedicated-worker isolation/resource scenario on each required non-Linux/macOS platform using the pinned OMP source-derived inputs and the same bounded cases: worker-local cwd/environment, sibling isolation, startup/idle/active RSS, cleanup and process exit. Record platform-specific pass, fail, partial or unavailable outcomes with exact timeout/exit and measurement units. If a platform runner is not available, record that boundary as unavailable with the missing prerequisite; do not infer behavior from Linux, a source read, emulation or a stand-in.

- [ ] Use a real supported platform runner and immutable package/source inputs; no application or dependency edits.
- [ ] Preserve the dedicated-worker architecture; do not remove isolation or lower the failed 100 MiB target to manufacture a pass.
- [ ] Measure the same resource phases and lifecycle boundaries on each required target, with platform identity and sampling method recorded.
- [ ] Keep unrelated siblings and owned cleanup distinct; retain leftovers and signal failures before final teardown.
- [ ] Sanitize paths, environment values and process arguments; remove disposable workers and scratch state after capture.
- [ ] Keep M2 service-resource measurements and Host Gatekeeper overhead separate from this SDK worker evidence.
- [ ] Parent reviews and archives the investigation; unavailable platform access keeps M0 paused and does not release M1.

## Unverified boundary

- Local execution is Linux x64; `ssh://` reports no configured tool hosts. Local SSH metadata and declared CI workflows did not establish any authorized, reachable macOS/Windows runner. No remote connection or CI dispatch was attempted, and remote operating systems are not independently verified.
- The existing runner refuses non-Linux at `scripts/omp-m0/run.mjs:81`. Its resource sampler and cleanup owners use Linux `/proc`, subreaper and pidfd facilities; the existing script cannot produce non-Linux evidence unchanged.
- Missing prerequisite: access and execution authorization for a real target-platform runner, with target-appropriate measurement/cleanup and matching pinned SDK/native inputs. Platform resources and lifecycle remain unmeasured. No stand-in, Linux rerun, new abstraction or platform-pass claim is added.

- The maintainer removed the task-30 pass requirement in `decisions.md: 2026-10-12 - Leave unavailable platform evidence outside the M0 release condition`. The investigation closes at runner availability only; platform resource, isolation and cleanup outcomes stay unverified, with retained-surface certification still governed by the migration scope.
