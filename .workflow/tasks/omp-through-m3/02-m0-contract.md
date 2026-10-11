# 02: Reconcile and freeze the M0 contract facts

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Migration documents distinguish verified OMP facts, Agent Service responsibilities and remaining M0 unknowns, with no draft contract claim contradicted by current evidence.

**Blocked by:** 01, 19, 24
**Files:** `.workflow/omp-migration/contracts.md`, `.workflow/omp-migration/architecture.md`, `.workflow/omp-migration/implementation-plan.md`, `.workflow/development.md`, `.workflow/decisions.md`

**Read first:** `.workflow/specs/omp-through-m3.md` M0 section and W1; task 01 artifact; task 19 identity/path findings and task 24 installed-source evidence; existing `.workflow/omp-migration/m0/*.json`; `contracts.md` event/cursor, approval, MCP, skills and Guest Shell sections; `architecture.md` ADR-03 and resource assumptions
**Covers:** W1

**Check:** `bun run docs:validate && .workflow/bin/workflow validate --no-color` → both pass; the documents identify the exercised SDK, Guest Shell owner, worker RSS evidence, CAS ownership, MCP reconnect semantics, skill expansion boundary and explicit unresolved gates.

- [ ] Reconcile the new Guest Shell artifact with the contract without copying OpenCode shell routes or shapes.
- [ ] Mark Agent Service CAS, restart invalidation, cursor recovery and MCP reconnect as service-owned where OMP does not provide them.
- [ ] Retain the failed 100 MiB worker target and measured RSS. A new accepted resource target requires a maintainer decision or measured design improvement; do not relabel the failure.
- [ ] Correct public DTO/document claims that expose absolute directories or assert unobserved transport behavior.
- [ ] Resolve RFC 7807 versus custom error envelope, question CAS versions, snapshot/cursor atomicity, canonical event names and host metadata ownership explicitly.
- [ ] Correct milestone execution order so host extraction precedes removal, server consumers cut over before activation, and lifecycle/proxy deletion waits for the coordinated OMP-only cutover. Preserve every retained acceptance requirement with its true owner.
- [ ] Update development progress and the implementation gate without claiming unavailable platform evidence.
- [ ] Add a decision entry only for a hard-to-reverse choice not already owned by the migration hierarchy.
