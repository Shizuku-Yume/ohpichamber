import { describe, expect, test } from 'bun:test';

import { agentToolPermissionsI18n } from './agent-tool-permissions.i18n';

const ALL_LOCALES = [
  'en',
  'de',
  'es',
  'fr',
  'ja',
  'ko',
  'nl',
  'pl',
  'pt-BR',
  'tr',
  'uk',
  'zh-CN',
  'zh-TW',
  'ar',
  'he',
] as const;

describe('agentToolPermissionsI18n', () => {
  test('all 15 locales exist with exact 95-key parity against en', () => {
    expect(Object.keys(agentToolPermissionsI18n).sort()).toEqual([...ALL_LOCALES].sort());
    const enKeys = Object.keys(agentToolPermissionsI18n.en).sort();
    expect(enKeys).toHaveLength(95);

    for (const locale of ALL_LOCALES) {
      const dict = agentToolPermissionsI18n[locale];
      expect(Object.keys(dict).sort()).toEqual(enKeys);
      for (const key of enKeys) {
        const value = dict[key as keyof typeof dict];
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('placeholders match en in every locale', () => {
    const placeholderKeys: Array<{ key: keyof typeof agentToolPermissionsI18n.en; placeholders: string[] }> = [
      { key: 'settings.agents.page.toolPermissions.summary.enabledCount', placeholders: ['{enabled}', '{total}'] },
      { key: 'settings.agents.page.toolPermissions.selectedCount', placeholders: ['{selected}', '{total}'] },
      { key: 'settings.agents.page.toolPermissions.toggleGroupAria', placeholders: ['{group}'] },
    ];

    for (const locale of ALL_LOCALES) {
      const dict = agentToolPermissionsI18n[locale];
      for (const { key, placeholders } of placeholderKeys) {
        for (const ph of placeholders) {
          expect(dict[key]).toContain(ph);
        }
      }
    }
  });

  test('non-English locales translate core action and header labels without Show all / Hide all', () => {
    const translatedKeys: Array<keyof typeof agentToolPermissionsI18n.en> = [
      'settings.agents.page.toolPermissions.quickActions.all',
      'settings.agents.page.toolPermissions.quickActions.none',
      'settings.agents.page.toolPermissions.summary.default',
      'settings.agents.page.toolPermissions.mode.label',
    ];

    for (const locale of ALL_LOCALES) {
      if (locale === 'en') continue;
      const dict = agentToolPermissionsI18n[locale];
      for (const key of translatedKeys) {
        expect(dict[key]).not.toBe(agentToolPermissionsI18n.en[key]);
      }
      for (const value of Object.values(dict)) {
        expect(value).not.toContain('Show all');
        expect(value).not.toContain('Hide all');
      }
    }
  });
});
