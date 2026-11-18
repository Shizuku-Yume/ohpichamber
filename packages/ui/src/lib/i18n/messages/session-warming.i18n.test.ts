import { describe, expect, test } from 'bun:test';

import { sessionWarmingI18n } from './session-warming.i18n';

const locales = ['en', 'de', 'fr', 'nl', 'es', 'ja', 'pt-BR', 'uk', 'ko', 'pl', 'zh-CN', 'zh-TW', 'tr', 'ar', 'he'] as const;

describe('session warming translations', () => {
  test('all 15 locales exist with exact key parity and real translations', () => {
    expect(Object.keys(sessionWarmingI18n).sort()).toEqual([...locales].sort());
    const english = Object.entries(sessionWarmingI18n.en);

    for (const locale of locales) {
      const dictionary = new Map<string, string>(Object.entries(sessionWarmingI18n[locale]));
      expect([...dictionary.keys()].sort()).toEqual(english.map(([key]) => key).sort());

      for (const [key, englishText] of english) {
        const value = dictionary.get(key);
        expect(value?.trim()).toBeTruthy();
        expect(value).not.toMatch(/opencode/i);
        if (locale !== 'en') {
          expect(`${locale} ${key}: ${value}`).not.toBe(`${locale} ${key}: ${englishText}`);
        }
      }

      expect(dictionary.get('settings.openchamber.defaults.sessionWarming.inherit')).toContain('{mode}');
    }
  });
});
