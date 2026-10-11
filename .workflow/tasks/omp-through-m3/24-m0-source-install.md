# 24: Verify an installable SDK from the pinned source

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** <commit-sha>
**Question:** Can the selected `c9de2b02` SDK and its first-party dependency closure be installed outside the source checkout without selecting the divergent registry packages?
**Time box:** One pinned-source package set and one isolated consumer. Do not repeat unchanged SDK suites or investigate another revision.

**Delivers:** A source-backed installation record identifies the exact runnable SDK artifact set, its authored-source coverage, generated/native inputs and any unresolved installation differences before the M0 contract freezes.

**Blocked by:** 19
**Files:** `.workflow/omp-migration/m0/source-install.json`; temporary build/consumer directories; retained immutable package inputs outside the application source tree

**Read first:** `.workflow/specs/omp-through-m3.md` M0/W1; task 19 artifacts and findings; `source-identity.json`; pinned OMP `scripts/install-tests/run-ci.sh` tarball section, `scripts/ci-release-publish.ts` manifest helpers and `packages/coding-agent/package.json`
**Covers:** W1

**Check:** In a disposable copy of the already-selected source, follow the upstream tarball packaging procedure for the SDK's first-party closure and the exercised Linux native leaf. Install the local artifacts into a fresh consumer with explicit first-party bindings. Compare installed authored bytes and runtime entrypoints against the pinned input, record dependency/native/generated hashes, then exercise the actual public SDK session factory and disposal plus a real native operation under an isolated HOME. Record exact commands, observations and cleanup in `source-install.json`. Imports alone are not runtime acceptance. A required mismatch or missing build input remains a gate.

- [ ] Preserve the external source checkout. Packaging helpers and prepack hooks may mutate only the disposable copy.
- [ ] Bind every required first-party package to the selected source-derived artifacts. Matching `18.8.9` declarations must not select registry siblings implicitly.
- [ ] Preserve and compare the exercised third-party dependency resolutions and lock inputs. Identify any changed owner before deciding which prior evidence can be reused.
- [ ] Record authored source, generated assets, native wrappers and prebuilt addon identities separately. Do not claim the existing prebuilt addon was compiled from `c9de2b02`.
- [ ] Prove installed SDK factory creation/disposal and a native operation without an external source-workspace runtime import, real user storage or credentials.
- [ ] Retain the immutable package inputs and their hashes for task 08. Keep throwaway build/consumer scripts off the application branch, remove their temporary state, and record a reproducible packaging recipe and retained input location.
- [ ] State precisely which prior SDK results remain reusable and which installation or runtime differences require new evidence. No M0 passage follows from a package filename or a version number.
