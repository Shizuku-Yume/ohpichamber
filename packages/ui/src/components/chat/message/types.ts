import type { ToolCallPart, ToolResultPart } from '@openchamber/agent-contract';

export type StreamPhase = 'streaming' | 'cooldown' | 'completed';

export type DiffViewMode = 'side-by-side' | 'unified';

export interface AgentMentionInfo {
    name: string;
    token: string;
}

export interface ToolPopupContent {
    open: boolean;
    title: string;
    content: string;
    toolResult?: ToolResultPart;
    /** Canonical tool identity, available even before a result exists. */
    toolName?: string;
    /** Canonical call arguments for deep inspection; never a legacy alias bag. */
    input?: ToolCallPart['input'];
    language?: string;
    isDiff?: boolean;
    image?: {
        url: string;
        mimeType?: string;
        filename?: string;
        size?: number;
        /** The image's own bytes, to save it; without it only a `data:` or `blob:` URL can be saved. */
        load?: () => Promise<Blob>;
        gallery?: Array<{
            url: string;
            mimeType?: string;
            filename?: string;
            size?: number;
            load?: () => Promise<Blob>;
        }>;
        index?: number;
    };
    mermaid?: {
        url: string;
        mimeType?: string;
        filename?: string;
        source?: string;
    };
}
