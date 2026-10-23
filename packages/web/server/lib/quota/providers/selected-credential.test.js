import { describe, expect, it, vi } from 'vitest';
import {
  requireSelectedCredential,
  SELECTED_CREDENTIAL_CONTEXT_REQUIRED,
  SELECTED_CREDENTIAL_UNAVAILABLE,
} from './selected-credential.js';

const selection = { workspaceId: 'workspace_1', agentDirectoryId: 'agent_1', providerId: 'openai', credentialRef: 'credential_1', purpose: 'tts' };

describe('requireSelectedCredential', () => {
  it('returns the resolved credential and passes only the selected ownership', async () => {
    const resolveCredential = vi.fn(async () => ({ type: 'api_key', key: 'selected-key' }));
    await expect(requireSelectedCredential({ ...selection, resolveCredential })).resolves.toEqual({ type: 'api_key', key: 'selected-key' });
    expect(resolveCredential).toHaveBeenCalledWith(selection);
  });

  it('requires every ownership field before calling the resolver', async () => {
    const resolveCredential = vi.fn();
    await expect(requireSelectedCredential({ ...selection, providerId: undefined, resolveCredential }))
      .rejects.toMatchObject({ code: SELECTED_CREDENTIAL_CONTEXT_REQUIRED, message: 'Selected credential context is required' });
    expect(resolveCredential).not.toHaveBeenCalled();
  });

  it('keeps an absent credential distinct from a failed resolution', async () => {
    await expect(requireSelectedCredential({ ...selection, resolveCredential: async () => null }))
      .rejects.toMatchObject({ code: SELECTED_CREDENTIAL_UNAVAILABLE });

    const resolutionFailure = await requireSelectedCredential({
      ...selection,
      resolveCredential: async () => { throw new Error('credential store offline'); },
    }).catch((error) => error);
    expect(resolutionFailure.code).not.toBe(SELECTED_CREDENTIAL_UNAVAILABLE);
    expect(resolutionFailure.code).not.toBe(SELECTED_CREDENTIAL_CONTEXT_REQUIRED);
  });
});
