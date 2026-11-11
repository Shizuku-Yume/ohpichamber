import { describe, expect, test } from 'bun:test';

import { CanonicalApiError } from '@/api/canonicalClient';
import { problemMessage } from './problemMessage';

const problem = (detail: string) => new CanonicalApiError({
  type: 'urn:ohpichamber:problem:SERVICE_UNAVAILABLE',
  title: 'Agent Service unavailable',
  status: 503,
  detail,
  code: 'SERVICE_UNAVAILABLE',
  retryable: true,
});

describe('problemMessage', () => {
  test('shows the capacity outcome instead of hiding the refusal', () => {
    expect(problemMessage(problem('Session capacity is full (5 of 5 active). Close another session or try again later.'), 'fallback'))
      .toBe('Session capacity is full (5 of 5 active). Close another session or try again later.');
  });

  test('shows the cause an ordinary error carries', () => {
    expect(problemMessage(new Error('The MCP server is not in the workspace configuration'), 'fallback'))
      .toBe('The MCP server is not in the workspace configuration');
  });

  test('a store that already reduced its failure to a sentence keeps it', () => {
    expect(problemMessage('The MCP server is not in the workspace configuration', 'fallback'))
      .toBe('The MCP server is not in the workspace configuration');
  });

  test('falls back only when the failure carries no sentence', () => {
    expect(problemMessage(new Error('   '), 'The MCP configuration could not be saved.')).toBe('The MCP configuration could not be saved.');
    expect(problemMessage(undefined, 'The MCP configuration could not be saved.')).toBe('The MCP configuration could not be saved.');
    expect(problemMessage('', 'The MCP configuration could not be saved.')).toBe('The MCP configuration could not be saved.');
    expect(problemMessage({ reason: 'no message' }, 'The MCP configuration could not be saved.')).toBe('The MCP configuration could not be saved.');
  });
});
