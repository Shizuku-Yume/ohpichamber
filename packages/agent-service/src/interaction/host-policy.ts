import { randomUUID } from 'node:crypto';
import type { Serializable } from 'node:child_process';
import { z } from 'zod';
import { CounterSchema, EntityIdSchema } from '@openchamber/agent-contract';
import { HostPermissionModeReplySchema, HostPermissionVerdictSchema, type HostPermissionEvaluateRequest, type HostPermissionModeLoadRequest } from '../supervisor/host-authorization-protocol.ts';
import { ProjectionError } from '../projection/journal.ts';
import type { ApprovalPolicyCommit, ApprovalPolicyLoad } from './manager.ts';

const PolicySchema = z.strictObject({
  policyId: EntityIdSchema, revision: CounterSchema, scope: z.enum(['session', 'workspace']),
  decision: z.enum(['allow', 'deny']), target: z.strictObject({ toolName: z.string().min(1), pattern: z.string() }),
}).refine(policy => policy.scope === 'session' ? policy.decision === 'allow' : policy.decision === 'deny');
const ReplySchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('approval.policy.committed'), requestId: EntityIdSchema, policyId: EntityIdSchema, revision: CounterSchema }),
  z.strictObject({ type: z.literal('approval.policy.listed'), requestId: EntityIdSchema, policies: z.array(PolicySchema) }),
  z.strictObject({ type: z.literal('approval.policy.failed'), requestId: EntityIdSchema, code: z.literal('APPROVAL_POLICY_WRITE_FAILED') }),
  HostPermissionVerdictSchema,
  HostPermissionModeReplySchema,
]);
const POLICY_REQUEST_TIMEOUT_MS = 5_000;
// A safety verdict waits on a classifier round trip; a worker turn must not
// hang on it, so the wait stays bounded and a timeout leaves the request to the user.
const EVALUATION_REQUEST_TIMEOUT_MS = 20_000;
type RequestType = 'approval.policy.commit' | 'approval.policy.list' | 'permission.evaluate' | 'permission.mode.load';
type RequestBody = Parameters<ApprovalPolicyCommit>[0] | Parameters<ApprovalPolicyLoad>[0] | Omit<HostPermissionEvaluateRequest, 'type' | 'requestId'>
  | Omit<HostPermissionModeLoadRequest, 'type' | 'requestId'>;
type Reply = z.infer<typeof ReplySchema>;

/** Only the Node Host can acknowledge a committed policy. No worker owns this IPC channel. */
export class HostApprovalPolicies {
  private readonly pending = new Map<string, { resolve: (reply: Reply) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private readonly onMessage = (raw: Serializable): void => {
    const reply = ReplySchema.safeParse(raw);
    if (!reply.success) return;
    const pending = this.pending.get(reply.data.requestId);
    if (!pending) return;
    this.pending.delete(reply.data.requestId);
    clearTimeout(pending.timer);
    if (reply.data.type === 'approval.policy.failed') pending.reject(this.failure());
    else pending.resolve(reply.data);
  };
  private readonly onDisconnect = (): void => this.close();

  constructor() {
    process.on('message', this.onMessage);
    process.once('disconnect', this.onDisconnect);
  }

  readonly commit: ApprovalPolicyCommit = async request => {
    const reply = await this.request('approval.policy.commit', request);
    if (reply.type !== 'approval.policy.committed') throw this.failure();
    return { policyId: reply.policyId, revision: reply.revision };
  };

  readonly load: ApprovalPolicyLoad = async request => {
    const reply = await this.request('approval.policy.list', request);
    if (reply.type !== 'approval.policy.listed') throw this.failure();
    return reply.policies;
  };

  close(): void {
    process.removeListener('message', this.onMessage);
    process.removeListener('disconnect', this.onDisconnect);
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(this.failure()); }
    this.pending.clear();
  }

  /** Ask the Host safety net about one `safety` request; no channel means `unavailable`. */
  readonly evaluate = async (request: Omit<HostPermissionEvaluateRequest, 'type' | 'requestId'>): Promise<'accept' | 'hold' | 'unavailable'> => {
    try {
      const verdict = await this.request('permission.evaluate', request);
      return verdict.type === 'permission.verdict' ? verdict.verdict : 'unavailable';
    } catch {
      // A timeout or a closed channel is not a verdict; the request waits.
      return 'unavailable';
    }
  };

  /**
   * The mode the Host policy resolves for this session right now. The Host is
   * the authority, so an unreadable policy falls back to `ask` here rather than
   * guessing an answering mode.
   */
  readonly mode = async (request: Omit<HostPermissionModeLoadRequest, 'type' | 'requestId'>): Promise<'ask' | 'safety' | 'auto'> => {
    try {
      const reply = await this.request('permission.mode.load', request);
      return reply.type === 'permission.mode' ? reply.mode : 'ask';
    } catch {
      return 'ask';
    }
  };

  private failure(): ProjectionError {
    return new ProjectionError(503, 'APPROVAL_POLICY_WRITE_FAILED', 'Host approval policy persistence is unavailable');
  }

  private request(type: RequestType, request: RequestBody): Promise<Reply> {
    if (!process.send || !process.connected) return Promise.reject(this.failure());
    const requestId = randomUUID();
    const { promise, resolve, reject } = Promise.withResolvers<Reply>();
    const fail = (): void => {
      const pending = this.pending.get(requestId);
      if (!pending) return;
      this.pending.delete(requestId);
      clearTimeout(pending.timer);
      pending.reject(this.failure());
    };
    const timer = setTimeout(fail, type === 'permission.evaluate' || type === 'permission.mode.load' ? EVALUATION_REQUEST_TIMEOUT_MS : POLICY_REQUEST_TIMEOUT_MS);
    this.pending.set(requestId, { resolve, reject, timer });
    // The two IPC families carry different envelopes: policy replies mirror the
    // nested `request`, while the permission ones are flat on the wire.
    const message = type === 'permission.evaluate' || type === 'permission.mode.load'
      ? { type, requestId, ...request }
      : { type, requestId, request };
    process.send!(message, error => { if (error) fail(); });
    return promise;
  }
}
