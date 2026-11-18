import { create } from 'zustand';

import { dict as enDict, type I18nKey } from './messages/en';
import { subagentHudI18n } from './messages/subagent-hud.i18n';
import { timelineNoticesI18n } from './messages/timeline-notices.i18n';
import { DEFAULT_LOCALE, detectInitialLocale, type Locale, writeStoredLocale } from './runtime';
import { hasRightToLeftText, isolateInsertedText } from './textDirection';

export type I18nParams = Record<string, string | number | boolean | null | undefined>;
export type I18nDictionary = Record<I18nKey, string>;

type I18nState = {
  locale: Locale;
  dictionary: I18nDictionary;
  loadingLocale: Locale | null;
  setLocale: (locale: Locale) => void;
};

const dictionaries = new Map<Locale, I18nDictionary>([[DEFAULT_LOCALE, enDict]]);

export function resetI18nDictionaryCacheForTests(): void {
  dictionaries.clear();
  dictionaries.set(DEFAULT_LOCALE, enDict);
}

async function loadDictionary(locale: Locale): Promise<I18nDictionary> {
  const cached = dictionaries.get(locale);
  if (cached) {
    return cached;
  }

  /*
    The dictionaries are runtime-selected. We cast the import result to I18nDictionary,
    as the module structure is guaranteed to contain a 'dict' of type I18nDictionary.
  */
  const moduleResult = await (async () => {
    switch (locale) {
      case 'zh-CN': return import('./messages/zh-CN');
      case 'fr': return import('./messages/fr');
      case 'nl': return import('./messages/nl');
      case 'zh-TW': return import('./messages/zh-TW');
      case 'es': return import('./messages/es');
      case 'pt-BR': return import('./messages/pt-BR');
      case 'uk': return import('./messages/uk');
      case 'ko': return import('./messages/ko');
      case 'pl': return import('./messages/pl');
      case 'de': return import('./messages/de');
      case 'ja': return import('./messages/ja');
      case 'tr': return import('./messages/tr');
      case 'ar': return import('./messages/ar');
      case 'he': return import('./messages/he');
      default: return import('./messages/en');
    }
  })();
  const mod = moduleResult as { dict: I18nDictionary };
  const subagentDict = subagentHudI18n[locale] ?? subagentHudI18n.en;
  /* SAFETY: timelineNoticesI18n structure is Record<string, Record<string, string>>. */
  const noticeDict = (timelineNoticesI18n as Record<string, Record<string, string>>)[locale] ?? timelineNoticesI18n.en;

  /* SAFETY: The merged dictionary follows the I18nDictionary contract. */
  const fullDict = { ...mod.dict, ...subagentDict, ...noticeDict };
  dictionaries.set(locale, fullDict);
  return fullDict;
}

export const useI18nStore = create<I18nState>()((set, get) => ({
  locale: DEFAULT_LOCALE,
  dictionary: enDict,
  loadingLocale: null,
  setLocale: (locale) => {
    const current = get();
    const cached = dictionaries.get(locale);
    if (current.locale === locale && current.loadingLocale !== locale && cached) {
      return;
    }

    writeStoredLocale(locale);

    set({
      locale,
      dictionary: cached ?? current.dictionary,
      loadingLocale: cached ? null : locale,
    });

    if (cached) {
      return;
    }

    void loadDictionary(locale).then((dictionary) => {
      if (get().locale !== locale) {
        return;
      }
      set({ dictionary, loadingLocale: null });
    }).catch((error) => {
      console.error(`[i18n] failed to load locale ${locale}`, error);
      if (get().locale === locale) {
        set({ dictionary: enDict, loadingLocale: null });
      }
    });
  },
}));

export function initializeLocale(): void {
  useI18nStore.getState().setLocale(detectInitialLocale());
}

export function formatMessage(dictionary: I18nDictionary, key: I18nKey, params?: I18nParams): string {
  const template = dictionary[key] ?? enDict[key] ?? key;
  if (!params) {
    return template;
  }

  const sentenceHasRightToLeft = hasRightToLeftText(template);
  return template.replace(/\{([^{}]+)\}/g, (match, rawKey) => {
    const value = params[rawKey.trim()];
    if (value === null || value === undefined) return match;
    // Numbers have no direction of their own, even written as 1e-7 or NaN;
    // only strings come back from String() unchanged.
    const text = String(value);
    return text === value ? isolateInsertedText(text, sentenceHasRightToLeft) : text;
  });
}

export type { I18nKey, Locale };
