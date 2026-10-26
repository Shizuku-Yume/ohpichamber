import { describe, expect, test } from 'bun:test';
import { dirtySwitchPushTarget } from '@/lib/source-control/dirty-branch-switch';

type Target = { remoteName: string; destinationRef: string } | null;

describe('dirty branch switch push target', () => {
  test('pushes a renamed local branch to its tracking ref, not its local name', () => {
    expect(dirtySwitchPushTarget('my-topic', 'origin/topic', ['origin', 'upstream'], 'upstream'))
      .toEqual({ remoteName: 'origin', destinationRef: 'refs/heads/topic' });
  });

  test('keeps slashes in the tracked branch and prefers the longest remote name', () => {
    expect(dirtySwitchPushTarget('local', 'team/fork/feature/x', ['team', 'team/fork'], 'team'))
      .toEqual({ remoteName: 'team/fork', destinationRef: 'refs/heads/feature/x' });
  });

  test('publishes an untracked branch under its own name on the fallback remote', () => {
    const fresh: Target = dirtySwitchPushTarget('fresh', null, ['origin'], 'origin');
    expect(fresh).toEqual({ remoteName: 'origin', destinationRef: 'refs/heads/fresh' });
    expect(dirtySwitchPushTarget('fresh', 'gone/fresh', ['origin'], 'origin')).toEqual(fresh);
    expect(dirtySwitchPushTarget('fresh', null, [], null)).toBeNull();
  });
});
