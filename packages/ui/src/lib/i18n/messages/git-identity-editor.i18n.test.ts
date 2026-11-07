import { describe, expect, test } from 'bun:test';

import { gitIdentityEditorI18n } from './git-identity-editor.i18n';

const locales = ['en', 'de', 'fr', 'nl', 'es', 'ja', 'pt-BR', 'uk', 'ko', 'pl', 'zh-CN', 'zh-TW', 'tr', 'ar', 'he'] as const;

describe('Git identity editor and Git settings translations', () => {
  test('every locale has every key, translated', () => {
    const english = Object.entries(gitIdentityEditorI18n.en);
    for (const locale of locales) {
      const dictionary = new Map<string, string>(Object.entries(gitIdentityEditorI18n[locale]));
      expect([...dictionary.keys()].sort()).toEqual(english.map(([key]) => key).sort());
      for (const [key, englishText] of english) {
        expect(dictionary.get(key)?.trim()).toBeTruthy();
        if (locale !== 'en') {
          expect(`${locale} ${key}: ${dictionary.get(key)}`).not.toBe(`${locale} ${key}: ${englishText}`);
        }
      }
    }
  });

  test('the commit-message controls are translated on every surface key they share', () => {
    // The four Git settings checkboxes and the partial-commit warnings live in
    // this module so the settings page and the commit panel resolve them from
    // the same dictionary.
    const keys = [
      'settings.openchamber.git.commitGeneration.title',
      'settings.openchamber.git.commitGeneration.generateMessages.label',
      'settings.openchamber.git.commitGeneration.generateMessages.desc',
      'settings.openchamber.git.commitGeneration.reasoning.label',
      'settings.openchamber.git.commitGeneration.reasoning.desc',
      'settings.openchamber.git.commitGeneration.notes.label',
      'settings.openchamber.git.commitGeneration.notes.desc',
      'settings.openchamber.git.commitGeneration.changeId.label',
      'settings.openchamber.git.commitGeneration.changeId.desc',
      'gitView.toast.commitExtrasChangeId',
      'gitView.toast.commitExtrasNotes',
      'gitView.toast.commitExtrasBoth',
    ] as const;
    for (const key of keys) {
      expect(gitIdentityEditorI18n.en[key]).toBeTruthy();
      for (const locale of locales) {
        const dictionary = gitIdentityEditorI18n[locale] as Record<string, string>;
        expect(dictionary[key]?.trim()).toBeTruthy();
        if (locale !== 'en') {
          expect(`${locale} ${key}: ${dictionary[key]}`).not.toBe(`${locale} ${key}: ${gitIdentityEditorI18n.en[key]}`);
        }
      }
    }
  });
});
