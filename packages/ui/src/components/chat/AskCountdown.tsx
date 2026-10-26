import React from 'react';

interface AskCountdownProps {
    timeoutMs?: number;
    requestedAt: number;
}

/** Displays the native OMP ask deadline while the pending CAS record is visible. */
export function AskCountdown({ timeoutMs, requestedAt }: AskCountdownProps) {
    const deadline = timeoutMs !== undefined && timeoutMs > 0 ? requestedAt + timeoutMs : undefined;
    const [remaining, setRemaining] = React.useState(() => deadline === undefined ? undefined : Math.max(0, deadline - Date.now()));

    React.useEffect(() => {
        if (deadline === undefined) return undefined;
        const update = () => setRemaining(Math.max(0, deadline - Date.now()));
        update();
        const timer = window.setInterval(update, 1000);
        return () => window.clearInterval(timer);
    }, [deadline]);

    if (remaining === undefined) return null;
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return (
        <span className={remaining <= 10_000 ? 'text-[var(--status-error)]' : 'text-muted-foreground'} aria-live="polite">
            {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
    );
}
