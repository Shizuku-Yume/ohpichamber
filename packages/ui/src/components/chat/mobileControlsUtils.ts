import type { Agent } from '@openchamber/agent-contract';
import { getProviderModelDisplayName, type DisplayProvider } from '@/lib/modelDisplay';

export type MobileControlsPanel = 'model' | 'agent' | 'variant' | null;

/** Cycle through available favorites, or the complete enabled native roster. */
export const getCycledAgentId = (
    agents: readonly Pick<Agent, 'agentId'>[],
    currentAgentId: string | undefined,
    direction: 1 | -1 = 1,
    favoriteAgentIds: readonly string[] = [],
) => {
    const favorites = agents.filter((agent) => favoriteAgentIds.includes(agent.agentId));
    const candidates = favorites.length > 0 ? favorites : agents;
    if (candidates.length === 0) return null;
    const index = candidates.findIndex((agent) => agent.agentId === currentAgentId);
    if (index < 0) return (direction === 1 ? candidates[0] : candidates[candidates.length - 1]).agentId;
    if (candidates.length === 1) return null;
    return candidates[(index + direction + candidates.length) % candidates.length].agentId;
};

const capitalizeLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const getAgentDisplayName = (
    agents: readonly Pick<Agent, 'agentId' | 'name'>[],
    agentId?: string,
    fallbackLabel = '',
) => {
    if (agentId) return agents.find((agent) => agent.agentId === agentId)?.name ?? agentId;
    const fallbackAgent = agents.find((agent) => agent.agentId === 'build') ?? agents[0];
    return fallbackAgent?.name ?? fallbackLabel;
};

export const getModelDisplayName = (
    provider: DisplayProvider,
    modelId: string | undefined,
    fallbackLabel = '',
) => {
    return getProviderModelDisplayName(provider, modelId, { fallbackLabel });
};

/**
 * The composer's effort label is tinted by how hard the model thinks: only the
 * `default` level stays grey; light levels and any unknown name read info,
 * medium and high warning, the top levels error. Pure status text colors, so
 * old WebViews without color-mix render them; opacity keeps them quiet.
 */
const EFFORT_TONE_CLASS = {
    default: 'text-muted-foreground',
    info: 'text-[var(--status-info-text)] opacity-75',
    warning: 'text-[var(--status-warning-text)] opacity-75',
    error: 'text-[var(--status-error-text)] opacity-75',
} as const;

type EffortTone = keyof typeof EFFORT_TONE_CLASS;

const getEffortTone = (variant?: string): EffortTone => {
    const name = variant?.trim().toLowerCase();
    if (!name || name === 'default') return 'default';
    if (name === 'medium' || name === 'high') return 'warning';
    if (name === 'xhigh' || name === 'max') return 'error';
    return 'info';
};

export const getEffortToneClass = (variant?: string) => EFFORT_TONE_CLASS[getEffortTone(variant)];

export const formatEffortLabel = (variant?: string) => {
    if (!variant || variant.trim().length === 0) {
        return 'Default';
    }
    const trimmed = variant.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return trimmed;
    }
    return capitalizeLabel(trimmed);
};

