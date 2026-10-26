import { getPermissionIntent } from '@oh-my-pi/pi-coding-agent/session/acp-permission-gate';
import type {
  ClientBridge,
  ClientBridgePermissionOption,
  ClientBridgePermissionOutcome,
  ClientBridgePermissionToolCall,
} from '@oh-my-pi/pi-coding-agent/session/client-bridge';
import type { JsonObject } from '@openchamber/agent-contract';
import type { NativePermissionChoice } from './interaction.ts';

export type NativePermissionRequest = (
  toolCall: ClientBridgePermissionToolCall,
  options: ClientBridgePermissionOption[],
  sessionRuleKey: string | undefined,
  signal?: AbortSignal,
) => Promise<NativePermissionChoice | undefined>;

export type NativeBashPolicy = 'allow' | 'deny' | 'prompt';

/**
 * OMP's native ACP permission seam. `allow_always` is cached in this bridge for
 * the active worker session only; a new worker starts with no grant. Ordinary
 * tool approval (`ui.select`) never passes through here.
 */
export class NativePermissionBridge {
  private readonly allowedKeys = new Set<string>();
  private readonly onceByToolCall = new Map<string, { cacheKey: string; input: string }>();

  constructor(
    private readonly request: NativePermissionRequest,
    private readonly nativeBashPolicy: (toolCall: ClientBridgePermissionToolCall) => NativeBashPolicy = () => 'prompt',
  ) {}

  get clientBridge(): ClientBridge {
    return {
      capabilities: { requestPermission: true },
      requestPermission: (toolCall, options, signal) => this.requestPermission(toolCall, options, signal),
    };
  }

  /** Drop decisions when the native logical session resets. */
  reset(): void {
    this.allowedKeys.clear();
    this.onceByToolCall.clear();
  }

  /** Stop the bridge with the worker; pending Host handles are cancelled by interaction close. */
  stop(): void {
    this.reset();
  }

  /** True while this worker session holds OMP's allow_always cache key for the call. */
  isNativeAuthorized(toolName: string, input: JsonObject, toolCallId: string): boolean {
    const key = getPermissionIntent(toolName, input)?.cacheKey;
    if (!key) return false;
    if (this.allowedKeys.has(key)) return true;
    const once = this.onceByToolCall.get(toolCallId);
    if (!once || once.cacheKey !== key || once.input !== JSON.stringify(input)) {
      if (once) this.onceByToolCall.delete(toolCallId);
      return false;
    }
    this.onceByToolCall.delete(toolCallId);
    return true;
  }

  private async requestPermission(
    toolCall: ClientBridgePermissionToolCall,
    options: ClientBridgePermissionOption[],
    signal?: AbortSignal,
  ): Promise<ClientBridgePermissionOutcome> {
    const option = (kind: ClientBridgePermissionOption['kind']) => options.find(candidate => candidate.kind === kind);
    const allowOnce = option('allow_once');
    const allowAlways = option('allow_always');
    const rejectOnce = option('reject_once');
    if (!allowOnce || !rejectOnce) return { outcome: 'cancelled' };
    // OMP's bridge protocol is session-wide, but only bash has a native
    // allow_always rule. The ACP gate also wraps destructive edit/delete/move
    // calls and its approved arguments suppress the ordinary Approve/Deny
    // wrapper prompt, so every other gated tool still needs one Host card
    // here. That card is one-shot: no session rule is ever cached for it.
    if (toolCall.toolName !== 'bash') {
      const choice = await this.request(toolCall, options, undefined, signal);
      if (choice === 'once' || choice === 'always') return { outcome: 'selected', optionId: allowOnce.optionId, kind: allowOnce.kind };
      if (choice === 'reject') return { outcome: 'selected', optionId: rejectOnce.optionId, kind: rejectOnce.kind };
      return { outcome: 'cancelled' };
    }
    const key = getPermissionIntent(toolCall.toolName, toolCall.rawInput)?.cacheKey;
    // A prompt means the native decision cache no longer holds this call (for
    // example after a logical session reset). The Host must not reuse a stale
    // allow from before that reset.
    if (key) {
      this.allowedKeys.delete(key);
      this.onceByToolCall.delete(toolCall.toolCallId);
    }
    // Native bash policies keep their existing authority; a policy deny fails
    // closed without a Host card, and an allow does not claim a native user grant.
    const policy = this.nativeBashPolicy(toolCall);
    if (policy === 'allow') return { outcome: 'selected', optionId: allowOnce.optionId, kind: allowOnce.kind };
    if (policy === 'deny') return { outcome: 'selected', optionId: rejectOnce.optionId, kind: rejectOnce.kind };
    const choice = await this.request(toolCall, options, key, signal);
    if (choice === 'always' && allowAlways) {
      if (key) this.allowedKeys.add(key);
      return { outcome: 'selected', optionId: allowAlways.optionId, kind: allowAlways.kind };
    }
    if (choice === 'once') {
      if (key) this.onceByToolCall.set(toolCall.toolCallId, { cacheKey: key, input: JSON.stringify(toolCall.rawInput ?? {}) });
      return { outcome: 'selected', optionId: allowOnce.optionId, kind: allowOnce.kind };
    }
    if (choice === 'reject') return { outcome: 'selected', optionId: rejectOnce.optionId, kind: rejectOnce.kind };
    return { outcome: 'cancelled' };
  }
}
