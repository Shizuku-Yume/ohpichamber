# 12: Add catalogs, skills, completion and Guest Shell projections

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Agent Service commands expose verified OMP model/provider/agent/MCP/skill configuration, stateless text/structured completion and the shell owner established by task 01. Service-owned skill expansion uses the verified SDK builder; a lower-level fixture's slash limitation does not retire product commands.

**Blocked by:** 09
**Files:** `packages/agent-service/src/catalogs/`, `packages/agent-service/src/shell/`, contract fixtures, host proxy routes and tests

**Read first:** `.workflow/specs/omp-through-m3.md` M2/W6; M0 capability/provider/MCP/skills artifacts and tasks 25/26; OMP model registry, AuthStorage, MCP and AsyncJobManager sources; contracts catalogs/completion/shell and MCP/skills apply boundaries
**Covers:** W6

**Check:** `bun test packages/agent-service/src/catalogs packages/agent-service/src/shell` plus a temporary authenticated service scenario → catalog/config writes and reads are scoped/redacted, stateless completion supports cancellation/provider errors, shell start/output/status/stop/reconnect obey ownership and output bounds, and MCP reconnect is explicit. Record commands and remove temporary smoke code.

- [ ] Project model/provider/auth capability data without returning credentials or SDK objects.
- [ ] Implement retained configuration mutations, agent profiles and stateless text/structured completion, not read-only catalogs or tab-completion stand-ins.
- [ ] Implement retained MCP enable/disable, changed configuration/schema, HTTP/SSE/OAuth and explicit reconnect. Scoped apply/fan-out follows the contract across independent root workers; persistence alone is not applied-runtime success, and partial failure preserves successful siblings.
- [ ] Build and inject the supported skill prompt at the service boundary.
- [ ] Map AsyncJobManager states/output retention to Guest Shell with bounded tails and ownership checks.
- [ ] Keep one failed provider, MCP server or job from erasing unrelated complete results.
