import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toast } from 'sonner';
import { ProblemDetailsSchema } from '@openchamber/agent-contract';

import { CanonicalApiError } from '@/api/canonicalClient';
import { Toaster } from '@/components/ui/sonner';
import { problemMessage } from './problemMessage';

const SENTINEL = 'SENTINEL_CAUSE_4f1c9a2e';

describe('a problem cause reaches the rendered toast', () => {
  let dom: Window;
  let root: Root;

  beforeEach(() => {
    dom = new Window({ url: 'http://toast.test' });
    Object.assign(globalThis, {
      window: dom, document: dom.document, navigator: dom.navigator,
      HTMLElement: dom.HTMLElement, Element: dom.Element, Node: dom.Node,
      MutationObserver: dom.MutationObserver,
      getComputedStyle: dom.getComputedStyle.bind(dom),
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    const host = dom.document.createElement('div');
    dom.document.body.append(host);
    root = createRoot(host as unknown as Element);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    toast.dismiss();
    dom.close();
  });

  test('the toast shows the cause the Agent Service wrote, not a translated fallback', async () => {
    await act(async () => root.render(<Toaster />));
    const error = new CanonicalApiError(ProblemDetailsSchema.parse({
      type: 'urn:ohpichamber:problem:SESSION_NOT_FOUND', title: 'Session not found',
      status: 404, detail: `BTW record not found: ${SENTINEL}`, code: 'SESSION_NOT_FOUND', retryable: false,
    }));
    await act(async () => {
      toast.error(problemMessage(error, 'The /btw branch could not be created.'));
    });
    for (let tries = 0; tries < 100; tries += 1) {
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
      if (dom.document.querySelector('[data-sonner-toast]')?.textContent?.includes(SENTINEL)) break;
    }
    const text = dom.document.querySelector('[data-sonner-toast]')?.textContent ?? '';
    expect(text).toContain(SENTINEL);
    expect(text).not.toContain('could not be created');
  });
});
