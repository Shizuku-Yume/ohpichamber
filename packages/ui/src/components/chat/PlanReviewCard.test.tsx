import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { QuestionRequest } from '@openchamber/agent-contract';
import { I18nProvider } from '@/lib/i18n';
import { dict as en } from '@/lib/i18n/messages/en';
import { dict as de } from '@/lib/i18n/messages/de';
import { dict as es } from '@/lib/i18n/messages/es';
import { dict as fr } from '@/lib/i18n/messages/fr';
import { dict as ja } from '@/lib/i18n/messages/ja';
import { dict as ko } from '@/lib/i18n/messages/ko';
import { dict as nl } from '@/lib/i18n/messages/nl';
import { dict as pl } from '@/lib/i18n/messages/pl';
import { dict as ptBR } from '@/lib/i18n/messages/pt-BR';
import { dict as tr } from '@/lib/i18n/messages/tr';
import { dict as uk } from '@/lib/i18n/messages/uk';
import { dict as zhCN } from '@/lib/i18n/messages/zh-CN';
import { dict as zhTW } from '@/lib/i18n/messages/zh-TW';
import { SyncContext, SyncRuntimeContext } from '@/sync/sync-context';
import { PlanReviewCard } from './PlanReviewCard';

const mockRuntime = { childStores: { children: new Map() }, messageLoader: {}, client: {}, runtimeKey: 'test', currentDirectory: { get: () => '', subscribe: () => () => undefined } };
const SystemContext = SyncContext as unknown as React.Context<unknown>;
const RuntimeContext = SyncRuntimeContext as unknown as React.Context<unknown>;

const form: QuestionRequest = {
    questionId: 'review-1', sessionId: 'session-1', turnId: 'turn-1',
    version: '1', epoch: 'epoch-1', workerGeneration: 'worker-1',
    prompt: 'Review this plan', requestedAt: 1, status: 'pending',
    schema: {
        type: 'plan-review', title: 'Composer improvements',
        planReference: 'local://plans/composer.md',
        planText: '## Steps\n\nPreserve **omp.ask** keyboard behavior.',
    },
};

const renderCard = (request = form, docked = false) => renderToStaticMarkup(
    <SystemContext.Provider value={mockRuntime}>
        <RuntimeContext.Provider value={mockRuntime}>
            <I18nProvider><PlanReviewCard form={request} docked={docked} /></I18nProvider>
        </RuntimeContext.Provider>
    </SystemContext.Provider>,
);

describe('PlanReviewCard', () => {
    test('shows the plan title, session-local reference, markdown and four decisions', () => {
        const html = renderCard();
        expect(html).toContain('Composer improvements');
        expect(html).toContain('local://plans/composer.md');
        expect(html).toContain('form-markdown typography-meta');
        expect(html).toContain('Preserve **omp.ask** keyboard behavior.');
        for (const label of ['Approve', 'Approve and compact', 'Send feedback', 'Reject']) {
            expect(html).toContain(label);
        }
        expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Send feedback<\/button>/);
        expect(html).toContain('Describe the changes you want to the plan…');
        expect(html).not.toContain('Dismiss');
    });

    test('uses the shared composer panel when docked', () => {
        const html = renderCard(form, true);
        expect(html).toContain('role="dialog"');
        expect(html).toContain('aria-label="Plan review"');
        expect(html).toContain('chat-input-column');
        expect(html).toContain('Composer improvements');
    });

    test('hides resolved or malformed requests', () => {
        expect(renderCard({ ...form, status: 'cancelled', version: '2', resolvedAt: 2 })).toBe('');
        expect(renderCard({ ...form, status: 'expired', version: '2', resolvedAt: 2 })).toBe('');
        expect(renderCard({ ...form, status: 'answered', version: '2', resolvedAt: 2, answeredAt: 2, response: { action: 'approve' } })).toBe('');
        expect(renderCard({ ...form, schema: { type: 'omp.ask', questions: [] } })).toBe('');
    });

    test('provides translated plan-review messages in every shipped dictionary', () => {
        const keys = [
            'chat.planReview.title', 'chat.planReview.reference', 'chat.planReview.approve',
            'chat.planReview.approveCompact', 'chat.planReview.feedback',
            'chat.planReview.feedbackPlaceholder', 'chat.planReview.sendFeedback', 'chat.planReview.reject',
        ] as const;
        for (const dictionary of [de, es, fr, ja, ko, nl, pl, ptBR, tr, uk, zhCN, zhTW]) {
            for (const key of keys) {
                expect(dictionary[key].trim()).not.toBe('');
                // “Feedback” is also the established German and Dutch noun.
                if (key !== 'chat.planReview.feedback') expect(dictionary[key]).not.toBe(en[key]);
            }
        }
    });
});
