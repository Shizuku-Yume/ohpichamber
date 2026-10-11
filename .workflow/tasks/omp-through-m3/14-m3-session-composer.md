# 14: Migrate session, composer and interactive UI flows

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Main session view, composer, session actions, approval/question dialogs and live status consume Canonical Client events and service-owned state through the shared sync model.

**Blocked by:** 10, 13
**Files:** `packages/ui/src/session/`, `packages/ui/src/components/`, `packages/ui/src/stores/`, `packages/ui/src/sync/`, focused UI tests and documentation

**Read first:** `.workflow/specs/omp-through-m3.md` M3/W4/W8; UI session/composer/action consumers; contracts interaction/event sections; sync-state invariants and locale/theme skills; existing component test conventions
**Covers:** W4, W8

**Check:** Use the repository isolated runner on affected session/composer/interaction test directories, then observe the actual connected UI → prompt attachments, reasoning/tool/terminal output, abort/retry/steering/follow-up, CAS conflict and reconnect/reset all use canonical state. Record exact directories and launch command in Progress; static fixtures alone cannot satisfy the visible-flow check.

- [ ] Replace session and composer agent calls with the Canonical Client.
- [ ] Render pending approval/question versions and handle stale-answer errors without optimistic overwrite.
- [ ] Keep live activity derived from live channels, not persisted history.
- [ ] Preserve partial output and unrelated session state on one request failure.
- [ ] Update only necessary user-facing strings through the locale pattern and keep controls accessible.
