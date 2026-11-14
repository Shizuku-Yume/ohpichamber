import { describe, expect, test } from 'bun:test';
import { UI_BLOCK_EXAMPLES, buildUiBlocksGuidance } from './guidance';
import { parseUiBlock } from './catalog';

describe('UI block guidance', () => {
  test('every example the agent reads is a valid block', () => {
    for (const example of UI_BLOCK_EXAMPLES) {
      expect(buildUiBlocksGuidance()).toContain(example);
      expect(parseUiBlock(example, true).kind).toBe('ready');
    }
  });
});
