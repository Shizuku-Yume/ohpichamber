import React from 'react';
import { AnimatePresence } from 'motion/react';
import { ComposerFloatingPanel } from '../composer/ui/ComposerFloatingPanel';
import { useI18n } from '@/lib/i18n';
import { canonicalClient } from '@/api/canonicalClient';
import { isIMECompositionEvent } from '@/lib/ime';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icon/Icon';
import { useBtwStore } from '@/stores/useBtwStore';
import type { BtwPanelState } from './useBtwPanelState';

/** The transient `/btw` answer panel. */
const BtwPanelView: React.FC<{ parentSessionId: string; panel: BtwPanelState; onExit: () => void }> = ({
    parentSessionId,
    panel,
    onExit,
}) => {
    const { t } = useI18n();
    React.useEffect(() => {
        if (panel.collapsed || (!panel.pending && !panel.ephemeralRecordId)) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || event.defaultPrevented || isIMECompositionEvent(event)) return;
            event.preventDefault();
            onExit();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onExit, panel.collapsed, panel.ephemeralRecordId, panel.pending]);

    const setCollapsed = React.useCallback((collapsed: boolean) => {
        useBtwStore.getState().setPanelState(parentSessionId, { collapsed });
    }, [parentSessionId]);
    let content: React.ReactNode = null;
    if (panel.ephemeralRecordId) {
        content = <div className="max-h-48 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-sm">{panel.ephemeralText || t('chat.btw.loading')}</div>;
    } else if (panel.pending) {
        content = <div className="px-4 py-3 text-sm text-muted-foreground">{t('chat.btw.draftHint')}</div>;
    }

    const stage = content === null ? null : (
        <ComposerFloatingPanel
            role="dialog"
            ariaLabel="btw"
            compact={panel.collapsed}
            header={(
                <>
                    <button
                        type="button"
                        onClick={() => setCollapsed(!panel.collapsed)}
                        aria-label={panel.collapsed ? t('chat.btw.expandAria') : t('chat.btw.collapseAria')}
                        title={panel.collapsed ? t('chat.btw.expandAria') : t('chat.btw.collapseAria')}
                        className="flex min-w-0 items-center gap-2 text-left text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {panel.ephemeralStatus === 'running'
                            ? <Icon name="loader-4" className="size-3.5 shrink-0 animate-spin" />
                            : <Icon name="chat-ai-3" className="size-3.5 shrink-0" />}
                        <Icon name={panel.collapsed ? 'arrow-up-s' : 'arrow-down-s'} className="size-4 shrink-0" />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{t('chat.btw.draftHint')}</span>
                    {panel.ephemeralRecordId ? (
                        <Button type="button" variant="ghost" size="icon" onClick={() => void canonicalClient.cancelBtw(parentSessionId)} aria-label={t('chat.btw.cancelAria')}>
                            <Icon name="close" className="size-4" />
                        </Button>
                    ) : (
                        <Button type="button" variant="ghost" size="icon" onClick={onExit} aria-label={t('chat.btw.cancelAria')} title={t('chat.btw.cancelAria')}>
                            <Icon name="close" className="size-4" />
                        </Button>
                    )}
                </>
            )}
        >
            {panel.collapsed ? null : <>{content}<div className="h-2" /></>}
        </ComposerFloatingPanel>
    );
    return <AnimatePresence>{stage}</AnimatePresence>;
};

export const BtwPanel = React.memo(BtwPanelView);
