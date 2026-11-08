import { act, StrictMode, Suspense } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { LiveActivityCollapse } from './LiveActivityCollapse';

// The region's layout is read the way a browser applies it. A closed region
// computes a collapsed box through whichever rule wins, so the check is not a
// statement about one inline property that a fallback happens to set.
const collapsed = (region: HTMLElement | null): boolean => {
    if (!region) return false;
    const style = getComputedStyle(region);
    return style.height === '0px' || style.overflow === 'hidden';
};

describe('live Activity collapse layout lifecycle', () => {
    let root: Root;
    let container: HTMLDivElement;
    let restoreWindow: () => void;

    beforeEach(() => {
        const win = new Window({ url: 'http://localhost' });
        const globals = {
            window: win, document: win.document, HTMLElement: win.HTMLElement,
            Element: win.Element, SVGElement: win.SVGElement, NodeList: win.NodeList,
            requestAnimationFrame: win.requestAnimationFrame.bind(win),
            cancelAnimationFrame: win.cancelAnimationFrame.bind(win),
            getComputedStyle: win.getComputedStyle.bind(win),
            IS_REACT_ACT_ENVIRONMENT: true,
        };
        const previous = Object.keys(globals).map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
        for (const [name, value] of Object.entries(globals)) {
            Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
        }
        restoreWindow = () => {
            for (const [name, descriptor] of previous) {
                if (descriptor) Object.defineProperty(globalThis, name, descriptor);
                else Reflect.deleteProperty(globalThis, name);
            }
        };
        container = document.createElement('div');
        document.body.append(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        await act(async () => root.unmount());
        restoreWindow();
        container.remove();
    });

    test('a closed region draws nothing and computes a collapsed layout under StrictMode replay', async () => {
        await act(async () => root.render(
            <StrictMode>
                <LiveActivityCollapse expanded={false}>
                    <div>Historical activity</div>
                </LiveActivityCollapse>
            </StrictMode>,
        ));
        const region = container.querySelector<HTMLElement>('[data-live-activity-content]');
        expect(region).not.toBeNull();
        expect(region?.childElementCount).toBe(0);
        expect(collapsed(region)).toBe(true);
        expect(region?.getAttribute('aria-hidden')).toBe('true');
    });

    test('a close that a Suspense hide and reveal re-renders stays collapsed', async () => {
        let suspended = false;
        let release: () => void = () => undefined;
        const pending = new Promise<void>((resolve) => { release = resolve; });
        function LoadingSibling() {
            if (suspended) throw pending;
            return null;
        }
        const render = () => (
            <Suspense fallback={<div>Loading history</div>}>
                <LiveActivityCollapse expanded={false}>
                    <div>Historical activity</div>
                </LiveActivityCollapse>
                <LoadingSibling />
            </Suspense>
        );
        await act(async () => root.render(render()));
        suspended = true;
        await act(async () => root.render(render()));
        suspended = false;
        await act(async () => { release(); });
        const region = container.querySelector<HTMLElement>('[data-live-activity-content]');
        expect(region?.childElementCount).toBe(0);
        expect(collapsed(region)).toBe(true);
    });

    test('an expansion interrupted by Suspense keeps its natural layout and its children', async () => {
        let expanded = false;
        let suspended = false;
        let release: () => void = () => undefined;
        const pending = new Promise<void>((resolve) => { release = resolve; });
        function LoadingSibling() {
            if (suspended) throw pending;
            return null;
        }
        const render = () => (
            <Suspense fallback={<div>Loading history</div>}>
                <LiveActivityCollapse expanded={expanded}>
                    <div>Historical activity</div>
                </LiveActivityCollapse>
                <LoadingSibling />
            </Suspense>
        );
        await act(async () => root.render(render()));
        expanded = true;
        await act(async () => root.render(render()));
        suspended = true;
        await act(async () => root.render(render()));
        suspended = false;
        await act(async () => { release(); });
        const region = container.querySelector<HTMLElement>('[data-live-activity-content]');
        expect(region?.textContent).toBe('Historical activity');
        // Natural height: nothing collapsed remains on the element.
        expect(region?.style.height).toBe('');
        expect(region?.getAttribute('aria-hidden')).toBe('false');
        expect(collapsed(region)).toBe(false);
    });
});
