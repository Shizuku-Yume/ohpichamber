# 08: Build the supervised Agent Service and isolated workers

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** A Bun Agent Service supervisor starts, health-checks, stops and restarts dedicated per-session/workspace SDK workers with authenticated loopback transport and cleanup of owned children.

**Blocked by:** 07
**Files:** `packages/agent-service/`, `packages/web/server/lib/host/agent-service-supervisor.js`, service tests and package documentation

**Read first:** `.workflow/specs/omp-through-m3.md` M2/W3; architecture process and security sections; `packages/web/server/lib/guests/service.js`; extracted managed-process registry; OMP SDK and worker entrypoints; SDK identity/path artifacts from task 19 and installed-source artifact inputs from task 24
**Covers:** W3

**Check:** `bun test packages/agent-service` and focused Host supervisor tests via `node scripts/run-isolated-tests.mjs packages/web/server/lib/host`, plus a temporary real supervisor run → service binds privately, rejects incorrect internal auth, starts an isolated worker, reports readiness, restarts it, and leaves no owned child after stop. Record concrete commands and remove temporary smoke code.

- [ ] Keep SDK imports and SDK registry/session objects inside worker processes.
- [ ] Install the source-derived SDK closure verified by task 24 through reproducible package inputs. Preserve first-party artifact/hash bindings and required third-party/native resolutions; do not select divergent registry packages merely because their version matches. Runtime SDK imports must resolve inside the service installation, not an operator's external source checkout.
- [ ] Allocate one worker identity per active session/workspace scope and preserve process cwd/env isolation.
- [ ] Use loopback or Unix-socket binding only, internal secret injection, bounded startup/stop timeouts and orphan cleanup.
- [ ] Make health reflect worker/service readiness rather than a process PID alone.
- [ ] Record measured RSS and restart evidence against the resource decision accepted at task 03. Any unmet accepted target keeps the gate open.
