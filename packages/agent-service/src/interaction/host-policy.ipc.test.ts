import { describe, expect, test } from 'bun:test';
import { fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  HostPermissionEvaluateRequestSchema, HostPermissionModeLoadRequestSchema,
  HostPermissionModeReplySchema, HostPermissionVerdictSchema,
} from '../supervisor/host-authorization-protocol.ts';

// The permission channel crosses a real parent/child IPC boundary, and the two
// halves must agree on the wire envelope. A unit-level call cannot catch a
// nested-vs-flat mismatch, so this test forks a child running the production
// `HostApprovalPolicies` client and validates what it actually sends with the
// same schemas the Host supervisor parses.
describe('permission IPC envelopes', () => {
  test('the service sends the exact envelopes the Host supervisor parses', async () => {
    const child = fork(path.join(import.meta.dir, 'host-policy.ipc.child.ts'), [], {
      execPath: process.execPath, stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    const reverse: unknown[] = [];
    try {
      let handshake = false;
      child.on('message', (raw: unknown) => {
        // The child announces readiness on the same channel before it asks.
        if ((raw as { type?: string })?.type === 'ready') { handshake = true; return; }
        const loaded = HostPermissionModeLoadRequestSchema.safeParse(raw);
        const evaluate = HostPermissionEvaluateRequestSchema.safeParse(raw);
        const request = loaded.success ? loaded.data : evaluate.success ? evaluate.data : null;
        if (!request) throw new Error('Host supervisor would fail closed on this envelope');
        if (request.sessionId !== 'session-1') throw new Error('envelope carries the wrong session');
        if (evaluate.success) {
          // Identity travels with the request; the Host evaluates the real one.
          expect(evaluate.data.approval.approvalId).toBe('approval-1');
          expect(evaluate.data.approval.commandSummary).toBe('rm -rf build');
          expect(evaluate.data.approval.status).toBe('pending');
          reverse.push(HostPermissionVerdictSchema.parse({ type: 'permission.verdict', requestId: request.requestId, verdict: 'accept' }));
        } else {
          reverse.push(HostPermissionModeReplySchema.parse({ type: 'permission.mode', requestId: request.requestId, mode: 'safety' }));
        }
        child.send(reverse.at(-1)!);
      });
      const exited = Promise.withResolvers<number | null>();
      child.once('exit', code => { exited.resolve(code); });
      expect(await exited.promise).toBe(0);
      expect(handshake).toBe(true);
      expect(reverse).toHaveLength(2);
      const envelopeLog = process.env.OHPICHAMBER_SMOKE_LOG;
      if (envelopeLog) fs.writeFileSync(envelopeLog, JSON.stringify(reverse, null, 2));
    } finally {
      if (!child.killed) child.kill('SIGKILL');
    }
  }, 20_000);
});
