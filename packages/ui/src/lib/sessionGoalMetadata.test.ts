import { describe, expect, test } from 'bun:test';
import type { Session } from '@openchamber/agent-contract';
import { getSessionGoal } from './sessionGoalMetadata';
import { sessionGoalStatusColor } from './sessionGoalPresentation';

const session = (mode: Session['mode'], metadata: Session['metadata'] = null): Session => ({
  sessionId: 'session', projectId: 'project', workspaceId: 'workspace', displayPath: '.', rootSessionId: 'session',
  createdAt: 1, updatedAt: 1, epoch: 'epoch', headSequence: '0', runtimeStatus: 'idle', activeRunId: null,
  mode, metadata, metadataRevision: '0', archiveRevision: '0',
});

describe('Session goal presentation', () => {
  test('reads OMP mode and ignores legacy Host goal metadata', () => {
    const goal = getSessionGoal(session({ kind: 'goal', status: 'active', objective: 'Ship it', tokenBudget: 12000, tokensUsed: 20 }, {
      openchamber: { goal: { id: 'legacy', objective: 'Old goal', status: 'complete' } },
    }));
    expect(goal).toEqual({ objective: 'Ship it', status: 'active', tokenBudget: 12000, tokensUsed: 20 });
  });

  test('does not show a legacy metadata goal when OMP mode is main', () => {
    expect(getSessionGoal(session({ kind: 'main' }, { openchamber: { goal: { id: 'legacy', objective: 'Old goal', status: 'active' } } }))).toBeNull();
  });

  test('maps OMP budget-limited state to the existing budget presentation', () => {
    const goal = getSessionGoal(session({ kind: 'goal', status: 'budget-limited', objective: 'Ship it', tokenBudget: 1000, tokensUsed: 1000 }));
    expect(goal?.status).toBe('budgetLimited');
    expect(sessionGoalStatusColor[goal!.status]).toBe('var(--status-warning)');
  });
});
