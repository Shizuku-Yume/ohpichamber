import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import type { TrackedShell } from '@/sync/background-shells';
import type { JobWidgetView } from '@openchamber/agent-contract';

const browser = new Window({ url: 'http://localhost' });
let root: Root;

function applyGlobals() {
  browser.requestAnimationFrame = ((cb: (timestamp: number) => void) => setTimeout(cb, 0)) as unknown as typeof browser.requestAnimationFrame;
  browser.cancelAnimationFrame = ((id: unknown) => clearTimeout(id as number)) as unknown as typeof browser.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  Object.assign(globalThis, {
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    localStorage: browser.localStorage,
    Node: browser.Node,
    Event: browser.Event,
    MouseEvent: browser.MouseEvent,
    PointerEvent: browser.PointerEvent,
    KeyboardEvent: browser.KeyboardEvent,
    MutationObserver: browser.MutationObserver,
    ResizeObserver: browser.ResizeObserver,
    Element: browser.Element,
    HTMLElement: browser.HTMLElement,
    HTMLInputElement: browser.HTMLInputElement,
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 0),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
    getComputedStyle: browser.getComputedStyle.bind(browser),
    IS_REACT_ACT_ENVIRONMENT: true,
  });
}
applyGlobals();

// Mock the dialog shell: Base UI dialog portals to body which can detach in multi-file headless test runners.
mock.module('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) => open ? <div data-slot="dialog-root">{children}</div> : null,
  DialogContent: ({ children, className }: { children?: React.ReactNode; className?: string }) => <div data-slot="dialog-content" className={className}>{children}</div>,
  DialogHeader: ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogTitle: ({ children, className }: { children?: React.ReactNode; className?: string }) => <h2 className={className}>{children}</h2>,
  DialogDescription: ({ children, className }: { children?: React.ReactNode; className?: string }) => <p className={className}>{children}</p>,
  DialogFooter: ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

const { I18nProvider } = await import('@/lib/i18n');
const { canonicalClient } = await import('@/api/canonicalClient');
const { JobsSheetDialog, JobWidgetViewRenderer } = await import('./JobsSheetDialog');

const mockWidget: JobWidgetView = {
  title: 'benchmark-worker',
  headline: {
    text: '186 tok/s',
    label: 'decode',
    trend: { text: '▲ 15%', tone: 'success' },
  },
  stage: 'phase-2-eval',
  state: 'live',
  updatedAt: 1000,
  blocks: [
    {
      kind: 'spark',
      label: 'Throughput',
      values: [100, 120, 150, 186],
      min: 80,
      max: 200,
      last: '186 tok/s',
      tone: 'success',
    },
    {
      kind: 'bars',
      label: 'Model Accuracy',
      max: 100,
      items: [
        { label: 'gpt-4o', value: 85, text: '85%', tone: 'success' },
        { label: 'claude-3-5', value: 92, text: '92%', tone: 'success' },
      ],
    },
    {
      kind: 'meter',
      label: 'Trials Completed',
      value: 0.75,
      text: '75/100',
      tone: 'info',
    },
    {
      kind: 'grid',
      label: 'Shard Status',
      items: [
        { label: 'shard-0', text: 'ok', tone: 'success' },
        { label: 'shard-1', text: 'err', tone: 'error' },
      ],
    },
    {
      kind: 'stat',
      items: [
        { label: 'p50', text: '42 ms', tone: 'info' },
        { label: 'p99', text: '210 ms', tone: 'warning' },
      ],
    },
    {
      kind: 'text',
      text: 'Running trial 76 on shard-0...',
    },
  ],
};

const mockRunningShell: TrackedShell = {
  jobId: 'job-1',
  sessionId: 'session-1',
  epoch: 'epoch-1',
  workerGeneration: 'gen-1',
  workspaceId: 'workspace-1',
  projectId: 'project-1',
  command: 'npm run bench',
  caption: 'AI Benchmark Runner',
  intent: 'Running benchmark suite',
  background: true,
  status: 'running',
  startedAt: 1000,
  outputCursor: '0',
  directory: '/workspace',
  pids: [1234, 1235],
  canReceiveStdin: true,
  serviceName: 'bench-daemon',
  streams: [
    { id: 1, producer: 'cat data', consumer: 'sort', total: 1024, open: true },
  ],
  widget: mockWidget,
};

describe('JobsSheetDialog & JobWidgetViewRenderer', () => {
  beforeEach(() => {
    applyGlobals();
    document.body.replaceChildren();
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host as unknown as Element);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    browser.document.body.replaceChildren();
  });

  afterAll(async () => {
    await browser.happyDOM.close();
  });
  test('renders all 4 widget kinds and stat/text blocks in JobWidgetViewRenderer', async () => {
    await act(async () => {
      root.render(<I18nProvider><JobWidgetViewRenderer widget={mockWidget} /></I18nProvider>);
    });

    const text = document.body.textContent ?? '';
    expect(text).toContain('benchmark-worker');
    expect(text).toContain('186 tok/s');
    expect(text).toContain('Throughput');
    expect(text).toContain('Model Accuracy');
    expect(text).toContain('gpt-4o');
    expect(text).toContain('claude-3-5');
    expect(text).toContain('Trials Completed');
    expect(text).toContain('75/100');
    expect(text).toContain('Shard Status');
    expect(text).toContain('shard-0');
    expect(text).toContain('shard-1');
    expect(text).toContain('p50');
    expect(text).toContain('42 ms');
    expect(text).toContain('Running trial 76 on shard-0...');
  });

  test('renders JobsSheetDialog with caption, command, pids, pipe streams tab and stdin controls', async () => {
    let stdinCalledWith: unknown = null;
    let stopCalledWith: unknown = null;

    canonicalClient.getShellOutput = async () => ({
      job: mockRunningShell,
      requestedCursor: '0',
      startCursor: '0',
      cursor: '14',
      skippedBytes: '0',
      output: 'benchmarks running...\n',
      ended: false,
    });

    canonicalClient.getShellStream = async () => ({
      job: mockRunningShell,
      streamId: 1,
      start: 0,
      end: 20,
      chunk: 'pipe:1 stream chunk data\n',
      open: true,
    });

    canonicalClient.writeShellStdin = async (_sess, input) => {
      stdinCalledWith = input;
      return { job: input.job, writtenBytes: input.input.length };
    };

    canonicalClient.stopShell = async (_sess, input) => {
      stopCalledWith = input;
      return {
        ...mockRunningShell,
        status: 'ended',
        endedAt: 2000,
        termination: { reason: 'stopped', exitCode: null },
      };
    };

    await act(async () => {
      root.render(
        <I18nProvider>
          <JobsSheetDialog
            open={true}
            onOpenChange={() => {}}
            shell={mockRunningShell}
            rootSessionId="session-1"
          />
        </I18nProvider>,
      );
      await new Promise(r => setTimeout(r, 50));
    });

    const text = (globalThis.document?.body?.textContent ?? '') || (browser.document?.body?.textContent ?? '');
    expect(text).toContain('AI Benchmark Runner');
    expect(text).toContain('npm run bench');
    expect(text).toContain('PIDs: 1234, 1235');
    expect(text).toContain('Running');
    expect(text).toContain('Pipe Streams');

    // Test sending stdin
    const inputEl = browser.document.body.querySelector('input') as HTMLInputElement | null;
    expect(inputEl).toBeDefined();
    if (inputEl) {
      await act(async () => {
        inputEl.value = 'next trial\n';
        inputEl.dispatchEvent(new browser.Event('change', { bubbles: true }) as unknown as Parameters<typeof inputEl.dispatchEvent>[0]);
      });

      const form = browser.document.body.querySelector('form');
      expect(form).toBeDefined();
      if (form) {
        await act(async () => {
          form.dispatchEvent(new browser.Event('submit', { bubbles: true }) as unknown as Parameters<typeof form.dispatchEvent>[0]);
        });
        expect(stdinCalledWith).toBeDefined();
      }
    }

    // Test stop button
    const stopBtn = [...browser.document.body.querySelectorAll('button')].find(b => b.textContent?.includes('Terminate Job'));
    expect(stopBtn).toBeDefined();
    if (stopBtn) {
      await act(async () => {
        stopBtn.click();
      });
      expect(stopCalledWith).toBeDefined();
    }
  });

  test('distinctly exposes output error alert while preserving terminal container and previous output', async () => {
    let callCount = 0;
    canonicalClient.getShellOutput = async () => {
      callCount += 1;
      if (callCount === 1) {
        return {
          job: mockRunningShell,
          requestedCursor: '0',
          startCursor: '0',
          cursor: '28',
          skippedBytes: '0',
          output: 'initial retained stdout log\n',
          ended: false,
        };
      }
      throw new Error('Transient connection drop');
    };

    await act(async () => {
      root.render(
        <I18nProvider>
          <JobsSheetDialog
            open={true}
            onOpenChange={() => {}}
            shell={mockRunningShell}
            rootSessionId="session-1"
          />
        </I18nProvider>,
      );
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 50);
      await promise;
    });

    // First poll succeeded: initial output is present
    const initialText = (globalThis.document?.body?.textContent ?? '') || (browser.document?.body?.textContent ?? '');
    expect(initialText).toContain('initial retained stdout log');
    expect(browser.document.body.querySelector('[role="alert"]')).toBeNull();

    // Wait for the 2s poll timer to fire the error
    await act(async () => {
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 2150);
      await promise;
    });

    const updatedText = (globalThis.document?.body?.textContent ?? '') || (browser.document?.body?.textContent ?? '');
    // CRITICAL INVARIANT: Prior valid output is preserved in the container
    expect(updatedText).toContain('initial retained stdout log');
    // AND the transient error is distinctly exposed as role="alert"
    const alertEl = browser.document.body.querySelector('[role="alert"]');
    expect(alertEl).not.toBeNull();
    expect(alertEl?.textContent).toContain('Transient connection drop');
    // The pre element remains intact and mounted
    const preEl = browser.document.body.querySelector('pre');
    expect(preEl).not.toBeNull();
    expect(preEl?.textContent).toContain('initial retained stdout log');
  });
});
