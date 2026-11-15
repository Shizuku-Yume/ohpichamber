# 06: OhPiChamber in every user-facing string

**Effort:** rebrand
**Blocked by:** 05, ux-feedback-2026-11-15/13
**Covers:** W7, W8
**Files:** `packages/ui/src/lib/i18n/messages/*`, About credit in `AboutSettings.tsx`, CLI help and output under `packages/web/bin/`, notifications, Electron menus and dialogs, `README.md`, `packages/docs/`, `docs/`, package READMEs
**Read first:** spec `rebrand.md` "Name in copy" and "Copy (phase B)"; skill `locale-ui-patterns`; `decisions.md: 2026-11-16 - Rebrand in two phases around the open UX effort`
**Check:** a script over the built locale catalogs finds no `OpenChamber` outside the About credit key. Screenshots of Settings → About (credit "Based on OpenChamber" with the MIT notice), the sidebar empty state and `ohpichamber --help` show OhPiChamber. `bun run type-check`, `bun run lint`, `VITEST_MAX_WORKERS=2 bun run test`, `bun run docs:validate` and `bun run dead-code` (report inspected) exit 0. Receipts go to `/home/shizuku/Project/ohpichamber-omp-artifacts/rebrand-06-<date>/`.

- [ ] A scripted pass replaces the product name in all locale files. Each locale's inflected or transliterated forms are reviewed by hand, and the script does not touch keys, identifiers or `OPENCHAMBER_*`.
- [ ] Non-i18n strings are edited by hand.
- [ ] A new About credit key in every locale.
- [ ] README and product docs say OhPiChamber. Historical changelog sections stay.
