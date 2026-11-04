import { describe, expect, test, vi } from 'vitest';
import { createProjectKnowledgeActions } from './project-knowledge.js';

const createActions = () => {
  const runtime = {
    readContext: vi.fn(async () => ({ notes: [], todos: [], plans: [], sharedPlansDir: null })),
    plansDirFor: vi.fn(() => '/data/plans'),
  };
  const actions = createProjectKnowledgeActions({
    projectContextRuntime: runtime,
    resolveProjectContextId: async (directory) => (directory === '/work/pro_other' ? 'pro_other' : 'pro_calling'),
    isEnabled: async () => true,
    resolveDirectory: async ({ projectId }) => `/work/${projectId}`,
    showPlan: () => 1,
  });
  return { actions, runtime };
};

describe('a knowledge action from an agent session', () => {
  test('is bound to the calling session project', async () => {
    const { actions, runtime } = createActions();
    await actions.execute('knowledge.list', {}, '/work/calling', 'ses_1');
    expect(runtime.readContext).toHaveBeenCalledWith('pro_calling');
  });

  test('cannot read or write another project by naming it', async () => {
    const { actions } = createActions();
    await expect(actions.execute('knowledge.list', { projectId: 'pro_other' }, '/work/calling', 'ses_1'))
      .rejects.toMatchObject({ statusCode: 400 });
    await expect(actions.execute('knowledge.list', { directory: '/work/other' }, '/work/calling', 'ses_1'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('a CLI call without a session may target a project explicitly', async () => {
    const { actions, runtime } = createActions();
    await actions.execute('knowledge.list', { projectId: 'pro_other' }, undefined, undefined);
    expect(runtime.readContext).toHaveBeenCalledWith('pro_other');
  });
});
