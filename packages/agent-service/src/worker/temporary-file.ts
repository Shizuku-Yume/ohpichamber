import { unlink } from 'node:fs/promises';

const missing = (error: Error): boolean => 'code' in error && error.code === 'ENOENT';

/**
 * Removes the temporary file an atomic write created. Cleanup runs from a
 * finally block, where the rename has usually consumed the file already, so
 * absence is the successful case; any other filesystem failure is reported to
 * the caller instead of being lost in the unwind.
 */
export const removeTemporaryFile = async (path: string): Promise<void> => {
  try {
    await unlink(path);
  } catch (error) {
    if (!(error instanceof Error && missing(error))) throw error;
  }
};
