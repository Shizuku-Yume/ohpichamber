import { z } from 'zod';

import { runtimeFetch } from '@/lib/runtime-fetch';
import { getSafeStorage } from '@/stores/utils/safeStorage';

export type LegacyDataPresence = 'present' | 'absent' | 'error';
const dismissalKey = (runtimeKey: string) => `legacy-data-notice-dismissed:${runtimeKey}`;
const presenceSchema = z.strictObject({ present: z.boolean() });

export const isLegacyNoticeDismissed = (runtimeKey: string): boolean => {
  try {
    return getSafeStorage().getItem(dismissalKey(runtimeKey)) === 'true';
  } catch {
    return false;
  }
};

export const dismissLegacyNotice = (runtimeKey: string): void => {
  getSafeStorage().setItem(dismissalKey(runtimeKey), 'true');
};

export const readLegacyDataPresence = async (signal: AbortSignal): Promise<'present' | 'absent'> => {
  const response = await runtimeFetch('/api/host/legacy-data', { signal });
  if (!response.ok) throw new Error('Legacy presence unavailable');
  const parsed = presenceSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('Invalid legacy presence response');
  return parsed.data.present ? 'present' : 'absent';
};
