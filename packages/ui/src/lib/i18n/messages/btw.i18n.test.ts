import { describe, expect, test } from 'bun:test';
import { btwI18n } from './btw.i18n';

const locales = ['de', 'fr', 'nl', 'es', 'ja', 'pt-BR', 'uk', 'ko', 'pl', 'zh-CN', 'zh-TW', 'tr', 'ar', 'he'] as const;

describe('btw i18n coverage', () => {
  const englishKeys = Object.keys(btwI18n.en);

  for (const locale of locales) {
    test(`locale "${locale}" has all BTW keys translated`, () => {
      const dict = btwI18n[locale];
      expect(dict).toBeDefined();
      for (const key of englishKeys) {
        expect(dict[key as keyof typeof dict]).toBeDefined();
        expect(dict[key as keyof typeof dict]).not.toBe('');
      }
    });
  }

  test('every locale has every key, translated', () => {
    const english = Object.entries(btwI18n.en);
    for (const locale of locales) {
      const dictionary = new Map<string, string>(Object.entries(btwI18n[locale]));
      expect([...dictionary.keys()].sort()).toEqual(english.map(([key]) => key).sort());
      for (const [key, englishText] of english) {
        expect(dictionary.get(key)?.trim()).toBeTruthy();
        expect(`${locale} ${key}: ${dictionary.get(key)}`).not.toBe(`${locale} ${key}: ${englishText}`);
      }
    }
  });
});
