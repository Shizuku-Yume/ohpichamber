import React from 'react';

interface UseStreamingTextThrottleInput {
    text: string;
    isStreaming: boolean;
    throttleMs?: number;
    identityKey?: string;
    allowTextReplacement?: boolean;
}

const DEFAULT_STREAMING_TEXT_THROTTLE_MS = 100;

export const getStreamingThrottleText = (
    current: string,
    next: string,
    isStreaming: boolean,
    allowTextReplacement: boolean,
): string => {
    return isStreaming && !allowTextReplacement && current.length > next.length ? current : next;
};

const computeStreamingThrottleDelay = (lastEmitAt: number, now: number, throttleMs: number): number => {
    const elapsed = now - lastEmitAt;
    return Math.max(0, throttleMs - elapsed);
};

interface StreamingThrottleState {
    timer: ReturnType<typeof setTimeout> | null;
    pendingText: string;
    lastEmitAt: number;
    /**
     * Whether this stream has shown any text yet. The leading edge is free:
     * the first change after a stream starts renders on the frame it arrives,
     * so the reply begins visibly at once. Later changes coalesce to one
     * update per throttle window.
     */
    emitted: boolean;
}

const clearTimer = (state: StreamingThrottleState): void => {
    if (!state.timer) {
        return;
    }
    clearTimeout(state.timer);
    state.timer = null;
};

export const useStreamingTextThrottle = ({
    text,
    isStreaming,
    throttleMs = DEFAULT_STREAMING_TEXT_THROTTLE_MS,
    identityKey,
    allowTextReplacement = false,
}: UseStreamingTextThrottleInput): string => {
    const [throttledText, setThrottledText] = React.useState(text);
    const latestTextRef = React.useRef(text);
    const throttledTextRef = React.useRef(throttledText);

    const stateRef = React.useRef<StreamingThrottleState>({
        timer: null,
        pendingText: text,
        lastEmitAt: 0,
        emitted: false,
    });

    React.useEffect(() => {
        latestTextRef.current = text;
    }, [text]);

    React.useEffect(() => {
        throttledTextRef.current = throttledText;
    }, [throttledText]);

    React.useEffect(() => {
        const state = stateRef.current;
        clearTimer(state);
        state.pendingText = latestTextRef.current;
        state.lastEmitAt = 0;
        state.emitted = false;
        setThrottledText(latestTextRef.current);
    }, [identityKey]);

    React.useEffect(() => {
        const state = stateRef.current;
        state.pendingText = text;
        const currentThrottled = throttledTextRef.current;
        const stableText = getStreamingThrottleText(currentThrottled, text, isStreaming, allowTextReplacement);

        if (!isStreaming) {
            clearTimer(state);
            state.lastEmitAt = Date.now();
            state.emitted = false;
            if (stableText !== currentThrottled) {
                setThrottledText(stableText);
            }
            return;
        }

        if (stableText === currentThrottled) {
            // Nothing new to show; a stale scheduled update would only repeat it.
            clearTimer(state);
            return;
        }

        const now = Date.now();
        const remaining = state.emitted
            ? computeStreamingThrottleDelay(state.lastEmitAt, now, throttleMs)
            : 0;

        if (remaining <= 0) {
            clearTimer(state);
            state.lastEmitAt = now;
            state.emitted = true;
            setThrottledText(stableText);
            return;
        }

        clearTimer(state);
        state.timer = setTimeout(() => {
            state.timer = null;
            state.lastEmitAt = Date.now();
            state.emitted = true;
            setThrottledText((prev) => {
                return getStreamingThrottleText(prev, state.pendingText, isStreaming, allowTextReplacement);
            });
        }, remaining);

        return () => {
            clearTimer(state);
        };
    }, [allowTextReplacement, isStreaming, text, throttleMs]);

    React.useEffect(() => {
        const state = stateRef.current;
        return () => {
            clearTimer(state);
        };
    }, []);

    // Leading edge during render: before the stream has shown anything, the
    // text on screen is the text that arrived, so the first token lands in the
    // commit that delivers it instead of waiting for the effect that commits
    // the throttled value after paint. There is nothing to coalesce yet.
    return isStreaming && throttledText.length === 0
        ? getStreamingThrottleText('', text, isStreaming, allowTextReplacement)
        : throttledText;
};
