import React from 'react';
import { toast } from 'sonner';
import type { SessionMode } from '@openchamber/agent-contract';
import { canonicalClient } from '@/api/canonicalClient';
import { Icon } from '@/components/icon/Icon';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type ComposerModeSelectorProps = {
    sessionId: string | null;
    mode: SessionMode | undefined;
    runActive: boolean;
    buttonClass: string;
    iconSizeClass: string;
};

/** The session mode is projected by OMP; this control never keeps a local selection. */
export const ComposerModeSelector = React.memo(function ComposerModeSelector({
    sessionId, mode, runActive, buttonClass, iconSizeClass,
}: ComposerModeSelectorProps) {
    const { t } = useI18n();
    const [pending, setPending] = React.useState(false);
    const selected = mode?.kind ?? 'main';
    const disabled = !sessionId || !mode || runActive || pending;
    const setMode = React.useCallback(async (next: 'main' | 'plan' | 'vibe') => {
        if (!sessionId || disabled || next === selected) return;
        setPending(true);
        try {
            await canonicalClient.setMode(sessionId, next);
        } catch (error) {
            toast.error(t('sessions.sidebar.session.work.updateFailed'), {
                description: error instanceof Error ? error.message : undefined,
            });
        } finally {
            setPending(false);
        }
    }, [disabled, selected, sessionId, t]);

    return (
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label={t('chat.chatInput.mode.label')}>
            <button
                type="button"
                className={cn(buttonClass, selected === 'main' && 'bg-muted text-foreground')}
                onClick={() => void setMode('main')}
                disabled={disabled}
                role="radio"
                aria-checked={selected === 'main'}
                aria-label={t('chat.chatInput.mode.main')}
                title={t('chat.chatInput.mode.main')}
            >
                <Icon name="chat-3" className={iconSizeClass} />
                <span className="sr-only">{t('chat.chatInput.mode.main')}</span>
            </button>
            <button
                type="button"
                className={cn(buttonClass, selected === 'plan' && 'bg-muted text-foreground')}
                onClick={() => void setMode('plan')}
                disabled={disabled}
                role="radio"
                aria-checked={selected === 'plan'}
                aria-label={t('chat.chatInput.mode.plan')}
                title={t('chat.chatInput.mode.plan')}
            >
                <Icon name="file-text" className={iconSizeClass} />
                <span className="sr-only">{t('chat.chatInput.mode.plan')}</span>
            </button>
            <button
                type="button"
                className={cn(buttonClass, selected === 'vibe' && 'bg-muted text-foreground')}
                onClick={() => void setMode('vibe')}
                disabled={disabled}
                role="radio"
                aria-checked={selected === 'vibe'}
                aria-label={t('chat.chatInput.mode.vibe')}
                title={t('chat.chatInput.mode.vibe.description')}
            >
                <Icon name="sparkling" className={iconSizeClass} />
                <span className="sr-only">{t('chat.chatInput.mode.vibe')}</span>
            </button>
        </div>
    );
});
