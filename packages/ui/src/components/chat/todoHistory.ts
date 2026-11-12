import type { Message } from '@openchamber/agent-contract';
import { isTodoTool } from '@/lib/toolHelpers';
import { nativeToolResultContent } from './message/toolRenderers';
import { extractTodoPhases, type TodoPhase } from './todoData';

/** Latest successful OMP todo snapshot in the loaded branch history. */
export function latestTodoPhases(messages: readonly Message[]): TodoPhase[] | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const parts = messages[messageIndex]?.parts ?? [];
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex];
      if (!part || part.type !== 'tool_result' || !isTodoTool(part.toolName) || part.isError) continue;
      return extractTodoPhases(nativeToolResultContent(part).details);
    }
  }
  return null;
}
