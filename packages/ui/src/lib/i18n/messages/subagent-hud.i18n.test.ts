import { describe, expect, test } from 'bun:test';
import { subagentHudI18n } from './subagent-hud.i18n';

const locales = ['de', 'fr', 'nl', 'es', 'ja', 'pt-BR', 'uk', 'ko', 'pl', 'zh-CN', 'zh-TW', 'tr', 'ar', 'he'] as const;

describe('subagentHudI18n', () => {
  test('provides every key in every supported locale, translated', () => {
    const english: Record<string, string> = subagentHudI18n.en;
    const keys = Object.keys(english);
    for (const locale of locales) {
      const translated: Record<string, string> = subagentHudI18n[locale];
      expect(Object.keys(translated).sort()).toEqual(keys.slice().sort());
      for (const key of keys) {
        expect(translated[key]?.trim()).toBeTruthy();
        expect(translated[key]).not.toBe('');
      }
    }
  });
});
