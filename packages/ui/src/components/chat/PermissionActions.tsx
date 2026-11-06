import React from 'react';
import type { ApprovalRequest } from '@openchamber/agent-contract';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { formatShortcutForDisplay } from '@/lib/shortcuts';
import type { PermissionResponse } from './usePermissionResponse';
import { getApprovalPolicyTitle } from './permissionPresentation';

/**
 * The native approval decisions. "Always allow" is the session-scoped
 * decision and exists only when the request carries a policy target; the Host
 * keeps the authorization decision. Both variants use the shared buttons; the
 * inline row tints its decisions with status tokens.
 */
export const PermissionActions: React.FC<{
    permission: ApprovalRequest;
    isResponding: boolean;
    onRespond: (response: PermissionResponse) => void;
    variant: 'inline' | 'dock';
}> = ({ permission, isResponding, onRespond, variant }) => {
    const { t } = useI18n();
    const hasSessionAllow = permission.policyTarget !== undefined;
    const ruleTitle = getApprovalPolicyTitle(permission);
    const alwaysAllowLabel = t('chat.permissionCard.alwaysAllow', { tool: permission.toolName });
    const alwaysTitle = permission.policyTarget && permission.policyTarget.pattern !== '*' ? ruleTitle : alwaysAllowLabel;

    if (variant === 'dock') {
        return (
            <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 pt-1">
                <Button variant="ghost" size="xs" disabled={isResponding} onClick={() => onRespond('reject')} className="text-[var(--status-error)]">
                    <Icon name="close" className="size-3.5" />
                    {t('chat.permissionCard.deny')}
                    <kbd className="ms-1 hidden sm:inline typography-micro opacity-60">{formatShortcutForDisplay('alt+backspace')}</kbd>
                </Button>
                <div className="min-w-0 flex-1" />
                {hasSessionAllow ? (
                    <Button variant="outline" size="xs" disabled={isResponding} onClick={() => onRespond('always')} title={alwaysTitle}>
                        <Icon name="time" className="size-3.5" />
                        <span className="max-w-[180px] truncate">{alwaysAllowLabel}</span>
                        <kbd className="ms-1 hidden sm:inline typography-micro opacity-60">{formatShortcutForDisplay('alt+shift+enter')}</kbd>
                    </Button>
                ) : null}
                <Button size="xs" disabled={isResponding} onClick={() => onRespond('once')}>
                    {isResponding ? <Icon name="loader-4" className="size-3.5 animate-spin" /> : <Icon name="check" className="size-3.5" />}
                    {t('chat.permissionCard.allowOnce')}
                    <kbd className="ms-1 hidden sm:inline typography-micro opacity-60">{formatShortcutForDisplay('alt+enter')}</kbd>
                </Button>
            </div>
        );
    }

    const rowClass = 'min-h-[32px] sm:min-h-0 w-full sm:w-auto justify-start sm:justify-center px-3 sm:px-2';

    return (
        <div className="px-2 pb-2 sm:pb-1.5 pt-1.5 sm:pt-1 flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-1.5 border-t border-border/20">
            <Button
                variant="ghost"
                size="xs"
                onClick={() => onRespond('once')}
                disabled={isResponding}
                className={cn(rowClass, 'text-status-success hover:text-status-success bg-status-success/10 hover:bg-status-success/20')}
            >
                <Icon name="check" className="size-3.5 flex-shrink-0" />
                {t('chat.permissionCard.allowOnce')}
                <kbd className="ms-1 hidden sm:inline typography-micro opacity-60">{formatShortcutForDisplay('alt+enter')}</kbd>
            </Button>

            {hasSessionAllow ? (
                <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onRespond('always')}
                    disabled={isResponding}
                    title={alwaysTitle}
                    className={cn(rowClass, 'text-muted-foreground bg-muted/50 hover:bg-muted/70 hover:text-muted-foreground')}
                >
                    <Icon name="time" className="size-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[180px]">{alwaysAllowLabel}</span>
                    <kbd className="ms-1 hidden sm:inline typography-micro opacity-60">{formatShortcutForDisplay('alt+shift+enter')}</kbd>
                </Button>
            ) : null}

            <Button
                variant="ghost"
                size="xs"
                onClick={() => onRespond('reject')}
                disabled={isResponding}
                className={cn(rowClass, 'text-status-error hover:text-status-error bg-status-error/10 hover:bg-status-error/20')}
            >
                <Icon name="close" className="size-3.5 flex-shrink-0" />
                {t('chat.permissionCard.deny')}
                <kbd className="ms-1 hidden sm:inline typography-micro opacity-60">{formatShortcutForDisplay('alt+backspace')}</kbd>
            </Button>

            {isResponding ? (
                <div className="flex justify-center w-full sm:w-auto sm:ms-auto py-1 sm:py-0 typography-meta text-muted-foreground">
                    <Icon name="loader-4" className="size-3 animate-spin" />
                </div>
            ) : null}
        </div>
    );
};
