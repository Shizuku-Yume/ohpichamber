import React from 'react';
import { useConfigStore } from '@/stores/useConfigStore';

export const MAX_CATEGORIES = 32;

const slugifyCategoryName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);

export const buildUniqueCategoryId = (name: string, existingIds: Iterable<string>): string => {
  const taken = new Set(existingIds);
  const base = slugifyCategoryName(name) || `category-${Date.now()}`;
  const initial = base.slice(0, 64);
  if (!taken.has(initial)) return initial;
  for (let counter = 2; ; counter += 1) {
    const suffix = `-${counter}`;
    const candidate = `${base.slice(0, Math.max(1, 64 - suffix.length)).replace(/-+$/, '')}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
};

export const hasCategoryNameCollision = (
  name: string,
  categories: ReadonlyArray<{ id?: string; name: string }>,
  excludeId?: string,
): boolean => {
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  const normalized = trimmed.toLocaleLowerCase();
  return categories.some(
    (entry) => (excludeId === undefined || entry.id !== excludeId)
      && entry.name.trim().toLocaleLowerCase() === normalized,
  );
};

/** The thinking efforts OMP reports for one model; 'off' plus reasoningOptions. Empty when the model has none. */
export const useModelReasoningEfforts = (
  providerID: string | null | undefined,
  modelID: string | null | undefined,
): string[] => {
  const providers = useConfigStore((state) => state.providers);
  return React.useMemo(() => {
    if (!providerID || !modelID) return [];
    const provider = providers.find((entry) => entry.providerId === providerID);
    const model = provider?.models.find((entry) => entry.modelId === modelID);
    if (!model?.reasoningEffortSupported && !model?.reasoningOptions?.length) return [];
    return ['off', ...model.reasoningOptions.map((option) => option.reasoningEffort).filter((effort) => effort !== 'off')];
  }, [modelID, providerID, providers]);
};

/**
 * The saved level, or null when the model does not list it: list positions
 * saved before #4133 run as the model's default on the server, so they read
 * as Default here too. A model with no known levels keeps what was saved.
 */
export const knownVariant = (value: string | null | undefined, variants: string[]): string | null => (
  value && (variants.length === 0 || variants.includes(value)) ? value : null
);

