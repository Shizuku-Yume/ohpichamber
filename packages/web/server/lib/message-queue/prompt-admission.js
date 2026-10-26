import { PromptRequestSchema } from '@openchamber/agent-contract';
import { PromptQueueError } from './sqlite-store.js';

/** Root OMP prompts use the session mode; agent profiles are task subagents only. */
export const assertRootPromptAdmission = (request) => {
  const parsed = PromptRequestSchema.parse(request);
  if (parsed.options.agentId !== null) {
    const error = new PromptQueueError('INVALID_REQUEST', 400, 'Root prompt agentId must be null');
    error.statusCode = 400;
    throw error;
  }
  if (parsed.input.agentMention !== undefined) {
    const error = new PromptQueueError('INVALID_REQUEST', 400, 'Root prompt agentMention is retired');
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};
