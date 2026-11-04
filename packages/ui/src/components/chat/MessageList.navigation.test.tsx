import { expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import { plugin } from 'bun';
import { pathToFileURL } from 'node:url';
import { SyncProvider } from '@/sync/sync-context';
import type { MessageListHandle } from './MessageList';
import { KeepAlive } from '@/components/ui/KeepAlive';
import { ChatColumnSessionContext } from './chatColumnSession';
import { useChatTimelineScroll, type TimelineListHandle } from '@/hooks/useChatTimelineScroll';

// Bun does not implement Vite's worker URL imports.
plugin({
    name: 'navigation-worker-url',
    setup(build) {
        build.onLoad({ filter: /markdown-shiki\.worker\.ts\?worker&url$/ }, ({ path }) => ({
            contents: `export default ${JSON.stringify(pathToFileURL(path.split('?')[0]).href)};`,
            loader: 'js',
        }));
    },
});
const { default: MessageList } = await import('./MessageList');
const { MarkdownContent } = await import('./MarkdownRendererImpl');

test('retains real lists and Markdown while reconnecting only the selected scroller', async () => {
    const dom = new Window({ url: 'https://app.test' });
    const values = {
        window: dom,
        document: dom.document,
        navigator: dom.navigator,
        HTMLElement: dom.HTMLElement,
        Element: dom.Element,
        Node: dom.Node,
        localStorage: dom.localStorage,
        sessionStorage: dom.sessionStorage,
        getComputedStyle: dom.getComputedStyle.bind(dom),
        ResizeObserver: dom.ResizeObserver,
        MutationObserver: dom.MutationObserver,
        requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
        cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom),
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    const previous = Object.keys(values).map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
    for (const [name, value] of Object.entries(values)) {
        Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    }
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => new Promise(() => {});
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const messages: [] = [];
    let selectedScrollRef: React.RefObject<HTMLDivElement | null> = { current: null };

    function Harness({ name, text }: { name: string; text: string }) {
        const ref = React.useRef<MessageListHandle | null>(null);
        const scroll = useChatTimelineScroll({
            currentSessionId: name,
            currentSessionKey: name,
            composerOverlayHeight: 0,
            messageListRef: ref,
            sessionIsWorking: false,
        });
        const { registerList } = scroll;
        const register = React.useCallback((list: TimelineListHandle | null) => {
            registerList(list);
        }, [registerList]);
        React.useLayoutEffect(() => {
            selectedScrollRef = scroll.scrollRef;
        });
        return (
            <KeepAlive cacheKey={name} capacity={4}>
                <ChatColumnSessionContext.Provider value={{ sessionId: name, directory: '/repo' }}>
                    <MessageList
                        ref={ref}
                        sessionKey={name}
                        directory="/repo"
                        messages={messages}
                        isLoadingOlder={false}
                        registerList={register}
                        listFooter={(
                            <div data-session={name}>
                                <input defaultValue={name} />
                                <MarkdownContent content={text} purpose="copy" enableFileReferences={false} />
                            </div>
                        )}
                        scrollContainerProps={{ 'data-scrollbar': 'chat' }}
                    />
                </ChatColumnSessionContext.Provider>
            </KeepAlive>
        );
    }
    const render = (name: string, text = `**${name}**`) => act(async () => {
        root.render(
            <SyncProvider directory="/repo">
                <Harness name={name} text={text} />
            </SyncProvider>,
        );
    });

    try {
        await render('A');
        const a = host.querySelector('[data-session="A"]');
        const markdown = a?.querySelector('[data-markdown-content]');
        const input = a?.querySelector('input');
        if (!input || !selectedScrollRef.current || !markdown) throw new Error('Missing initial list');
        input.value = 'kept';
        const firstScroller = selectedScrollRef.current;

        await render('B');
        const secondScroller = selectedScrollRef.current;
        expect(secondScroller).not.toBeNull();
        expect(secondScroller).not.toBe(firstScroller);

        await render('A', '**updated**');
        expect(selectedScrollRef.current).toBe(firstScroller);
        expect(host.querySelector('[data-session="A"]')).toBe(a);
        expect(a?.querySelector('[data-markdown-content]')).toBe(markdown);
        expect(markdown.textContent).toContain('updated');
        expect(input.value).toBe('kept');

        for (const name of ['C', 'D', 'E']) {
            await render(name);
        }
        expect(host.querySelectorAll('[data-scrollbar="chat"]').length).toBe(4);
        expect(host.querySelector('[data-session="B"]')).toBeNull();
        expect(a?.isConnected).toBe(true);

        await render('A', '**refreshed**');
        expect(host.querySelector('[data-session="A"]')).toBe(a);
        expect(markdown.textContent).toContain('refreshed');
    } finally {
        await act(async () => root.unmount());
        globalThis.fetch = originalFetch;
        for (const [name, descriptor] of previous) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
        await dom.happyDOM.close();
    }
});
