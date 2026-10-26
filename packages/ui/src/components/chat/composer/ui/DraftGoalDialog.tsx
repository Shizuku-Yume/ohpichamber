import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { MobileOverlayPanel } from '@/components/ui/MobileOverlayPanel';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { SESSION_GOAL_OBJECTIVE_CHAR_LIMIT } from '@/lib/sessionGoalMetadata';
import { useI18n } from '@/lib/i18n';
import { useUIStore } from '@/stores/useUIStore';
import type { DraftGoalObjective } from '@/sync/session-ui-store';

interface DraftGoalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialGoal: DraftGoalObjective | null;
    onSave: (goal: DraftGoalObjective) => void;
}

/** Captures the objective a draft's Goal mode will create once the session exists. */
export function DraftGoalDialog({ open, onOpenChange, initialGoal, onSave }: DraftGoalDialogProps) {
    const isMobile = useUIStore((state) => state.isMobile);
    const [objective, setObjective] = React.useState('');
    const [budgetEnabled, setBudgetEnabled] = React.useState(false);
    const [tokenBudget, setTokenBudget] = React.useState(200_000);

    React.useEffect(() => {
        if (!open) return;
        setObjective(initialGoal?.objective ?? '');
        setBudgetEnabled(initialGoal?.tokenBudget !== null && initialGoal?.tokenBudget !== undefined);
        setTokenBudget(initialGoal?.tokenBudget ?? 200_000);
    }, [initialGoal, open]);

    const { t } = useI18n();
    const trimmedObjective = objective.trim();
    const save = () => {
        if (!trimmedObjective) return;
        onSave({ objective: trimmedObjective, tokenBudget: budgetEnabled ? tokenBudget : null });
        onOpenChange(false);
    };
    const body = (
        <div className="space-y-3">
            <div className="space-y-1">
                <span className="typography-ui-label">{t('chat.goal.dialog.objectiveLabel')}</span>
                <Textarea value={objective} onChange={(event) => setObjective(event.target.value)} placeholder={t('chat.goal.dialog.objectivePlaceholder')} maxLength={SESSION_GOAL_OBJECTIVE_CHAR_LIMIT} rows={4} />
            </div>
            <div className="flex items-center gap-2">
                <Checkbox checked={budgetEnabled} onChange={setBudgetEnabled} ariaLabel={t('chat.goal.dialog.budgetLabel')} />
                <span>{t('chat.goal.dialog.budgetLabel')}</span>
                {budgetEnabled ? <NumberInput value={tokenBudget} onValueChange={(value) => setTokenBudget(value > 0 ? Math.floor(value) : 1000)} min={1000} max={100_000_000} step={50_000} /> : null}
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>{t('chat.goal.action.cancel')}</Button>
                <Button size="sm" disabled={trimmedObjective.length === 0} onClick={save}>{t('chat.goal.action.start')}</Button>
            </div>
        </div>
    );

    if (isMobile) {
        return open ? <MobileOverlayPanel open title={t('chat.goal.dialog.titleCreate')} onClose={() => onOpenChange(false)}>{body}</MobileOverlayPanel> : null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('chat.goal.dialog.titleCreate')}</DialogTitle>
                </DialogHeader>
                {body}
            </DialogContent>
        </Dialog>
    );
}
