import { describe, expect, test } from 'bun:test';
import { mcpServerIdFrom } from './mcpServerId';

describe('mcpServerIdFrom', () => {
  test('keeps the case the user typed and OMP\'s allowed characters', () => {
    expect(mcpServerIdFrom('Docs_Server.2')).toBe('Docs_Server.2');
  });

  test('rewrites invalid characters instead of refusing them', () => {
    expect(mcpServerIdFrom('my server/v2')).toBe('my-server-v2');
    expect(mcpServerIdFrom('a@b#c:d')).toBe('a-b-c-d');
  });

  test('caps the name at OMP\'s 100 character limit', () => {
    expect(mcpServerIdFrom('a'.repeat(120))).toHaveLength(100);
  });

  test('an empty name stays empty for the required-field check to catch', () => {
    expect(mcpServerIdFrom('')).toBe('');
  });
});
