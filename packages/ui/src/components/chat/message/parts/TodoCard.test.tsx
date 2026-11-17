import { describe, expect, test } from 'bun:test';
import type { JsonValue } from '@openchamber/agent-contract';
import { TodoCard } from './TodoCard';
import { activeTodoTask, todoProgress } from '../../todoProgress';
import { extractTodoPhases } from '../../todoData';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '@/lib/i18n';

const phases: JsonValue = [
  { name: 'Plan', tasks: [{ content: 'Inspect', status: 'completed' }, { content: 'Implement', status: 'in_progress', blocker: 'waiting' }] },
  { name: 'Verify', tasks: [{ content: 'Run checks', status: 'pending' }] },
];

describe('OMP todo rendering', () => {
  test('parses native phases and displays each phase, item and status', () => {
    const parsed = extractTodoPhases({ phases });
    expect(parsed).toEqual(phases);
    const html = renderToStaticMarkup(<I18nProvider><TodoCard phases={parsed ?? []} defaultExpanded /></I18nProvider>);
    expect(html).toContain('Plan');
    expect(html).toContain('Inspect');
    expect(html).toContain('Implement');
    expect(html).toContain('Verify');
    expect(html).toContain('Run checks');
  });

  test('folds to the active item and its progress', () => {
    const parsed = extractTodoPhases({ phases }) ?? [];
    expect(todoProgress(parsed)).toEqual({ closed: 1, total: 3 });
    expect(activeTodoTask(parsed)?.content).toBe('Implement');
    const html = renderToStaticMarkup(<I18nProvider><TodoCard phases={parsed} /></I18nProvider>);
    expect(html).toContain('Implement');
    expect(html).toContain('1/3');
    // Folded, the other phases and items stay out of the row.
    expect(html).not.toContain('Run checks');
    expect(html).toContain('aria-expanded="false"');
  });

  test('names the next pending item when nothing is in progress', () => {
    const parsed = extractTodoPhases({
      phases: [
        { name: 'Plan', tasks: [{ content: 'Inspect', status: 'completed' }] },
        { name: 'Verify', tasks: [{ content: 'Run checks', status: 'pending' }, { content: 'Ship', status: 'pending' }] },
      ]
    }) ?? [];
    expect(activeTodoTask(parsed)?.content).toBe('Run checks');
    const html = renderToStaticMarkup(<I18nProvider><TodoCard phases={parsed} /></I18nProvider>);
    expect(html).toContain('Run checks');
    expect(html).toContain('1/3');
  });

  test('rejects malformed phase snapshots instead of inventing an empty list', () => {
    expect(extractTodoPhases({ phases: [{ name: 'bad', tasks: [{ content: 'x', status: 'todo' }] }] })).toBeNull();
    expect(extractTodoPhases({})).toBeNull();
  });
});
