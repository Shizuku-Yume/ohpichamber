# 09: Chinese copy writes "Token"

**Effort:** ux-feedback-2026-11-12
**Blocked by:** None
**Covers:** W6
**Files:** `packages/ui/src/lib/i18n/messages/{zh-CN,zh-TW}*.ts` and the per-area `*.i18n.ts` files that carry zh strings
**Read first:** `research/feedback-2026-11-12/03-11-settings-parity.md` (item 11, wording); `decisions.md` 2026-11-13 "Chinese copy writes LLM tokens as 'Token'"; skill `locale-ui-patterns`
**Check:** a locale test fails when zh-CN or zh-TW uses "词元", "詞元" or "令牌" for LLM tokens (credential strings such as "访问令牌" stay allowed), and passes after; the i18n tests exit 0.

- [ ] Replace "词元", "詞元" and token-sense "令牌" with "Token" in every zh-CN and zh-TW string, including goal budgets and usage.
- [ ] Add the locale test.
