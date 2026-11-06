import { describe, expect, test } from 'bun:test';

import {
  RESPONSE_STYLE_PRESETS,
  getResponseStylePresetInstructions,
  isResponseStylePreset,
  resolveResponseStyleInstruction,
} from './responseStyle';

describe('response style presets', () => {
  test('lists every selectable preset with default first', () => {
    expect(RESPONSE_STYLE_PRESETS).toEqual([
      'default', 'concise', 'detailed', 'mentor', 'pushback', 'noFiller', 'matchEnergy', 'warmPeer', 'custom',
    ]);
    expect(isResponseStylePreset('default')).toBe(true);
    expect(isResponseStylePreset('nope')).toBe(false);
    expect(isResponseStylePreset(undefined)).toBe(false);
  });

  test('default, unset, and blank custom presets inject exactly zero bytes', () => {
    expect(resolveResponseStyleInstruction({ preset: undefined })).toBe('');
    expect(resolveResponseStyleInstruction({ preset: null })).toBe('');
    expect(resolveResponseStyleInstruction({ preset: 'unknown' })).toBe('');
    expect(resolveResponseStyleInstruction({ preset: 'default' })).toBe('');
    expect(resolveResponseStyleInstruction({ preset: 'default', customInstructions: 'ignored' })).toBe('');
    expect(resolveResponseStyleInstruction({ preset: 'custom' })).toBe('');
    expect(resolveResponseStyleInstruction({ preset: 'custom', customInstructions: '   ' })).toBe('');
    expect(getResponseStylePresetInstructions('default')).toBe('');
    expect(getResponseStylePresetInstructions('custom')).toBe('');
  });

  test('non-default presets resolve to their instruction', () => {
    for (const preset of ['concise', 'detailed', 'mentor', 'pushback', 'noFiller', 'matchEnergy', 'warmPeer'] as const) {
      const instruction = resolveResponseStyleInstruction({ preset });
      expect(instruction.length).toBeGreaterThan(0);
      expect(instruction).toBe(getResponseStylePresetInstructions(preset));
    }
    expect(resolveResponseStyleInstruction({ preset: 'custom', customInstructions: '  Answer in Spanish.  ' }))
      .toBe('Answer in Spanish.');
  });
});
