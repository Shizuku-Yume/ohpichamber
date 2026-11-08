import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_GOAL_MAX_AUTO_TURNS, GOAL_MAX_AUTO_TURNS_LIMIT,
  decideGoalVerdict, readGoalChecker, readGoalMaxAutoTurns, readPlanAllowAgents,
  resolvedModelSelector,
} from './mode.ts';

describe('goal preferences captured from the Host', () => {
  test('the checker defaults to the judge role and only small-model changes it', () => {
    expect(readGoalChecker({})).toBe('classifier');
    expect(readGoalChecker({ OPENCHAMBER_SESSION_GOAL_CHECKER: 'small-model' })).toBe('small-model');
    expect(readGoalChecker({ OPENCHAMBER_SESSION_GOAL_CHECKER: 'judge' })).toBe('classifier');
    expect(readGoalChecker({ OPENCHAMBER_SESSION_GOAL_CHECKER: 'garbage' })).toBe('classifier');
  });

  test('the turn cap is an integer within 1..200, defaulting to 20', () => {
    expect(readGoalMaxAutoTurns({})).toBe(DEFAULT_GOAL_MAX_AUTO_TURNS);
    expect(readGoalMaxAutoTurns({ OPENCHAMBER_SESSION_GOAL_MAX_AUTO_TURNS: '40' })).toBe(40);
    expect(readGoalMaxAutoTurns({ OPENCHAMBER_SESSION_GOAL_MAX_AUTO_TURNS: String(GOAL_MAX_AUTO_TURNS_LIMIT) })).toBe(GOAL_MAX_AUTO_TURNS_LIMIT);
    for (const bad of ['0', '-1', '201', '2.5', 'abc']) {
      expect(readGoalMaxAutoTurns({ OPENCHAMBER_SESSION_GOAL_MAX_AUTO_TURNS: bad })).toBe(DEFAULT_GOAL_MAX_AUTO_TURNS);
    }
  });

  test('plan mode agents are only enabled by an explicit true', () => {
    expect(readPlanAllowAgents({})).toBe(false);
    expect(readPlanAllowAgents({ OPENCHAMBER_PLAN_ALLOW_AGENTS: 'true' })).toBe(true);
    expect(readPlanAllowAgents({ OPENCHAMBER_PLAN_ALLOW_AGENTS: '1' })).toBe(false);
  });

  test('a native role resolution becomes the selector the judge role accepts', () => {
    expect(resolvedModelSelector({})).toBeNull();
    expect(resolvedModelSelector({ model: { provider: 'anthropic', id: 'claude-haiku-4-5' } }))
      .toBe('anthropic/claude-haiku-4-5');
    // The role's own thinking level is part of the selector, not a fake picker value.
    expect(resolvedModelSelector({ model: { provider: 'anthropic', id: 'claude-haiku-4-5' }, thinkingLevel: 'high' }))
      .toBe('anthropic/claude-haiku-4-5:high');
  });

  test('the verdict follows the historical Jev thresholds', () => {
    expect(decideGoalVerdict({ all_done: 0.9, remaining: 0.1, needs_user: 0.1 })).toBe('complete');
    expect(decideGoalVerdict({ all_done: 0.9, remaining: 0.7, needs_user: 0.1 })).toBe('continue');
    expect(decideGoalVerdict({ all_done: 0.1, remaining: 0.9, needs_user: 0.1 })).toBe('continue');
    // A blocked request outranks every other answer: the user has to decide.
    expect(decideGoalVerdict({ all_done: 0.9, remaining: 0.1, needs_user: 0.8 })).toBe('paused');
  });
});
