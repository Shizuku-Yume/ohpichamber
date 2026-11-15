# 08: Rebuild the OMP settings page as four ordered tabs with plain copy

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 07
**Covers:** W6
**Files:** `packages/agent-service/src/worker/{settings-ui.ts,settings-ui.test.ts}`, `packages/ui/src/components/sections/openchamber/{OmpSettingsPage.tsx,ompSettingsLayout.ts}` (new) and its test, `packages/ui/src/components/sections/shared/{OmpRowControl.tsx,ompRowHelpers.ts}`, `packages/ui/src/lib/i18n/messages/omp-settings.i18n.ts`, `packages/ui/src/lib/settings/search.ts`, `scripts/lib/upstream-gaps/audit-settings.mjs`
**Read first:** spec "How it is built → OMP page"; `research/feedback-2026-11-15/OmpSettingsIA.md` in full (Appendix B is the starting layout); `decisions.md` 2026-11-15 "The OMP settings page has four tabs…" and the 2026-11-14 placement decisions; `.agents/skills/locale-ui-patterns/SKILL.md`; Chat's tab strip (`ChatSettings.tsx`, `chatSettingsTabs.ts`)
**Check:** `bun test packages/agent-service/src/worker/settings-ui.test.ts packages/agent-service/src/worker/catalog-settings.test.ts` and the new layout test exit 0: every exposed engine id appears exactly once across the four tabs, every tab/group/option key exists in 15 locales, every number row with options has option copy, `providers.autoThinkingMaxEffort` hides unless `defaultThinkingLevel` is `auto`, and the search table has one entry per exposed id. Real path (zh-CN): each tab shows no English chip and no unitless timeout; the 激进 (Aggressive) preset writes the four `read.summarize.*` keys to `config.yml`; searching "超时" (timeout) opens the right tab and row; `dev.autoqa` is absent from state and refused on write.

- [ ] `ompSettingsLayout.ts` orders 常用 (Common) / 编辑与读取 (Editing & reading) / 执行与工具 (Execution & tools) / 高级 (Advanced), impact-first; 高级 holds only internal tuning and ends with the config.yml footer under its own key, its count split by reason.
- [ ] Five terminal-presentation rows become `tui-only`; `dev.autoqa` and `spotlight.experiment.enabled` become `boundary`; `CONDITIONS` gains `autoThinkingActive`.
- [ ] The read-summary preset (关闭 Off / 平衡 Balanced / 激进 Aggressive / 自定义 Custom) writes four keys in one `PATCH`; the four knobs stay editable in 高级.
- [ ] Units cover `Ms`, `Bytes` (as KB), `Lines` and `Columns`; option labels and descriptions are localized; `-1` shows its real meaning ("unlimited" where it means that).
- [ ] Every row has a plain-language label and one-line description in all 15 locales; jargon descriptions are rewritten at the English source.
- [ ] Search entries are generated from the layout table and open the right tab; the last-used tab is remembered.
- [ ] The tab strip uses the existing settings tab idiom; the "Discovery & MCP" section title bug is gone.
