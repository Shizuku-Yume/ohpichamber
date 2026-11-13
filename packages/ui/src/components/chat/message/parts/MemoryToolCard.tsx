import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { useI18n } from '@/lib/i18n';
import type { JsonObject, JsonValue } from '@openchamber/agent-contract';
import { isLearnTool, isRecallTool, isReflectTool, isRetainTool } from '@/lib/toolPresentation';
interface MemoryItem {
    content: string;
    context?: string;
    scope?: 'project' | 'global';
}

function parseRetainItems(input: JsonObject): MemoryItem[] {
    const raw = input.items;
    if (!Array.isArray(raw)) return [];
    const items: MemoryItem[] = [];
    for (const item of raw) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
            const record = item as Record<string, unknown>;
            const content = typeof record.content === 'string' ? record.content : '';
            const context = typeof record.context === 'string' ? record.context : undefined;
            const scope = record.scope === 'global' ? 'global' : record.scope === 'project' ? 'project' : undefined;
            if (content) items.push({ content, context, scope });
        }
    }
    return items;
}

export const MemoryToolCard: React.FC<{
    toolName: string;
    input: JsonObject;
    result: { text: string; details?: JsonValue };
}> = React.memo(({ toolName, input, result }) => {
    const { t } = useI18n();
    const isRetain = isRetainTool(toolName);
    const isRecall = isRecallTool(toolName);
    const isReflect = isReflectTool(toolName);
    const isLearn = isLearnTool(toolName);

    const retainItems = isRetain ? parseRetainItems(input) : [];
    const query = typeof input.query === 'string' ? input.query : '';
    const lesson = typeof input.memory === 'string' ? input.memory : '';
    const lessonContext = typeof input.context === 'string' ? input.context : undefined;

    return (
        <div className="my-1.5 rounded-xl border border-border/60 bg-muted/15 p-3 space-y-2 text-start" data-testid="memory-tool-card">
            <div className="flex items-center gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
                    <Icon name={isLearn ? 'lightbulb' : 'brain'} className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="typography-meta font-medium text-foreground">
                        {isRetain ? t('chat.toolPart.memory.retained')
                            : isRecall ? t('chat.toolPart.memory.recalled')
                                : isReflect ? t('chat.toolPart.memory.reflected')
                                    : isLearn ? t('chat.toolPart.memory.learned')
                                        : t('chat.toolPart.memory.edited')}
                    </span>
                    {query ? (
                        <span className="ms-1.5 typography-meta text-muted-foreground/80 truncate">
                            &ldquo;{query}&rdquo;
                        </span>
                    ) : null}
                </div>
            </div>

            {retainItems.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                    {retainItems.map((item, index) => (
                        <div key={index} className="rounded-lg border border-border/40 bg-background/50 p-2 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                                <span className="typography-meta text-foreground break-words flex-1 min-w-0">{item.content}</span>
                                {item.scope ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wider shrink-0">
                                        {item.scope}
                                    </span>
                                ) : null}
                            </div>
                            {item.context ? (
                                <div className="typography-code text-xs text-muted-foreground/70 italic break-words">
                                    {item.context}
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}

            {lesson ? (
                <div className="rounded-lg border border-border/40 bg-background/50 p-2 space-y-1">
                    <div className="typography-meta text-foreground break-words">{lesson}</div>
                    {lessonContext ? (
                        <div className="typography-code text-xs text-muted-foreground/70 italic break-words">
                            {lessonContext}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {result.text && !retainItems.length && !lesson ? (
                <div className="rounded-lg border border-border/40 bg-background/50 p-2 typography-meta text-muted-foreground break-words whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {result.text}
                </div>
            ) : null}
        </div>
    );
});

MemoryToolCard.displayName = 'MemoryToolCard';
