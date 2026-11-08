import { useEffect, useRef } from 'react';
import type { Turn } from '@openchamber/agent-contract';

import { claimReplyForAutoRead } from '@/lib/messages/autoReadClaims';
import type { LatestReply } from '@/lib/messages/latestReply';
import { isCapacitorApp } from '@/lib/platform';
import type { PlayMessageTTSOptions } from './useMessageTTS';

export interface AutoReadAloudOptions {
 /** Identity of the session on screen; a switch starts a new baseline. */
 sessionKey: string;
 /** The session's message history is loaded for this session. */
 ready: boolean;
 /** The session is running a turn. */
 sessionIsActive: boolean;
 /** The answer to the session's newest prompt, or null when there is none. */
 reply: LatestReply | null;
 /** The session's turns: the newest one is the prompt whose answer may be read. */
 turns: readonly Turn[];
 enabled: boolean;
 play: (text: string, options?: PlayMessageTTSOptions) => Promise<void>;
 /** Claims a reply across windows so only one of them reads it. */
 claim?: (messageId: string) => Promise<boolean>;
}

/**
 * Reads the answer to the newest prompt after a turn this surface watched run.
 *
 * The guard is two turn ids, not a history set. `observedLiveTurnId` records the
 * turn this ready, visible surface saw running or waiting on the user; only
 * completing that same turn may start speech. Everything else is silent by
 * construction: history that arrives already finished, a page of older turns
 * fetched later, an answer that becomes newest again after a revert, and a
 * second window showing the same session all fail the id comparison, so
 * playback needs no per-message bookkeeping to stay quiet.
 */
export const useAutoReadAloud = ({
 sessionKey,
 ready,
 sessionIsActive,
 reply,
 turns,
 enabled,
 play,
 claim = claimReplyForAutoRead,
}: AutoReadAloudOptions): void => {
 const activeSessionKeyRef = useRef<string | null>(null);
 const observedLiveTurnIdRef = useRef<string | null>(null);
 const handledTurnIdRef = useRef<string | null>(null);
 const nativeMobile = isCapacitorApp();
 const foregroundRef = useRef(!nativeMobile);
 const backgroundEpochRef = useRef(0);
 const currentRef = useRef({ sessionKey, enabled, reply, turns });
 currentRef.current = { sessionKey, enabled, reply, turns };

 useEffect(() => {
  if (!enabled) backgroundEpochRef.current += 1;
 }, [enabled]);

 useEffect(() => {
  let disposed = false;
  let removeNativeListener: (() => void) | undefined;
  const onVisibility = () => {
   if (document.visibilityState === 'hidden') backgroundEpochRef.current += 1;
  };
  if (nativeMobile) {
   document.addEventListener('visibilitychange', onVisibility);
   void import('@capacitor/app').then(async ({ App }) => {
    let stateChanged = false;
    const listener = await App.addListener('appStateChange', ({ isActive }) => {
     stateChanged = true;
     foregroundRef.current = isActive;
     if (!isActive) backgroundEpochRef.current += 1;
    });
    if (disposed) {
     void listener.remove();
     return;
    }
    removeNativeListener = () => void listener.remove();
    const state = await App.getState();
    if (!disposed && !stateChanged) foregroundRef.current = state.isActive;
   }).catch(() => {
    // Unknown native state must not authorize automatic speech.
    foregroundRef.current = false;
   });
  }
  return () => {
   disposed = true;
   backgroundEpochRef.current += 1;
   if (nativeMobile) document.removeEventListener('visibilitychange', onVisibility);
   removeNativeListener?.();
  };
 }, [nativeMobile]);

 useEffect(() => {
  if (activeSessionKeyRef.current !== sessionKey) {
   backgroundEpochRef.current += 1;
   activeSessionKeyRef.current = sessionKey;
   observedLiveTurnIdRef.current = null;
   handledTurnIdRef.current = null;
  }

  if (!ready) return;

  const liveTurnId = turns.at(-1)?.turnId ?? null;
  // A turn counts as watched only while it is open on this surface.
  if (sessionIsActive && liveTurnId) {
   observedLiveTurnIdRef.current = liveTurnId;
   return;
  }

  const newestTurn = turns.at(-1);
  if (!newestTurn) return;
  const replyTurnId = reply ? newestTurn.turnId : null;
  if (!reply || !replyTurnId) return;
  // The turn itself has the final word: a failed or cancelled run can hand a
  // caller partial text, and that must never be spoken.
  if (newestTurn.status !== 'completed') return;
  if (observedLiveTurnIdRef.current !== replyTurnId) return;
  if (handledTurnIdRef.current === replyTurnId) return;
  if (!enabled) return;

  handledTurnIdRef.current = replyTurnId;
  const epoch = backgroundEpochRef.current;
  const { messageId, text } = reply;
  const canStart = () => (!nativeMobile || (foregroundRef.current && document.visibilityState !== 'hidden'))
   && backgroundEpochRef.current === epoch
   && currentRef.current.enabled
   && currentRef.current.sessionKey === sessionKey
   && currentRef.current.reply?.messageId === messageId;
  if (!canStart()) return;
  void claim(messageId).then((claimed) => {
   if (claimed && canStart()) void play(text, { canStart });
  }).catch((error) => console.warn('[useAutoReadAloud] Claim failed:', error));
 }, [claim, enabled, nativeMobile, play, ready, reply, sessionIsActive, sessionKey, turns]);
};
