import React from 'react';
import { useChatSessionSelection } from '@/components/chat/chatColumnSession';
import type { Message, Part, ToolCallPart } from '@openchamber/agent-contract';

import { useSessionUIStore } from '@/sync/session-ui-store';
import { useDirectorySync, useSessionMessages, useSessionPermissions, useSessionForms } from '@/sync/sync-context';
import { useSessionActivity } from './useSessionActivity';
import type { AgentStatus } from '@/lib/agentStatus';
import { normalizeIntent, toolPresentation } from '@/lib/toolPresentation';

type AssistantActivity = 'idle' | 'streaming' | 'tooling' | 'cooldown' | 'permission';

interface WorkingSummary {
    activity: AssistantActivity;
    hasWorkingContext: boolean;
    hasActiveTools: boolean;
    isWorking: boolean;
    isStreaming: boolean;
    isCooldown: boolean;
    lifecyclePhase: 'streaming' | 'cooldown' | null;
    statusText: string | null;
    /** The same activity as a dictionary key, so the pill and status row localize it. */
    status: AgentStatus | null;
    isGenericStatus: boolean;
    isWaitingForPermission: boolean;
    canAbort: boolean;
    compactionDeadline: number | null;
    activePartType?: 'text' | 'tool' | 'reasoning' | 'editing';
    activeToolName?: string;
    wasAborted: boolean;
    abortActive: boolean;
    lastCompletionId: string | null;
    isComplete: boolean;
    retryInfo: { attempt?: number; next?: number } | null;
}

interface FormingSummary {
    isActive: boolean;
    characterCount: number;
}

export interface AssistantStatusSnapshot {
    activeModel: ActiveAssistantModel | null;
    forming: FormingSummary;
    working: WorkingSummary;
}

interface ActiveAssistantModel {
    providerId: string;
    modelId: string;
}

interface ActiveAssistantContext {
    assistantId: string | null;
    model: ActiveAssistantModel | null;
}

interface ModelRef {
    providerId: string;
    modelId: string;
}

const DEFAULT_WORKING: WorkingSummary = {
    activity: 'idle',
    hasWorkingContext: false,
    hasActiveTools: false,
    isWorking: false,
    isStreaming: false,
    isCooldown: false,
    lifecyclePhase: null,
    statusText: null,
    status: null,
    isGenericStatus: true,
    isWaitingForPermission: false,
    canAbort: false,
    compactionDeadline: null,
    activePartType: undefined,
    activeToolName: undefined,
    wasAborted: false,
    abortActive: false,
    lastCompletionId: null,
    isComplete: false,
    retryInfo: null,
};

const EMPTY_PARTS: Part[] = [];
const STATUS_SIGNATURE_SEPARATOR = '\u0000';

const isLiveToolStatus = (status: ToolCallPart['status']): boolean =>
    status === 'pending_approval' || status === 'approved' || status === 'running';

export type ParsedStatusResult = {
    activePartType: 'tool' | 'reasoning' | 'text' | undefined;
    activeToolName: string | undefined;
    status: AgentStatus;
    isGenericStatus: boolean;
};

/**
 * What the run is doing, from the parts of its assistant message. OMP's own
 * precedence: a running call's intent names the work, an unsealed reasoning
 * part reads as thinking, and anything else is the plain working line.
 */
export const createParsedStatus = (parts: readonly Part[]): ParsedStatusResult => {
    let activeCall: ToolCallPart | undefined;
    let reasoning = false;
    let text = false;

    for (let index = parts.length - 1; index >= 0; index -= 1) {
        const part = parts[index];
        if (!part) continue;
        if (part.type === 'tool_call' && isLiveToolStatus(part.status)) {
            activeCall = part;
            break;
        }
        if (part.type === 'reasoning' && !reasoning) reasoning = part.content.trim().length > 0;
        if (part.type === 'text' && !text) text = part.content.trim().length > 0;
    }

    if (activeCall) {
        const presentation = toolPresentation(activeCall.toolName);
        const intent = normalizeIntent(typeof activeCall.input.i === 'string' ? activeCall.input.i : '');
        const described = intent ?? presentation.describeCall(activeCall.input);
        return {
            activePartType: 'tool',
            activeToolName: activeCall.toolName,
            status: described
                ? { key: 'chat.agentStatus.usingTool', name: presentation.label, text: described }
                : { key: 'chat.agentStatus.usingTool', name: presentation.label },
            isGenericStatus: false,
        };
    }

    if (reasoning && !text) {
        return { activePartType: 'reasoning', activeToolName: undefined, status: { key: 'chat.agentStatus.thinking' }, isGenericStatus: false };
    }

    return {
        activePartType: text ? 'text' : undefined,
        activeToolName: undefined,
        status: { key: 'chat.agentStatus.working' },
        isGenericStatus: true,
    };
};

const encodeParsedStatus = (status: ParsedStatusResult): string => [
    status.activePartType ?? '',
    status.activeToolName ?? '',
    status.isGenericStatus ? '1' : '0',
    JSON.stringify([status.status.key, status.status.count ?? null, status.status.name ?? null, status.status.text ?? null]),
].join(STATUS_SIGNATURE_SEPARATOR);

const decodeParsedStatus = (signature: string): ParsedStatusResult => {
    const [activePartType, activeToolName, isGenericStatus, encodedStatus] = signature.split(STATUS_SIGNATURE_SEPARATOR);
    let status: AgentStatus = { key: 'chat.agentStatus.working' };
    if (encodedStatus) {
        try {
            const [key, count, name, text] = JSON.parse(encodedStatus) as [AgentStatus['key'], number | null, string | null, string | null];
            status = { key };
            if (count !== null) status.count = count;
            if (name !== null) status.name = name;
            if (text !== null) status.text = text;
        } catch {
            // A signature from an older build carries no key; the working line stands in.
        }
    }
    return {
        activePartType: activePartType === 'text' || activePartType === 'tool' || activePartType === 'reasoning'
            ? activePartType
            : undefined,
        activeToolName: activeToolName || undefined,
        status,
        isGenericStatus: isGenericStatus === '1',
    };
};

/**
 * The retry the run is waiting on, when the newest notice says so and nothing
 * has happened since: OMP reports `auto_retry_start` with the delay it will
 * wait, and the next text or call means the retry already ran.
 */
export const retryInfoOf = (parts: readonly Part[]): { attempt?: number; next?: number } | null => {
    for (let index = parts.length - 1; index >= 0; index -= 1) {
        const part = parts[index];
        if (!part) continue;
        if (part.type === 'notice' && part.noticeType === 'auto_retry_start') {
            return { attempt: part.details.attempt, next: part.details.delayMs };
        }
        if (part.type === 'tool_call' || (part.type === 'text' && part.content.trim().length > 0)) return null;
    }
    return null;
};

/** True when a user prompt follows `index`, i.e. a turn is queued or starting. */
const hasNewerPrompt = (messages: Message[], index: number): boolean => {
    for (let cursor = messages.length - 1; cursor > index; cursor -= 1) {
        if (messages[cursor]?.role === 'user') return true;
    }
    return false;
};

/**
 * Canonical messages do not expose completion timestamps. A newer prompt may
 * follow either an active or finished assistant turn, so model attribution is
 * intentionally neutral until another assistant message arrives.
 */
export const getActiveAssistantContext = (messages: Message[], _sessionModel?: ModelRef | null): ActiveAssistantContext => {
    void _sessionModel;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message?.role !== 'assistant') continue;

        if (hasNewerPrompt(messages, index)) {
            return { assistantId: message.messageId, model: null };
        }

        const providerId = message.providerId?.trim() ?? '';
        const modelId = message.modelId?.trim() ?? '';
        return {
            assistantId: message.messageId,
            model: providerId && modelId ? { providerId, modelId } : null,
        };
    }

    return { assistantId: null, model: null };
};

export function useAssistantStatus(): AssistantStatusSnapshot {
    // Inside the chat column, follow the session the timeline shows rather
    // than the live selection, so the status chip changes together with the
    // conversation instead of a commit ahead of it.
    const { sessionId: currentSessionId, directory: currentSessionDirectory } = useChatSessionSelection();

    const rawSessionMessages = useSessionMessages(
        currentSessionId ?? '',
        currentSessionDirectory ?? undefined,
    );

    const activeAssistant = React.useMemo(
        () => getActiveAssistantContext(rawSessionMessages),
        [rawSessionMessages],
    );
    const lastAssistantId = activeAssistant.assistantId;

    const lastAssistantSignature = useDirectorySync(
        React.useCallback((state) => {
            const parts = lastAssistantId
                ? state.message[currentSessionId ?? '']?.find((message) => message.messageId === lastAssistantId)?.parts ?? EMPTY_PARTS
                : EMPTY_PARTS;
            const parsed = createParsedStatus(parts);
            const retry = retryInfoOf(parts);
            return [encodeParsedStatus(parsed), retry?.attempt ?? '', retry?.next ?? ''].join(STATUS_SIGNATURE_SEPARATOR);
        }, [currentSessionId, lastAssistantId]),
        currentSessionDirectory ?? undefined,
    );

    const sessionPermissionRequests = useSessionPermissions(currentSessionId ?? '', currentSessionDirectory ?? undefined);
    const sessionFormRequests = useSessionForms(currentSessionId ?? '', currentSessionDirectory ?? undefined);

    const sessionAbortRecord = useSessionUIStore(
        React.useCallback((state) => {
            if (!currentSessionId) {
                return null;
            }
            return state.sessionAbortFlags?.get(currentSessionId) ?? null;
        }, [currentSessionId])
    );

    const { phase: activityPhase, isWorking: isPhaseWorking } = useSessionActivity(currentSessionId, currentSessionDirectory ?? undefined);

    const parsedStatus = React.useMemo<ParsedStatusResult>(() => {
        const [signature] = lastAssistantSignature.split(STATUS_SIGNATURE_SEPARATOR);
        return decodeParsedStatus(signature ?? '');
    }, [lastAssistantSignature]);

    const retryInfo = React.useMemo(() => {
        const [, attempt, next] = lastAssistantSignature.split(STATUS_SIGNATURE_SEPARATOR);
        if (!attempt) return null;
        return {
            attempt: Number(attempt),
            ...(next ? { next: Number(next) } : {}),
        };
    }, [lastAssistantSignature]);

    const abortState = React.useMemo(() => {
        const hasActiveAbort = Boolean(sessionAbortRecord && !sessionAbortRecord.acknowledged);
        return { wasAborted: hasActiveAbort, abortActive: hasActiveAbort };
    }, [sessionAbortRecord]);

    const baseWorking = React.useMemo<WorkingSummary>(() => {
        if (abortState.wasAborted) {
            return {
                ...DEFAULT_WORKING,
                wasAborted: true,
                abortActive: abortState.abortActive,
            };
        }

        const isWorking = isPhaseWorking;
        const isStreaming = activityPhase === 'busy';
        const hasActiveTools = parsedStatus.activePartType === 'tool';

        return {
            ...DEFAULT_WORKING,
            activity: isWorking ? (hasActiveTools ? 'tooling' : 'streaming') : 'idle',
            hasWorkingContext: isWorking,
            hasActiveTools,
            isWorking,
            isStreaming,
            lifecyclePhase: isStreaming ? 'streaming' : null,
            statusText: isWorking ? parsedStatus.status.text ?? parsedStatus.status.name ?? null : null,
            status: isWorking ? parsedStatus.status : null,
            isGenericStatus: isWorking ? parsedStatus.isGenericStatus : true,
            canAbort: isWorking,
            activePartType: isWorking ? parsedStatus.activePartType : undefined,
            activeToolName: isWorking ? parsedStatus.activeToolName : undefined,
            retryInfo: isWorking ? retryInfo : null,
        };
    }, [activityPhase, isPhaseWorking, parsedStatus, retryInfo, abortState]);

    const forming = React.useMemo<FormingSummary>(() => {
        const isActive = isPhaseWorking && parsedStatus.activePartType === 'text';
        return { isActive, characterCount: 0 };
    }, [isPhaseWorking, parsedStatus.activePartType]);

    const working = React.useMemo<WorkingSummary>(() => {
        if (baseWorking.wasAborted || baseWorking.abortActive) {
            return baseWorking;
        }

        const hasPendingPermission = sessionPermissionRequests.length > 0;
        const hasPendingForm = sessionFormRequests.length > 0;

        if (!hasPendingPermission && !hasPendingForm) {
            return baseWorking;
        }

        if (hasPendingForm) {
            return {
                ...baseWorking,
                statusText: null,
                isWorking: false,
                hasWorkingContext: false,
                hasActiveTools: false,
                canAbort: false,
                activePartType: undefined,
                activeToolName: undefined,
                retryInfo: null,
            };
        }

        return {
            ...baseWorking,
            statusText: 'waiting for permission',
            status: { key: 'chat.agentStatus.waitingPermission' },
            isWaitingForPermission: true,
            canAbort: false,
            retryInfo: null,
        };
    }, [baseWorking, sessionPermissionRequests, sessionFormRequests]);

    return {
        activeModel: activeAssistant.model,
        forming,
        working,
    };
}
