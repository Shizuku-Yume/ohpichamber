# 19: Verify installable SDK identity and default auth paths

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** 98deedb81
**Started:** 2026-10-11T13:43:56Z
**Finished:** 2026-10-11T14:15:52Z

**Delivers:** Answer to whether the installable OMP dependency matches the pinned source used by accepted M0 probes, and where default/XDG AuthStorage resolves independently of explicit overrides.

**Blocked by:** None
**Files:** `scripts/omp-m0/`, `.workflow/omp-migration/m0/sdk-install-identity.json`, `.workflow/omp-migration/m0/auth-paths.json`

**Read first:** `.workflow/specs/omp-through-m3.md` M0; `scripts/omp-m0/envelope.mjs`; `.workflow/omp-migration/m0/source-identity.json`; `scripts/omp-m0/capabilities.mjs` auth probe; OMP `packages/utils/src/dirs.ts`
**Covers:** W1

**Check:** In an isolated temporary HOME, compare the selected published package and its dependency/native-addon resolution with the pinned source identity. Run no-argument `getAgentDbPath()` with default and XDG environments in fresh processes, then compare explicit override separately. Record hashes, package entrypoints, redacted path labels and observed behavior in sanitized artifacts. Missing or different SDK bytes mean existing probes cannot be reused for that installable dependency without resolving the difference.

- [x] Limit the spike to one pinned dependency comparison and the default/XDG/override path cases. Do not add the application dependency here.
- [x] Record version, source identity and relevant entrypoint/dependency differences without equating matching version numbers with matching source.
- [x] Avoid real user AuthStorage and credentials; prove isolated default paths and database ownership.
- [x] State whether prior M0 artifacts can cover the selected dependency, and enumerate only invalidated probes if not.
- [x] Remove throwaway scaffolding, retaining the sanitized evidence and findings. Leave required unknowns unresolved rather than relabeling them.

## Progress

- Dirty at start: none in `/tmp/ohpi-m0-identity-20261011`, branch `omp-through-m3/19-m0-sdk-identity-paths`. Parent integration preserves unrelated assembled application changes.
- Check-before does not apply to this bounded spike. No application dependency changes, builds, permanent tests or old suite reruns were needed.
- Check after: package comparison recorded the authored-source mismatch. Ten final fresh-process auth cases exited 0; selected databases were absent before creation, became regular SQLite files with mode `0600` and effective-user ownership, and `AuthStorage.create(selectedPath)` and `close()` returned. No credential APIs or user storage were accessed.
- An initial disposable probe used an unsupported `getConfigRoot()` output projection and failed after create/close. The corrected projection used ten new isolated homes. The initial failures remain recorded, not labelled passed.
- Task-owned downloads, extraction, probes, homes, databases and caches were removed; cleanup exited 0 and the temporary directory was observed absent. External OMP source was not modified. Disposable probe source is retained only as sanitized evidence data, not executable application scaffolding.
- Artifact projection trim reused recorded JSON only. It keeps database/path labels and cache counts, identity/integrity hashes, changed exercised seams, commands, cleanup and limits without opaque cache-file listings or duplicated manifest maps.
- Requirements brief A passed with zero findings. Quality brief B passed for task 19 with zero findings. Both independently executed scoped comparisons against `98deedb81`; the security review also passed with zero findings after reading the captured full change set. The harness used the reviewer specialist with the workflow briefs because `workflow-reviewer` is unavailable. No observation or suite was rerun for review.
- Task 24 owns the newly identified source-derived installation prerequisite. This task answers the identity/path questions; it does not accept the divergent registry revision or close M0. Task 01's separate interrupted native-process cleanup blocker remains open.

## Findings

The installable `@oh-my-pi/pi-coding-agent@18.8.9` is not the pinned `c9de2b02b997f37cc89639282ed35dec86f139e8` source. The npm tarball SHA-256 is `2d326b842f3a282d8b09f12e7659665193e4d53194f0ccd3c3e8f9b79a7d5877`; its registry SHA-1 and SHA-512 integrity match. The decoded npm provenance payload identifies `fa5ff4a3a977a28b93d025f4cf50f046e019f18c`, and its subject digest matches the download. Signature trust was not independently verified. Authored byte differences prove the mismatch without relying on provenance trust.

Excluding only the already-declared generated tool-view file, coding-agent has 1,737 common `src` files, of which 156 differ; 19 exist only in the pinned tree and 11 only in the published package. Eleven direct first-party dependencies were also compared. AI has 33 changed common source files, agent-core 3, utils 3, catalog 23, TUI 41, mnemopi 9 and stats 1. Omptype, wire and snapcompact `src` files match. Native core has no `src` directory and is compared separately rather than claiming a zero-file source match.

The root runtime entrypoint remains `src/index.ts`, but published types point to `dist/types/index.d.ts` and the CLI to `dist/cli.js`, rather than the source CLI. Publish-time transformations do not explain authored changes in session/event/message owners, task execution, model registry, auth account/store/policy/refresh, completion dispatch and the OpenAI provider, extension approvals, questions or MCP. The identity artifact records affected prior probe IDs and paired hashes. Original SDK results remain valid for their exercised source, not the published package. Directly exercised skills loader, builtin discovery and capability index bytes match; their partial result and unproven changed dependency closure still prevent whole-package acceptance. Independent runner/process-group/pidfd evidence is not invalidated by SDK byte changes.

Both scopes loaded the Linux x64 modern native addon with SHA-256 `33710d1ac6830e068fb46db335e6e2f2e6175a343b267506cd8a31d72d52e059`. Source-tree resolution used `packages/natives/native/`; published resolution used the optional `pi-natives-linux-x64` package. Loader bytes match, but native `index.js` and declarations differ. Workspace loading bypasses release-stamp validation, and the accepted authored fingerprint excludes Rust and `native/*.js`. Identical existing prebuilt binaries do not prove a native build from `c9de2b02`. The baseline variant was hashed, not loaded.

For both source and published auth imports, the no-argument default is `<HOME>/.omp/agent/agent.db`. XDG config/data/cache variables alone leave it unchanged. With initialized XDG `omp` directories, it becomes `<XDG_DATA_HOME>/omp/agent.db`; XDG config does not select the database. `PI_CODING_AGENT_DIR` wins over initialized XDG paths. Explicit `getAgentDbPath(directory)` selects `<ARG_OVERRIDE>/agent.db` independently of the no-argument result. Dirs module bytes match; auth storage and SQLite credential owner bytes do not. Create/close observations establish paths and selected-file ownership, not credential conversion, provider authentication or restart behavior.

The pinned source has an upstream workspace packing procedure, but packing only coding-agent with existing `18.8.9` catalog values would select older registry siblings. [INFERENCE] A complete source-derived local artifact set could retain the pin by binding every first-party sibling to that snapshot, preserving third-party lock inputs and separately pinning generated/native inputs. This was not built or proven in task 19. Task 24 must resolve it before contract freeze and gate 03. Findings are also recorded in `.workflow/development.md`; no product decision was made.

