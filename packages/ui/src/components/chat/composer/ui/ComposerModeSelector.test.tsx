import React, { act } from 'react';
import { Window } from 'happy-dom';
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@/lib/i18n';
import { canonicalClient } from '@/api/canonicalClient';
import { ComposerModeSelector } from './ComposerModeSelector';

const modeAck = (mode: 'main' | 'plan') => ({ type: 'mode.set' as const, mode: mode === 'main' ? { kind: 'main' as const } : { kind: 'plan' as const, status: 'active' as const, planReference: 'local://plans/session.md' } });

describe('ComposerModeSelector', () => {
    afterEach(() => {
        // Restore the transport spy and browser globals after each isolated render.
        for (const key of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) Reflect.deleteProperty(globalThis, key);
    });

    test('reflects authoritative snapshot mode and sends mode.set', async () => {
        const win = new Window({ url: 'http://localhost' });
        Object.defineProperties(globalThis, {
            window: { configurable: true, value: win }, document: { configurable: true, value: win.document },
            navigator: { configurable: true, value: win.navigator }, IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
        });
        const setMode = spyOn(canonicalClient, 'setMode').mockResolvedValue(modeAck('main'));
        const container = document.createElement('div');
        const root = createRoot(container);
        try {
            await act(async () => root.render(<I18nProvider><ComposerModeSelector sessionId="session-1" mode={{ kind: 'plan', status: 'active', planReference: 'local://plans/session.md' }} runActive={false} buttonClass="button" iconSizeClass="icon" /></I18nProvider>));
            const plan = container.querySelector<HTMLButtonElement>('[aria-label="Plan"]');
            const main = container.querySelector<HTMLButtonElement>('[aria-label="Main"]');
            expect(plan?.getAttribute('aria-checked')).toBe('true');
            expect(main?.getAttribute('aria-checked')).toBe('false');
            await act(async () => main?.click());
            expect(setMode).toHaveBeenCalledWith('session-1', 'main');
        } finally {
            await act(async () => root.unmount());
            setMode.mockRestore();
            await win.happyDOM.close();
        }
    });

    test('disables both mode controls while a run is active', async () => {
        const win = new Window({ url: 'http://localhost' });
        Object.defineProperties(globalThis, {
            window: { configurable: true, value: win }, document: { configurable: true, value: win.document },
            navigator: { configurable: true, value: win.navigator }, IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
        });
        const container = document.createElement('div');
        const root = createRoot(container);
        try {
            await act(async () => root.render(<I18nProvider><ComposerModeSelector sessionId="session-1" mode={{ kind: 'main' }} runActive buttonClass="button" iconSizeClass="icon" /></I18nProvider>));
            expect(container.querySelector<HTMLButtonElement>('[aria-label="Main"]')?.disabled).toBe(true);
            expect(container.querySelector<HTMLButtonElement>('[aria-label="Plan"]')?.disabled).toBe(true);
        } finally {
            await act(async () => root.unmount());
            await win.happyDOM.close();
        }
    });
});
