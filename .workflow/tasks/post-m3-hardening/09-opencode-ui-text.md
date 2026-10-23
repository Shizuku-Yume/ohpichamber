# 09: Stop naming OpenCode in user-visible text

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** The composer and any other user-visible surface describe the Agent Service, not OpenCode, in every locale.

**Blocked by:** None
**Files:** `packages/ui/src/components/chat/composer/ui/ComposerFooter.tsx` (lines 92-104, prop `waitingForOpenCode`); `packages/ui/src/lib/i18n/messages/*.ts` (`chat.chatInput.waitingForOpenCode`, `chat.chatInput.waitingForOpenCodeHint`); any other key or literal found by search

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.workflow/STYLE.md` "Front-end text"
**Covers:** H7

**Check:** A search of `packages/ui/src` for user-visible "OpenCode" strings (excluding the VS Code theme import and external OpenCode Go provider names, which are legitimate) returns no engine references; the i18n tests pass; the composer waiting state shows the new text in the running UI.

## Done when

- [ ] Key renamed, not aliased, in all locales.
- [ ] Legitimate remaining mentions are listed in `## Progress` with the reason.
