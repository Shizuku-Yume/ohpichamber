import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompactionDivider } from './SessionRecapSpacer';
import { I18nProvider } from '@/lib/i18n';

const renderDivider = (props: React.ComponentProps<typeof CompactionDivider>) => renderToStaticMarkup(
  <I18nProvider>
    <CompactionDivider {...props} />
  </I18nProvider>
);

describe('CompactionDivider', () => {
  test('renders compaction divider with reduction badge when tokensAfter is present', () => {
    const html = renderDivider({
      method: 'soft',
      tokensBefore: 256000,
      tokensAfter: 20000,
      summary: 'Summary of earlier work',
    });
    expect(html).toContain('data-compaction-divider');
    expect(html).toContain('data-compaction-method="soft-compacted"');
    expect(html).toContain('Soft-compacted');
    expect(html).toContain('256K → 20K tokens');
  });

  test('renders compaction divider without reduction badge when tokensAfter is absent', () => {
    const html = renderDivider({
      method: 'shaken',
      tokensBefore: 150000,
    });
    expect(html).toContain('data-compaction-method="shaken"');
    expect(html).toContain('Shaken');
    expect(html).toContain('150K tokens');
    expect(html).not.toContain('→');
  });

  test('normalizes legacy method names', () => {
    const remote = renderDivider({ method: 'remote', tokensBefore: 1000 });
    expect(remote).toContain('data-compaction-method="remote-compacted"');

    const snap = renderDivider({ method: 'snapcompact', tokensBefore: 1000 });
    expect(snap).toContain('data-compaction-method="snap-compacted"');

    const handoff = renderDivider({ method: 'handoff', tokensBefore: 1000 });
    expect(handoff).toContain('data-compaction-method="handed-off"');
  });

  test('renders warning indicator if present', () => {
    const html = renderDivider({
      method: 'soft-compacted',
      tokensBefore: 10000,
      warning: 'Dead-end loop detected',
    });
    expect(html).toContain('text-status-warning');
  });
});
