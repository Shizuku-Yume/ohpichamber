import React from 'react';
import { toast } from 'sonner';
import type { SessionMode } from '@openchamber/agent-contract';
import { canonicalClient } from '@/api/canonicalClient';
import { Icon } from '@/components/icon/Icon';
import type { IconName } from '@/components/icon/icons';
import { SessionGoalDialog } from '@/components/chat/SessionGoalDialog';
import { DraftGoalDialog } from '@/components/chat/composer/ui/DraftGoalDialog';
import { Input } from '@/components/ui/input';
import { MobileOverlayPanel } from '@/components/ui/MobileOverlayPanel';
import { ScrollableOverlay } from '@/components/ui/ScrollableOverlay';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getDropdownNavigationKey, handleDropdownNavigationKey } from '@/components/ui/dropdown-navigation';
import { isIMECompositionEvent } from '@/lib/ime';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DraftGoalObjective, DraftSessionMode } from '@/sync/session-ui-store';
import {
    MODE_DESCRIPTION_KEYS,
    MODE_LABEL_KEYS,
    buildModeOptions,
    filterModeOptions,
    nextEnabledModeIndex,
    type ComposerModeValue,
    type ModeOption,
    type NavigationDirection,
} from './modePickerOptions';

export type { ComposerModeValue } from './modePickerOptions';

type ComposerModeSelectorProps = {
    sessionId: string | null;
    /** True while the composer is a new-session draft. */
    draftOpen: boolean;
    /** Authoritative snapshot mode; absent in a draft. */
    mode?: SessionMode;
    draftMode?: DraftSessionMode;
    draftGoalObjective?: DraftGoalObjective | null;
    runActive: boolean;
    /** The workspace model catalog's OMP `plan` role resolution. */
    planRoleAvailable: boolean | undefined;
    sessionGoalEnabled: boolean;
    directory?: string;
    isMobile?: boolean;
    /** Starts the picker open; the default is closed. */
    defaultOpen?: boolean;
    onDraftModeChange: (mode: ComposerModeValue, goalObjective?: DraftGoalObjective | null) => void;
};

const MODE_ICONS = {
    main: 'chat-3',
    plan: 'file-text',
    vibe: 'sparkling',
    goal: 'target',
} satisfies Record<ComposerModeValue, IconName>;

/**
 * One searchable mode picker in the old agent-picker slot. Main/Plan/Vibe use
 * the canonical mode control; Goal owns its objective through the native goal
 * control. A draft keeps its choice until the session exists.
 */
export const ComposerModeSelector = React.memo(function ComposerModeSelector({
    sessionId,
    draftOpen,
    mode,
    draftMode,
    draftGoalObjective,
    runActive,
    planRoleAvailable,
    sessionGoalEnabled,
    directory,
    isMobile = false,
    defaultOpen = false,
    onDraftModeChange,
}: ComposerModeSelectorProps) {
    const { t } = useI18n();
    const [open, setOpen] = React.useState(defaultOpen);
    const [query, setQuery] = React.useState('');
    const [pending, setPending] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const [goalDialogOpen, setGoalDialogOpen] = React.useState(false);
    const [draftGoalDialogOpen, setDraftGoalDialogOpen] = React.useState(false);
    const searchRef = React.useRef<HTMLInputElement>(null);
    const itemRefs = React.useRef<Array<HTMLElement | null>>([]);

    const selectedKind: ComposerModeValue = sessionId ? mode?.kind ?? 'main' : draftMode ?? 'main';
    const triggerDisabled = pending || (sessionId ? !mode || runActive : !draftOpen);
    const selectedLabel = t(MODE_LABEL_KEYS[selectedKind]);
    const selectedDescription = t(MODE_DESCRIPTION_KEYS[selectedKind]);

    const options = React.useMemo(() => filterModeOptions(buildModeOptions({
        planRoleAvailable,
        sessionGoalEnabled,
        selectedKind,
        translate: (key) => t(key),
    }), query), [planRoleAvailable, query, selectedKind, sessionGoalEnabled, t]);

    React.useEffect(() => {
        if (!open) return;
        setQuery('');
        // The menu focuses its first item when it mounts; take focus back for
        // typing to filter on the next task.
        const timer = setTimeout(() => searchRef.current?.focus(), 0);
        return () => clearTimeout(timer);
    }, [open]);

    React.useEffect(() => {
        if (!open) {
            setActiveIndex(-1);
            return;
        }
        const selectedIndex = options.findIndex((option) => option.value === selectedKind && !option.disabledReason);
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : options.findIndex((option) => !option.disabledReason));
    }, [open, options, selectedKind]);

    const choose = React.useCallback((value: ComposerModeValue) => {
        if (value === 'goal') {
            setOpen(false);
            if (sessionId) setGoalDialogOpen(true);
            else if (draftOpen) setDraftGoalDialogOpen(true);
            return;
        }
        if (sessionId) {
            setOpen(false);
            if (pending || runActive || !mode || value === selectedKind) return;
            setPending(true);
            canonicalClient.setMode(sessionId, value)
                .catch((error) => {
                    toast.error(t('sessions.sidebar.session.work.updateFailed'), {
                        description: error instanceof Error ? error.message : undefined,
                    });
                })
                .finally(() => setPending(false));
            return;
        }
        if (!draftOpen) return;
        setOpen(false);
        onDraftModeChange(value, null);
    }, [draftOpen, mode, onDraftModeChange, pending, runActive, selectedKind, sessionId, t]);

    const chooseActive = React.useCallback(() => {
        const option = options[activeIndex] ?? options.find((candidate) => !candidate.disabledReason);
        if (!option || option.disabledReason) return;
        choose(option.value);
    }, [activeIndex, choose, options]);

    const moveFrom = React.useCallback((from: number, direction: NavigationDirection) => {
        const index = nextEnabledModeIndex(options, from, direction);
        if (index < 0) return;
        itemRefs.current[index]?.focus();
        setActiveIndex(index);
    }, [options]);

    const handleNavigation = React.useCallback((event: React.KeyboardEvent, from: number): boolean => {
        if (isIMECompositionEvent(event)) return true;
        if (handleDropdownNavigationKey(event, (key) => moveFrom(from, key === 'ArrowDown' ? 1 : -1))) return true;
        const navigation = getDropdownNavigationKey(event) ?? (event.key === 'ArrowDown' || event.key === 'ArrowUp' ? event.key : null);
        if (!navigation) return false;
        event.preventDefault();
        event.stopPropagation();
        moveFrom(from, navigation === 'ArrowDown' ? 1 : -1);
        return true;
    }, [moveFrom]);

    const handleSearchKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (handleNavigation(event, activeIndex)) return;
        if (event.key === 'Enter') {
            event.preventDefault();
            chooseActive();
            return;
        }
        // Keep menu typeahead out of the search field; Tab and Escape still
        // reach their normal focus and close behavior.
        if (event.key !== 'Escape' && event.key !== 'Tab') event.stopPropagation();
    }, [activeIndex, chooseActive, handleNavigation]);

    const handleItemKeyDown = React.useCallback((event: React.KeyboardEvent, index: number) => {
        if (handleNavigation(event, index)) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const option = options[index];
        if (!option || option.disabledReason) return;
        event.preventDefault();
        event.stopPropagation();
        choose(option.value);
    }, [choose, handleNavigation, options]);

    const optionRow = (option: ModeOption) => (
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
                <Icon name={MODE_ICONS[option.value]} className="size-4 flex-shrink-0" />
                <span className={cn('truncate font-medium', option.value === selectedKind && 'text-foreground')}>{option.label}</span>
                {option.value === selectedKind ? <Icon name="check" className="ms-auto size-4 flex-shrink-0 text-primary" /> : null}
            </span>
            <span className="ps-[1.375rem] text-start typography-micro text-muted-foreground">{option.description}</span>
            {option.disabledReason ? <span className="ps-[1.375rem] text-start typography-micro text-muted-foreground">{option.disabledReason}</span> : null}
        </span>
    );

    const tooltip = (
        <TooltipContent side="top" sideOffset={6}>
            <div className="flex max-w-[240px] flex-col gap-0.5 text-center">
                <span className="font-medium">{selectedLabel}</span>
                <span className="typography-meta opacity-70">{selectedDescription}</span>
            </div>
        </TooltipContent>
    );

    const triggerClass = cn(
        'flex min-w-0 items-center gap-1.5 transition-colors focus-visible:outline-none',
        isMobile
            ? 'h-[26px] rounded-lg px-1 typography-micro font-medium'
            : 'h-6 typography-meta font-medium',
        triggerDisabled ? 'cursor-not-allowed opacity-60' : isMobile ? 'text-foreground/80 hover:bg-[var(--interactive-hover)]' : 'cursor-pointer hover:opacity-70',
    );

    const searchField = (id: string) => (
        <div className="relative">
            <Icon name="search" className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
                id={id}
                ref={searchRef}
                type="text"
                aria-label={t('chat.chatInput.mode.search')}
                autoComplete="off"
                placeholder={t('chat.chatInput.mode.search')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="h-8 ps-8 typography-meta"
            />
        </div>
    );

    const emptyState = options.length === 0
        ? <div role="status" className="px-2 py-4 text-center typography-meta text-muted-foreground">{t('chat.chatInput.mode.empty')}</div>
        : null;

    const goalDialogs = (
        <>
            {sessionId ? <SessionGoalDialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen} sessionId={sessionId} directory={directory} /> : null}
            {sessionId ? null : <DraftGoalDialog open={draftGoalDialogOpen} onOpenChange={setDraftGoalDialogOpen} initialGoal={draftGoalObjective ?? null} onSave={(goal) => onDraftModeChange('goal', goal)} />}
        </>
    );

    if (isMobile) {
        return (
            <>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            disabled={triggerDisabled}
                            onClick={() => setOpen(true)}
                            onMouseDown={(event) => event.preventDefault()}
                            aria-label={selectedLabel}
                            aria-haspopup="dialog"
                            aria-expanded={open}
                            className={triggerClass}
                        >
                            <Icon name={MODE_ICONS[selectedKind]} className="size-4 flex-shrink-0" />
                            <span className="truncate">{selectedLabel}</span>
                            <Icon name="arrow-down-s" className="size-4 flex-shrink-0 opacity-60" />
                        </button>
                    </TooltipTrigger>
                    {tooltip}
                </Tooltip>
                {open ? (
                    <MobileOverlayPanel open title={t('chat.chatInput.mode.label')} onClose={() => setOpen(false)} contentMaxHeightClassName="max-h-[min(52dvh,360px)]">
                        <div className="p-2">{searchField('composer-mode-search-mobile')}</div>
                        <ScrollableOverlay outerClassName="min-h-0 flex-1">
                            <div id="composer-mode-options-mobile" role="listbox" aria-label={t('chat.chatInput.mode.label')} className="flex flex-col gap-1 p-1">
                                {emptyState}
                                {options.map((option, index) => {
                                    const row = (
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={option.value === selectedKind}
                                            aria-disabled={option.disabledReason ? true : undefined}
                                            onClick={() => { if (!option.disabledReason) choose(option.value); }}
                                            onKeyDown={(event) => handleItemKeyDown(event, index)}
                                            className={cn(
                                                'flex w-full min-w-0 items-start rounded-lg px-2 py-1.5 text-start',
                                                option.disabledReason ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-interactive-hover',
                                                option.value === selectedKind && !option.disabledReason && 'bg-interactive-selection text-interactive-selection-foreground',
                                            )}
                                        >
                                            {optionRow(option)}
                                        </button>
                                    );
                                    if (!option.disabledReason) return <React.Fragment key={option.value}>{row}</React.Fragment>;
                                    return (
                                        <Tooltip key={option.value}>
                                            <TooltipTrigger asChild>
                                                <span tabIndex={0} aria-label={option.disabledReason} className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring" onKeyDown={(event) => handleItemKeyDown(event, index)}>
                                                    {row}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" sideOffset={6}>{option.disabledReason}</TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </ScrollableOverlay>
                    </MobileOverlayPanel>
                ) : null}
                {goalDialogs}
            </>
        );
    }

    return (
        <>
            <Tooltip delayDuration={300}>
                <DropdownMenu open={open} onOpenChange={setOpen}>
                    <TooltipTrigger asChild>
                        <span className="inline-flex min-w-0">
                            <DropdownMenuTrigger asChild nativeButton>
                                <button
                                    type="button"
                                    disabled={triggerDisabled}
                                    aria-label={t('chat.chatInput.mode.label')}
                                    aria-haspopup="menu"
                                    aria-expanded={open}
                                    data-mode-open={open ? true : undefined}
                                    className={triggerClass}
                                >
                                    <Icon name={MODE_ICONS[selectedKind]} className="size-3.5 flex-shrink-0" />
                                    <span className="truncate">{selectedLabel}</span>
                                    <Icon name="arrow-down-s" className="size-3.5 flex-shrink-0 opacity-60" />
                                </button>
                            </DropdownMenuTrigger>
                        </span>
                    </TooltipTrigger>
                    <DropdownMenuContent
                        side="top"
                        align="end"
                        alignOffset={-40}
                        constrainToMain
                        collisionAvoidance={{ side: 'none', align: 'shift' }}
                        className="flex w-[min(300px,calc(100vw-2rem))] flex-col overflow-hidden p-0"
                    >
                        <div className="border-b border-border/40 p-2">{searchField('composer-mode-search')}</div>
                        <ScrollableOverlay outerClassName="max-h-[min(400px,calc(var(--available-height)-4rem))] flex-1">
                            <div id="composer-mode-options" className="flex flex-col gap-1 p-1">
                                {emptyState}
                                {options.map((option, index) => {
                                    const item = (
                                        <DropdownMenuItem
                                            ref={(node) => { itemRefs.current[index] = node; }}
                                            aria-disabled={option.disabledReason ? true : undefined}
                                            data-mode-option={option.value}
                                            data-selected={option.value === selectedKind ? true : undefined}
                                            className={cn(
                                                'items-start px-2 py-1.5',
                                                option.disabledReason && 'cursor-not-allowed opacity-60',
                                                option.value === selectedKind && !option.disabledReason && 'bg-interactive-selection text-interactive-selection-foreground',
                                            )}
                                            onSelect={(event) => {
                                                if (option.disabledReason) { event.preventDefault(); return; }
                                                choose(option.value);
                                            }}
                                            onFocus={() => setActiveIndex(index)}
                                            onKeyDown={(event) => handleItemKeyDown(event, index)}
                                        >
                                            {optionRow(option)}
                                        </DropdownMenuItem>
                                    );
                                    if (!option.disabledReason) return <React.Fragment key={option.value}>{item}</React.Fragment>;
                                    return (
                                        <Tooltip key={option.value}>
                                            <TooltipTrigger asChild>{item}</TooltipTrigger>
                                            <TooltipContent side="right" sideOffset={6} className="max-w-[220px]">{option.disabledReason}</TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </ScrollableOverlay>
                    </DropdownMenuContent>
                </DropdownMenu>
                {tooltip}
            </Tooltip>
            {goalDialogs}
        </>
    );
});
