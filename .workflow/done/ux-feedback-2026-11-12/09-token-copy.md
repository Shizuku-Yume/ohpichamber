# 09: Chinese copy writes "Token"

**Effort:** ux-feedback-2026-11-12
**Blocked by:** None
**Covers:** W6
**Files:** `packages/ui/src/lib/i18n/messages/{zh-CN,zh-TW}*.ts` and the per-area `*.i18n.ts` files that carry zh strings
**Read first:** `research/feedback-2026-11-12/03-11-settings-parity.md` (item 11, wording); `decisions.md` 2026-11-13 "Chinese copy writes LLM tokens as 'Token'"; skill `locale-ui-patterns`
**Check:** a locale test fails when zh-CN or zh-TW uses "词元", "詞元" or "令牌" for LLM tokens (credential strings such as "访问令牌" stay allowed), and passes after; the i18n tests exit 0.
**Base commit:** 80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5

- [x] Replace "词元", "詞元" and token-sense "令牌" with "Token" in every zh-CN and zh-TW string, including goal budgets and usage.
- [x] Add the locale test.

## Progress

Check before: 5 failed in `bun test packages/ui/src/lib/i18n/chinese-token-copy.test.ts` (17 violations in zh-CN, 16 in zh-TW, 4 in zh-CN.settings, 3 in zh-TW.settings, 15 across per-area modules). Log saved to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task09/check-before.log`.

Check after: pass — `VITEST_MAX_WORKERS=2 bun test packages/ui/src/lib/i18n/chinese-token-copy.test.ts` (5 pass), `messages.test.ts` (14 pass), `node scripts/run-isolated-tests.mjs packages/ui/src/lib/i18n` (52/52 test files pass). Log saved to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task09/check-after.log`.

Review: pass (base 80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5) — reviewer subagent round 1 found lowercase `tokens` in `chat.modelControls.costPerMillion` which was resolved; round 2 approved with no merge-blocking issues.
