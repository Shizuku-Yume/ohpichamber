import { resolveToolTier } from '@oh-my-pi/pi-coding-agent/tools/approval';
import type { JsonObject } from '@openchamber/agent-contract';
import type { NativeToolTier } from '../native-policy-protocol.ts';

/**
 * The capability tier the live tool declares for itself, resolved through OMP's
 * own approval resolver so a function-valued declaration sees the same args it
 * will when the tool executes. The Host classifies tools it does not know by
 * name with this; anything unresolvable fails closed to `exec`.
 */
export function resolveDeclaredTier(
  session: { getToolByName(name: string): { approval?: unknown } | undefined } | undefined,
  toolName: string,
  args: JsonObject,
): NativeToolTier {
  const tool = session?.getToolByName(toolName);
  if (!tool) return 'exec';
  try {
    // SAFETY: `getToolByName` returns OMP's live `AgentTool`; this structural
    // view only widens its `approval` declaration, never substitutes a value.
    // The SDK resolver itself returns `exec` for an absent or unrecognised one.
    return resolveToolTier(tool as Parameters<typeof resolveToolTier>[0], args);
  } catch {
    return 'exec';
  }
}
