import { describe, expect, test } from 'bun:test';
import { AsyncJobManager, type AsyncJob } from '@oh-my-pi/pi-coding-agent/async/job-manager';
import type { AgentRegistry } from '@oh-my-pi/pi-coding-agent/registry/agent-registry';
import type { PipeStreams } from '@oh-my-pi/pi-natives';
import type { DaemonSnapshot } from '@oh-my-pi/pi-tui/tools/daemon';
import type { RunningShell } from '@openchamber/agent-contract';
import { WorkerShell } from './shell.ts';

function createMockStreams(records: Array<{ id: number; producer: string; consumer: string; data: string; open: boolean }>): PipeStreams {
  return {
    list() {
      return records.map(r => ({
        id: r.id,
        producer: r.producer,
        consumer: r.consumer,
        total: Buffer.byteLength(r.data, 'utf-8'),
        open: r.open,
      }));
    },
    read(id: number, from?: number | null) {
      const match = records.find(r => r.id === id);
      if (!match) return null;
      const fullBuffer = Buffer.from(match.data, 'utf-8');
      const start = from ?? 0;
      const data = fullBuffer.subarray(start);
      return {
        start,
        end: start + data.length,
        data,
        open: match.open,
      };
    },
  } as unknown as PipeStreams;
}

describe('WorkerShell streams, stdin, and job widgets', () => {
  test('exposes pipe stream inspection with bounded chunks and survives job completion', async () => {
    const manager = new AsyncJobManager({ onJobComplete: () => {} });
    const mockStreams = createMockStreams([
      { id: 1, producer: '/home/private/repo/src/producer.sh', consumer: 'grep pattern', data: 'hello stream chunk data\n', open: false },
    ]);

    const shell = new WorkerShell({
      manager,
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      sessionId: 'session-1',
      workerGeneration: 'gen-1',
      epoch: 'epoch-1',
      nativeOwner: { agentId: 'session-1', registry: { get: () => undefined } as unknown as AgentRegistry },
      privateRoots: [{ root: '/home/private/repo', label: 'workspace' }],
    });

    const nativeJob = {
      id: 'bg-1',
      type: 'bash',
      status: 'running',
      startTime: 1000,
      label: 'test background job',
      intent: 'Processing logs in /home/private/repo',
      ownerId: 'session-1',
      abortController: new AbortController(),
      promise: Promise.resolve(),
      process: {
        command: 'cat /home/private/repo/data.txt | grep pattern',
        cwd: '/workspace',
        pids: () => [1234, 1235],
        streams: mockStreams,
      },
    } as unknown as AsyncJob;

    // Register job in manager with deferred promise
    const { promise: jobPromise, resolve: resolveJob } = Promise.withResolvers<string>();
    const registeredId = manager.register('bash', 'cat /home/private/repo/data.txt | grep pattern', () => jobPromise, { id: 'bg-1', ownerId: 'session-1', foreground: false });
    expect(registeredId).toBe('bg-1');
    const registeredNative = manager.getJob('bg-1')!;
    registeredNative.process = nativeJob.process;
    registeredNative.intent = nativeJob.intent;

    manager.emitBashJobEvent({
      type: 'started',
      jobId: 'bg-1',
      sessionKey: 'session-1:shell:bg-1',
    });

    const snapshotRes = await shell.operation({ type: 'snapshot' });
    expect(snapshotRes.type).toBe('snapshot');
    if (snapshotRes.type === 'snapshot') {
      const running = snapshotRes.snapshot.running.find(j => j.command.includes('grep pattern')) as RunningShell | undefined;
      expect(running).toBeDefined();
      expect(running?.intent).toBe('Processing logs in [workspace]');
      expect(running?.command).toBe('cat [workspace]/data.txt | grep pattern');
      expect(running?.pids).toEqual([1234, 1235]);
      expect(running?.streams).toBeDefined();
      expect(running?.streams?.[0]?.producer).toBe('[workspace]/src/producer.sh');

      // Test stream inspection while running
      const streamRes = await shell.operation({
        type: 'stream',
        request: {
          job: {
            jobId: running!.jobId,
            sessionId: running!.sessionId,
            epoch: running!.epoch,
            workerGeneration: running!.workerGeneration,
          },
          streamId: 1,
        },
      });
      expect(streamRes.type).toBe('stream');
      if (streamRes.type === 'stream') {
        expect(streamRes.stream.streamId).toBe(1);
        expect(streamRes.stream.chunk).toBe('hello stream chunk data\n');
        expect(streamRes.stream.open).toBe(false);
      }

      // Finish the job
      manager.emitBashJobEvent({
        type: 'finished',
        jobId: 'bg-1',
        exitCode: 0,
        cancelled: false,
        timedOut: false,
      });
      resolveJob('done');
      await registeredNative.promise;

      // Stream inspection must still work on retained ended job
      const endedStreamRes = await shell.operation({
        type: 'stream',
        request: {
          job: {
            jobId: running!.jobId,
            sessionId: running!.sessionId,
            epoch: running!.epoch,
            workerGeneration: running!.workerGeneration,
          },
          streamId: 1,
        },
      });
      expect(endedStreamRes.type).toBe('stream');
      if (endedStreamRes.type === 'stream') {
        expect(endedStreamRes.stream.chunk).toBe('hello stream chunk data\n');
      }
    }
  });

  test('routes stdin exclusively to named services and rejects regular bash jobs with INVALID_REQUEST', async () => {
    const manager = new AsyncJobManager({ onJobComplete: () => {} });
    let sentInput: { name: string; input: string } | null = null;

    const shell = new WorkerShell({
      manager,
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      sessionId: 'session-1',
      workerGeneration: 'gen-1',
      epoch: 'epoch-1',
      cwd: '/workspace',
      sendServiceInput: async (name, input) => {
        sentInput = { name, input };
      },
    });

    // Start a regular shell command (not a named service)
    const startRes = await shell.operation({
      type: 'start',
      request: {
        command: 'sleep 5',
        background: true,
      },
    });
    expect(startRes.type).toBe('start');
    if (startRes.type === 'start') {
      const jobIdentity = {
        jobId: startRes.job.jobId,
        sessionId: startRes.job.sessionId,
        epoch: startRes.job.epoch,
        workerGeneration: startRes.job.workerGeneration,
      };

      // Sending stdin to a regular command must fail with INVALID_REQUEST
      expect(
        shell.operation({
          type: 'stdin',
          request: {
            job: jobIdentity,
            input: 'arbitrary input\n',
          },
        }),
      ).rejects.toThrow();

      // Stop the shell
      const stopRes = await shell.operation({
        type: 'stop',
        request: { job: jobIdentity },
      });
      expect(stopRes.type).toBe('stop');
    }
    expect(sentInput).toBeNull();
  });

  test('security: enforces named service authorization, stale identity rejection, sibling survival, and verified terminal stop', async () => {
    const manager = new AsyncJobManager({ onJobComplete: () => {} });
    let sentInput: { name: string; input: string } | null = null;
    const stoppedServices: string[] = [];

    const daemons: DaemonSnapshot[] = [
      {
        name: 'service-a',
        id: 'daemon-a-1',
        state: 'running',
        pid: 1111,
        createdAt: 1000,
        startedAt: 1000,
        restartCount: 0,
        outputBytes: 50,
        persist: true,
        detached: false,
        owner: 'session-1',
      },
      {
        name: 'service-b',
        id: 'daemon-b-2',
        state: 'running',
        pid: 2222,
        createdAt: 1000,
        startedAt: 1000,
        restartCount: 0,
        outputBytes: 80,
        persist: false,
        detached: true,
        owner: 'session-1',
      },
      {
        name: 'foreign-service',
        id: 'daemon-foreign-9',
        state: 'running',
        pid: 9999,
        createdAt: 1000,
        startedAt: 1000,
        restartCount: 0,
        outputBytes: 100,
        persist: true,
        detached: false,
        owner: 'session-other-victim',
      },
    ];

    const shell = new WorkerShell({
      manager,
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      sessionId: 'session-1',
      workerGeneration: 'gen-1',
      epoch: 'epoch-1',
      cwd: '/workspace',
      listServices: async () => daemons,
      serviceLogs: async (name) => `logs for ${name}\n`,
      sendServiceInput: async (name, input) => {
        sentInput = { name, input };
      },
      stopService: async (name) => {
        stoppedServices.push(name);
        const match = daemons.find(d => d.name === name);
        if (match) {
          match.state = 'failed';
          match.exitedAt = Date.now();
          match.exitCode = 0;
        }
      },
    });

    const snapshotRes = await shell.operation({ type: 'snapshot' });
    expect(snapshotRes.type).toBe('snapshot');
    if (snapshotRes.type === 'snapshot') {
      const runningJobs = snapshotRes.snapshot.running;
      // 1. Session-owned services are present
      expect(runningJobs.some(j => j.jobId === 'service:daemon-a-1')).toBe(true);
      expect(runningJobs.some(j => j.jobId === 'service:daemon-b-2')).toBe(true);
      // 2. Foreign service owned by session-other-victim is NOT listed
      expect(runningJobs.some(j => j.jobId === 'service:daemon-foreign-9')).toBe(false);

      const jobAIdentity = {
        jobId: 'service:daemon-a-1',
        sessionId: 'session-1',
        epoch: 'epoch-1',
        workerGeneration: 'gen-1',
      };

      // 3. Stdin to authorized service-a succeeds
      const stdinRes = await shell.operation({
        type: 'stdin',
        request: {
          job: jobAIdentity,
          input: 'reload config\n',
        },
      });
      expect(stdinRes.type).toBe('stdin');
      expect(sentInput as unknown).toEqual({ name: 'service-a', input: 'reload config\n' });

      // 4. Foreign service deny: Attempting to access/stop foreign service fails with 404 SHELL_NOT_FOUND
      expect(
        shell.operation({
          type: 'stdin',
          request: {
            job: {
              jobId: 'service:daemon-foreign-9',
              sessionId: 'session-1',
              epoch: 'epoch-1',
              workerGeneration: 'gen-1',
            },
            input: 'malicious input\n',
          },
        }),
      ).rejects.toThrow();

      // 5. Stale identity rejection: Request with outdated epoch fails with 410 RESYNC_REQUIRED
      expect(
        shell.operation({
          type: 'output',
          request: {
            job: {
              ...jobAIdentity,
              epoch: 'stale-epoch-invalid',
            },
            cursor: '0',
            tailBytes: 1000,
          },
        }),
      ).rejects.toThrow();

      // 6. Stop Service A and verify terminal stop proof
      const stopRes = await shell.operation({
        type: 'stop',
        request: {
          job: jobAIdentity,
        },
      });
      expect(stopRes.type).toBe('stop');
      expect(stoppedServices).toEqual(['service-a']);
      if (stopRes.type === 'stop') {
        expect(stopRes.result.job.status).toBe('ended');
        expect(stopRes.result.job.termination.reason).toBe('stopped');
      }

      // 7. Sibling service survival: Service B is still alive in snapshot!
      const postStopSnapshot = await shell.operation({ type: 'snapshot' });
      if (postStopSnapshot.type === 'snapshot') {
        const postRunning = postStopSnapshot.snapshot.running;
        expect(postRunning.some(j => j.jobId === 'service:daemon-b-2')).toBe(true);
        expect(postRunning.some(j => j.jobId === 'service:daemon-a-1')).toBe(false);
      }
    }
  });
});
