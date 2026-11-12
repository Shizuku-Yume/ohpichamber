import type { I18nKey } from '@/lib/i18n';

export type ComposerModeValue = 'main' | 'plan' | 'vibe' | 'goal';

export type ModeOption = {
    value: ComposerModeValue;
    label: string;
    description: string;
    disabledReason: string | null;
};

export type NavigationDirection = 1 | -1;

const MODE_ORDER: readonly ComposerModeValue[] = ['main', 'plan', 'vibe', 'goal'];

export const MODE_LABEL_KEYS = {
    main: 'chat.chatInput.mode.main',
    plan: 'chat.chatInput.mode.plan',
    vibe: 'chat.chatInput.mode.vibe',
    goal: 'chat.chatInput.mode.goal',
} satisfies Record<ComposerModeValue, I18nKey>;

export const MODE_DESCRIPTION_KEYS = {
    main: 'chat.chatInput.mode.main.description',
    plan: 'chat.chatInput.mode.plan.description',
    vibe: 'chat.chatInput.mode.vibe.description',
    goal: 'chat.chatInput.mode.goal.description',
} satisfies Record<ComposerModeValue, I18nKey>;

/** Builds the localized rows, hiding Goal when the feature is off and disabling Plan without a role. */
export function buildModeOptions(input: {
    planRoleAvailable: boolean | undefined;
    sessionGoalEnabled: boolean;
    selectedKind: ComposerModeValue;
    translate: (key: I18nKey) => string;
}): ModeOption[] {
    return MODE_ORDER
        .filter((value) => value !== 'goal' || input.sessionGoalEnabled || input.selectedKind === 'goal')
        .map((value) => ({
            value,
            label: input.translate(MODE_LABEL_KEYS[value]),
            description: input.translate(MODE_DESCRIPTION_KEYS[value]),
            disabledReason: value === 'plan' && input.planRoleAvailable !== true
                ? input.translate('chat.chatInput.mode.plan.disabledRole')
                : null,
        }));
}

/** Next selectable row in `direction`, wrapping and skipping disabled rows. */
export function nextEnabledModeIndex(
    options: readonly ModeOption[],
    from: number,
    direction: NavigationDirection,
): number {
    const origin = from < 0 ? (direction === 1 ? -1 : options.length) : from;
    for (let step = 1; step <= options.length; step += 1) {
        const index = ((origin + direction * step) % options.length + options.length) % options.length;
        if (!options[index].disabledReason) return index;
    }
    return -1;
}
