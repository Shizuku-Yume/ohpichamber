# 37: Create first-use project plugin registry directories

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** A native OMP marketplace plugin can install with project scope into a fresh workspace before `.omp/plugins/` exists; the first registry write creates its parent directories and commits the install.

**Blocked by:** None
**Files:** `vendor/omp/c9de2b02/patches/`; `package.json` patchedDependencies; `bun.lock`; `packages/agent-service/src/worker/catalog-plugins.test.ts`

**Read first:** `.workflow/specs/post-m3-hardening.md` H1 and Landing rules; `vendor/omp/c9de2b02/README.md`; pinned `@oh-my-pi/pi-coding-agent` registry writer and project-registry resolver; Agent Service native plugin route.
**Covers:** H1

**Check:** Run the fresh-workspace project-scope marketplace-install regression in `packages/agent-service/src/worker/catalog-plugins.test.ts`. Before the patch it fails because `Bun.write` gets `ENOENT` for `.omp/plugins/installed_plugins.json.tmp`; after the patch it installs successfully and the nested registry contains the expected project plugin entry. Then run `bun run test` on the assembled candidate using `TMPDIR=/tmp`; all seven suites must pass.

## Done when

- [ ] The pinned SDK patch recursively creates the registry parent before writing the temporary registry file; tarball bytes and source identity remain unchanged.
- [ ] A regression exercises a first project-scoped marketplace install in a fresh workspace with no `.omp/` directory and asserts the registry content.
- [ ] The focused Agent Service regression passes, and the assembled seven-suite root gate passes with a same-device temporary directory.
- [ ] Documentation and evidence record the SDK contract defect and the exact pinned package patch.

## Progress
Effort reopened: this follow-up assigns the pinned SDK defect exposed by the assembled Task19/20 gate; the effort status is now `in progress`.
Integration candidate at `/home/shizuku/Project/ohpichamber-worktrees/post-m3-hardening-final` reproduced the root gate failure at `packages/agent-service/src/worker/catalog-plugins.test.ts:170`: a fresh project-scope marketplace install returns generic `INVALID_REQUEST` because the pinned SDK registry writer attempts `Bun.write(<cwd>/.omp/plugins/installed_plugins.json.tmp)` without creating its parent. The SDK resolver contract says the first project-registry write creates that tree. The Web `EXDEV` failure was isolated to the candidate gate's `TMPDIR` being on device 53 while the test's socket originated on `/tmp` device 54; `TMPDIR=/tmp` passes the focused Web test. Root gate evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-integration-2026-10-24/root-test.log`.

The main worktree has unrelated user changes in `.workflow/tasks/post-m3-hardening/13-non-linux-process-cleanup.md`, `packages/agent-service/src/sessions/registry.ts`, and the existing Host route files. Do not stage or commit them. The route changes are separate from this SDK registry fix.

No implementation changes have started. Next: create task branch/worktree from the landing branch after this task file is committed, patch the SDK using the existing `bun patch --commit --ignore-scripts` mechanism, add the fresh-project regression, then rerun the focused test, root gate with `TMPDIR=/tmp`, docs/workflow checks, and exact A/B review. Do not land until all final-candidate checks pass.