import { describe, expect, test } from 'bun:test';

import type { DesktopSettings } from '@/lib/desktop';
import {
  COMMIT_SETTING_DEFAULTS,
  commitExtrasFailureKey,
  readCommitExtrasFailure,
  readCommitSettings,
} from './gitCommitSettings';

describe('commit settings', () => {
  test('generation is on and every commit extra is off when nothing was stored', () => {
    // Backward compatibility: an install that never opened this page keeps
    // generating commit messages exactly as before.
    expect(readCommitSettings(null)).toEqual({
      generateCommitMessages: true,
      commitMessageReasoning: false,
      commitMessageNotes: false,
      commitMessageChangeId: false,
    });
    expect(readCommitSettings({})).toEqual(COMMIT_SETTING_DEFAULTS);
    expect(readCommitSettings(undefined)).toEqual(COMMIT_SETTING_DEFAULTS);
  });

  test('a stored false is a choice, not a missing value', () => {
    // The regression this guards: treating `false` as absent would silently
    // re-enable generation for the user who turned it off.
    expect(readCommitSettings({ generateCommitMessages: false }).generateCommitMessages).toBe(false);
    expect(readCommitSettings({ generateCommitMessages: true }).generateCommitMessages).toBe(true);
    expect(readCommitSettings({ commitMessageChangeId: false }).commitMessageChangeId).toBe(false);
  });

  test('round-trips every value through the settings document shape', () => {
    const document = {
      generateCommitMessages: false,
      commitMessageReasoning: true,
      commitMessageNotes: true,
      commitMessageChangeId: true,
    } satisfies DesktopSettings;
    expect(readCommitSettings(document)).toEqual(document);
  });

  test('a malformed value falls back to its default instead of inverting it', () => {
    const document = { generateCommitMessages: 'yes', commitMessageReasoning: 1 } as unknown as DesktopSettings;
    expect(readCommitSettings(document)).toEqual(COMMIT_SETTING_DEFAULTS);
  });

  test('names the warning for the extras that actually failed', () => {
    const failure = (extras: Array<'changeId' | 'notes'>) => ({
      error: 'partial', code: 'COMMIT_EXTRAS_FAILED' as const, commit: 'a'.repeat(40), branch: 'main',
      extras: {
        changeId: null,
        notes: false,
        failed: extras.map((extra) => ({ extra, code: 'X', message: 'did not apply' })),
      },
    });
    expect(commitExtrasFailureKey(failure(['changeId']))).toBe('gitView.toast.commitExtrasChangeId');
    expect(commitExtrasFailureKey(failure(['notes']))).toBe('gitView.toast.commitExtrasNotes');
    expect(commitExtrasFailureKey(failure(['notes', 'changeId']))).toBe('gitView.toast.commitExtrasBoth');
  });

  test('a plain commit failure is not mistaken for a partial commit', () => {
    expect(readCommitExtrasFailure(new Error('Failed to create commit'))).toBeNull();
  });
});