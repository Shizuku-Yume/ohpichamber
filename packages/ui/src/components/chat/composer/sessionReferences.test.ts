import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';

import { canonicalClient } from '@/api/canonicalClient';
import * as runtimeSwitch from '@/lib/runtime-switch';
import { sessionMentionChip } from '@/lib/messages/sessionMentionChip';
import { useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { nativeHistory, nativeHostSession, nativeMessage, nativeSnapshot } from '@/sync/session-message-loader-test-fixtures';
import { loadSessionLinkReference, messageText, sessionMessageReference, sessionReference, sessionReferencesInText, type SessionReferencePart } from './sessionReferences';

const text = (value: string): SessionReferencePart => ({ type: 'text', text: value });
const context = { type: 'text', text: 'ctx', metadata: { openchamberContext: {} } };
const tool = { type: 'tool' };

describe('session references', () => {
  test('a mentioned session names itself and how to read it, with no request attached', () => {
    const reference = sessionReference({ id: 'ses_a', title: 'Tweet writing' });
    expect(reference.contextText).toBe('The user referenced another OpenChamber session, "Tweet writing" (ses_a). Its messages can be read with the openchamber tool (session.messages, sessionId ses_a).');
    expect(sessionMentionChip(reference)).toEqual({ label: 'Tweet writing', title: 'Tweet writing', icon: 'chat-3' });
  });

  test('a message goes whole: its own text, never attached context or tool output, and no cut', () => {
    const long = 'x'.repeat(30_000);
    expect(messageText([text(' First '), tool, context, text(long)])).toBe(`First\n\n${long}`);
    const reference = sessionMessageReference({ id: 'ses_a', title: 'Tweet writing' }, { info: { id: 'msg_a', role: 'assistant' }, parts: [text(`Line one\nline two ${long}`)] });
    if (reference?.kind !== 'session-message') throw new Error('expected a message reference');
    expect(reference.contextText.startsWith('The user attached a message from another OpenChamber session, "Tweet writing" (ses_a, message msg_a). It was written by the agent of that session. The message:\n\nLine one\nline two')).toBe(true);
    expect(reference.contextText.endsWith(long)).toBe(true);
    expect(sessionMentionChip(reference).label).toBe(`Line one line two ${'x'.repeat(29)}…`);
    expect(sessionMessageReference({ id: 'ses_a', title: 't' }, { info: { id: 'msg_a', role: 'user' }, parts: [tool] })).toBeNull();
  });

  test('the text decides what goes: each mention once, in order, and what is not resolved yet', () => {
    const resolved = new Map([['ses_a:', sessionReference({ id: 'ses_a', title: 'A' })]]);
    const found = sessionReferencesInText(
      'openchamber://session/ses_b?message=msg_1 then openchamber://session/ses_a, again openchamber://session/ses_a.',
      [],
      resolved,
    );
    expect(found.references.map((reference) => reference.sessionId)).toEqual(['ses_a']);
    expect(found.unresolved).toEqual([{ sessionId: 'ses_b', messageId: 'msg_1' }]);
  });

  describe('loading message links', () => {
    const original = useGlobalSessionsStore.getState();
    const snapshot = nativeSnapshot('ses_a');
    const target = { sessionId: 'ses_a', messageId: 'msg_target' };

    beforeEach(() => {
      useGlobalSessionsStore.setState({ hasLoaded: true, status: 'ready', activeSessions: [nativeHostSession(snapshot)], archivedSessions: [] });
    });
    afterEach(() => useGlobalSessionsStore.setState(original));

    test('resolves a session-only link without reading history', async () => {
      const history = spyOn(canonicalClient, 'getHistory');
      try {
        const reference = await loadSessionLinkReference({ sessionId: 'ses_a', messageId: null });
        expect(reference?.kind).toBe('session');
        expect(reference?.contextText).toContain('Saved title');
        expect(history).not.toHaveBeenCalled();
      } finally {
        history.mockRestore();
      }
    });

    test('finds a message on a later canonical history page', async () => {
      const first = nativeMessage('ses_a', 'msg_first');
      const linked = nativeMessage('ses_a', 'msg_target');
      const history = spyOn(canonicalClient, 'getHistory').mockImplementation(async (_sessionId, options = {}) => (
        options.cursor
          ? nativeHistory([linked], null, snapshot)
          : nativeHistory([first], 'older_cursor', snapshot)
      ));
      try {
        const reference = await loadSessionLinkReference(target);
        expect(reference?.kind).toBe('session-message');
        expect(reference?.contextText).toContain('msg_target');
        expect(history.mock.calls).toEqual([['ses_a'], ['ses_a', { cursor: 'older_cursor' }]]);
      } finally {
        history.mockRestore();
      }
    });

    test('returns unavailable when all pages are exhausted', async () => {
      const history = spyOn(canonicalClient, 'getHistory').mockImplementation(async (_sessionId, options = {}) => (
        options.cursor
          ? nativeHistory([], null, snapshot)
          : nativeHistory([nativeMessage('ses_a', 'msg_first')], 'older_cursor', snapshot)
      ));
      try {
        expect(await loadSessionLinkReference(target)).toBeNull();
        expect(history.mock.calls).toEqual([['ses_a'], ['ses_a', { cursor: 'older_cursor' }]]);
      } finally {
        history.mockRestore();
      }
    });

    test('returns unavailable when the first history read fails', async () => {
      const history = spyOn(canonicalClient, 'getHistory').mockRejectedValue(new Error('history unavailable'));
      try {
        expect(await loadSessionLinkReference(target)).toBeNull();
        expect(history.mock.calls).toEqual([['ses_a']]);
      } finally {
        history.mockRestore();
      }
    });

    test('returns unavailable when a later history page fails', async () => {
      const history = spyOn(canonicalClient, 'getHistory').mockImplementation(async (_sessionId, options = {}) => {
        if (options.cursor) throw new Error('history unavailable');
        return nativeHistory([], 'older_cursor', snapshot);
      });
      try {
        expect(await loadSessionLinkReference(target)).toBeNull();
        expect(history.mock.calls).toEqual([['ses_a'], ['ses_a', { cursor: 'older_cursor' }]]);
      } finally {
        history.mockRestore();
      }
    });

    test('does not dispatch another page to a different runtime', async () => {
      let runtime = 'host-a';
      const key = spyOn(runtimeSwitch, 'getRuntimeKey').mockImplementation(() => runtime);
      const history = spyOn(canonicalClient, 'getHistory').mockImplementation(async () => {
        runtime = 'host-b';
        return nativeHistory([], 'older_cursor', snapshot);
      });
      try {
        expect(await loadSessionLinkReference(target)).toBeNull();
        expect(history.mock.calls).toEqual([['ses_a']]);
      } finally {
        history.mockRestore();
        key.mockRestore();
      }
    });

    test('returns unavailable for a message with no readable text', async () => {
      const linked = { ...nativeMessage('ses_a', 'msg_target'), parts: [] };
      const history = spyOn(canonicalClient, 'getHistory').mockResolvedValue(nativeHistory([linked], null, snapshot));
      try {
        expect(await loadSessionLinkReference(target)).toBeNull();
      } finally {
        history.mockRestore();
      }
    });
  });
});
