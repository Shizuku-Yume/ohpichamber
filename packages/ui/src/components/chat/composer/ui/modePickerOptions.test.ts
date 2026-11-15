import { describe, expect, test } from 'bun:test';
import { getDropdownNavigationKey } from '@/components/ui/dropdown-navigation';
import { buildModeOptions, nextEnabledModeIndex } from './modePickerOptions';

const translate = (key: string) => key;

const options = () => buildModeOptions({
    planRoleAvailable: true,
    goalModeEnabled: true,
    selectedKind: 'main',
    translate,
});

describe('mode picker options', () => {
    test('Plan is disabled with a reason until the catalog resolves its role', () => {
        const unavailable = buildModeOptions({ planRoleAvailable: false, goalModeEnabled: true, selectedKind: 'main', translate });
        const loading = buildModeOptions({ planRoleAvailable: undefined, goalModeEnabled: true, selectedKind: 'main', translate });
        expect(unavailable.find((option) => option.value === 'plan')?.disabledReason).toBe('chat.chatInput.mode.plan.disabledRole');
        expect(loading.find((option) => option.value === 'plan')?.disabledReason).toBe('chat.chatInput.mode.plan.disabledRole');
        expect(options().find((option) => option.value === 'plan')?.disabledReason).toBeNull();
    });

    test('Goal is hidden when the feature is off unless the session is already a goal', () => {
        expect(buildModeOptions({ planRoleAvailable: true, goalModeEnabled: false, selectedKind: 'main', translate }).some((option) => option.value === 'goal')).toBe(false);
        expect(buildModeOptions({ planRoleAvailable: true, goalModeEnabled: false, selectedKind: 'goal', translate }).some((option) => option.value === 'goal')).toBe(true);
    });


    test('arrow and Ctrl+N/P navigation skip disabled rows and wrap', () => {
        const rows = buildModeOptions({ planRoleAvailable: false, goalModeEnabled: true, selectedKind: 'main', translate });
        expect(nextEnabledModeIndex(rows, -1, 1)).toBe(0);
        expect(nextEnabledModeIndex(rows, 0, 1)).toBe(2);
        expect(nextEnabledModeIndex(rows, 2, -1)).toBe(0);
        expect(nextEnabledModeIndex(rows, 3, 1)).toBe(0);
        expect(nextEnabledModeIndex(rows, -1, -1)).toBe(3);
        expect(getDropdownNavigationKey({ key: 'n', code: 'KeyN', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false })).toBe('ArrowDown');
        expect(getDropdownNavigationKey({ key: 'p', code: 'KeyP', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false })).toBe('ArrowUp');
    });
});
