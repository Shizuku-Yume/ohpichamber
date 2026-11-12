import { describe, expect, test } from 'bun:test';

import { applyPlural, formatAgentStatus } from './agentStatus';
import type { I18nKey, I18nParams } from '@/lib/i18n';

const dictionary = new Map(Object.entries({
  'chat.agentStatus.retry.in': 'повторна спроба через {time}',
  'chat.agentStatus.working': 'працює',
  'chat.agentStatus.usingTool': 'використовує {name}',
  'chat.statusRow.modelStatus': '{model} {status}',
}));
const t = (key: I18nKey, params?: I18nParams): string => {
  const template = dictionary.get(key) ?? key;
  return params ? template.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match)) : template;
};

describe('applyPlural', () => {
  test('picks the locale\'s plural category and writes the number', () => {
    const template = '{count, plural, one {# файл} few {# файли} many {# файлів} other {# файлу}}';
    expect(applyPlural(template, 2, 'uk')).toBe('2 файли');
    expect(applyPlural(template, 5, 'uk')).toBe('5 файлів');
    expect(applyPlural(template, 21, 'uk')).toBe('21 файл');
  });

  test('an exact case wins, and other covers a missing category', () => {
    expect(applyPlural('{count, plural, =2 {both} other {# of them}}', 2, 'en')).toBe('both');
    expect(applyPlural('{count, plural, other {# files}}', 3, 'en')).toBe('3 files');
  });

  test('the number uses the locale\'s digits', () => {
    expect(applyPlural('{count, plural, other {#}}', 3, 'ar')).toBe(new Intl.NumberFormat('ar').format(3));
  });
});

describe('formatAgentStatus', () => {
  test('follows the model through the locale\'s template', () => {
    expect(formatAgentStatus(t, 'uk', { key: 'chat.agentStatus.working' }, 'Opus 5.5')).toBe('Opus 5.5 працює');
  });

  test('stands alone with a capital first letter without a model', () => {
    expect(formatAgentStatus(t, 'uk', { key: 'chat.agentStatus.working' }, null)).toBe('Працює');
    expect(formatAgentStatus(t, 'uk', { key: 'chat.agentStatus.retry.in', text: 'повторна спроба через {time}' }, '  ')).toBe('Повторна спроба через {time}');
  });

  test('a call\'s own text stands in for the dictionary phrase', () => {
    expect(formatAgentStatus(t, 'uk', { key: 'chat.agentStatus.usingTool', name: 'Read', text: 'Checking the parser' }, 'Opus 5.5'))
      .toBe('Opus 5.5 Checking the parser');
    expect(formatAgentStatus(t, 'uk', { key: 'chat.agentStatus.usingTool', name: 'Read' }, 'Opus 5.5'))
      .toBe('Opus 5.5 використовує Read');
  });

  test('names the tool it does not know', () => {
    expect(formatAgentStatus(t, 'uk', { key: 'chat.agentStatus.usingTool', name: 'jev route' })).toBe('Використовує jev route');
    expect(formatAgentStatus(t, 'uk', { key: 'chat.agentStatus.usingTool', name: "cash$&tool $$ $' $`" })).toBe("Використовує cash$&tool $$ $' $`");
  });
});
