# 06: OhPiChamber in every user-facing string

**Effort:** rebrand
**Blocked by:** 05, ux-feedback-2026-11-15/13
**Covers:** W7, W8
**Files:** `packages/ui/src/lib/i18n/messages/*`, About credit in `AboutSettings.tsx`, CLI help and output under `packages/web/bin/`, notifications, Electron menus and dialogs, `README.md`, `packages/docs/`, `docs/`, package READMEs
**Read first:** spec `rebrand.md` "Name in copy" and "Copy (phase B)"; skill `locale-ui-patterns`; `decisions.md: 2026-11-16 - Rebrand in two phases around the open UX effort`
**Check:** a script over the built locale catalogs finds no `OpenChamber` outside the About credit key. Screenshots of Settings → About (credit "Based on OpenChamber" with the MIT notice), the sidebar empty state and `ohpichamber --help` show OhPiChamber. `bun run type-check`, `bun run lint`, `VITEST_MAX_WORKERS=2 bun run test`, `bun run docs:validate` and `bun run dead-code` (report inspected) exit 0. Receipts go to `/home/shizuku/Project/ohpichamber-omp-artifacts/rebrand-06-<date>/`.
**Base commit:** 79c262dee0ad7f367fbb30eb046c84c39467bd3c

- [x] A scripted pass replaces the product name in all locale files. Each locale's inflected or transliterated forms are reviewed by hand, and the script does not touch keys, identifiers or `OPENCHAMBER_*`.
- [x] Non-i18n strings are edited by hand.
- [x] A new About credit key in every locale.
- [x] README and product docs say OhPiChamber. Historical changelog sections stay.
- [x] Update remaining `openchamber.dev` and `openchamber/openchamber` links in `packages/docs/` to `Shizuku-Yume/ohpichamber`.

## Progress

- **Decisions & scope:** added `settings.openchamber.about.credit` ("Based on OpenChamber") and `settings.openchamber.about.creditLicense` (MIT notice) across all 15 `<locale>.ts` catalogs, rendered in both `AboutSettings.tsx` and desktop `AboutDialog.tsx`. Kept `OpenChamber` in code identifiers, `OPENCHAMBER_*` env vars, `@openchamber/*` workspace packages, `X-OpenChamber-*` headers, enterprise policy paths, `.openchamber/` repo dirs, `ssh-manager.mjs` log lines parsed by `local-files.js`, quota `User-Agent` headers, and theme `author` credits (`metadata.description` updated to `OhPiChamber`). Fixed Phase A leftovers found during copy cleanup: Windows artifact names in `packages/electron/scripts/finalize-latest-yml.mjs`, `packages/electron/scripts/windows-signpath.mjs`, and `.github/workflows/{release,release-desktop-smoke}.yml` after `productName: OhPiChamber`, and updated `scripts/install.sh` to drop the removed `ohpichamber update` call in favor of package-manager `@latest` instructions. Known follow-up logged in `.workflow/technical-debt.md` ("Security docs enterprise mode still mentions update checks"): `packages/docs/content/docs/security.mdx` (and localized copies) still says "Update checks keep running" although Phase A removed update checks.
- **Check after:** PASS (receipts in `/home/shizuku/Project/ohpichamber-omp-artifacts/rebrand-06-2026-11-18/`):
  - **Locale & built catalog audit (`audit-locale-catalogs.txt`):** PASS across all 15 runtime catalogs and 1,308 emitted JS files under `packages/web/dist` (`0` unexpected `OpenChamber` values; only `settings.openchamber.about.credit` and `.openchamber/` repo paths remain).
  - **Screenshots (`screenshots/`):** `settings-about-en.png`, `settings-about-ja.png`, `sidebar-empty-en.png`, and `ohpichamber-help.png` (`ohpichamber-help.txt`) show `OhPiChamber` and the localized "Based on OpenChamber" / MIT credit.
  - **Gates & suites (`gates/*-final.log`, all exit `0`):** `check` (`5/5`), `type-check`, `lint` (`0` warnings across 7 workspaces), `dead-code` (`0` findings), `docs:validate` (`696` pages, `58` sidebar links), root `test` (`7/7` suites: scripts `31/31`, sdk `32/32`, ui `1250/1250`, agent-contract `270/0`, agent-service `606/0`, electron `69/69`, web `526` files / `8525` tests), and `workflow validate` (`328` task files), plus `bun test` (`6 pass`) and `oxlint` (`0` warnings) on `zeroCodeTracker.test.tsx` after reverting its 3 formatting-only hunks.
- **Review:** pass (base 79c262dee0ad7f367fbb30eb046c84c39467bd3c) — independent review (`review-independent.md`) 0 blockers after resolving all 7 major findings and 16-file formatting churn, plus reverting the remaining 3 formatting-only hunks in `zeroCodeTracker.test.tsx`; 3 dedicated locale reviews (`review-R1.md`, `review-R2.md`, `review-R3.md`) across all 15 locales.
