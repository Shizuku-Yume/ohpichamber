import type { Message, ToolCallPart } from '@openchamber/agent-contract';

import { getToolFileChanges } from '@/components/chat/message/parts/toolDiffUtils';
import { getRelativeFilePath } from '@/lib/path-utils';
import { normalizePath } from '@/lib/pathNormalization';
import type { TurnSnapshotDiff } from './turnSnapshotDiff';

/**
 * One file's patch from every edit the turn reported for it. Each tool result
 * carries hunks against its own base, so they are appended in call order under
 * the first header instead of keeping a header that would truncate the parse.
 */
const combineTurnPatches = (patches: readonly string[]): string | undefined => {
 const firstHunkPatch = patches.findIndex((patch) => /^@@\s/m.test(patch));
 if (firstHunkPatch < 0) return patches[0];
 const headerEnd = patches[firstHunkPatch].search(/^@@\s/m);
 const hunks = patches.slice(firstHunkPatch)
  .map((patch) => {
   const hunkStart = patch.search(/^@@\s/m);
   return hunkStart < 0 ? '' : patch.slice(hunkStart).trimEnd();
  })
  .filter((hunk) => hunk.length > 0);
 return `${patches[firstHunkPatch].slice(0, headerEnd)}${hunks.join('\n')}\n`;
};

interface TurnFileEntry {
 file: string;
 status?: string;
 additions: number;
 deletions: number;
 patches: string[];
}

/**
 * The last turn's diff, from the edits the turn itself reported.
 *
 * The Host keeps no per-turn filesystem snapshot, so the canonical tool
 * results are the evidence: one entry per file, line counts and patches summed
 * across the turn's calls. A file a `write` created reports a path but no
 * patch, and stays in the list with no lines to show.
 */
export const projectLastTurnDiffs = (messages: readonly Message[], directory: string | null): TurnSnapshotDiff[] => {
 const lastTurnId = messages.at(-1)?.turnId;
 if (!lastTurnId) return [];
 const turnMessages = messages.filter((message) => message.turnId === lastTurnId);
 const calls = new Map<string, ToolCallPart>();
 for (const message of turnMessages) {
  for (const part of message.parts) {
   if (part.type === 'tool_call') calls.set(part.toolCallId, part);
  }
 }

 const files = new Map<string, TurnFileEntry>();
 const seen = new Set<string>();
 for (const message of turnMessages) {
  for (const part of message.parts) {
   if (part.type !== 'tool_result' || seen.has(part.toolCallId)) continue;
   seen.add(part.toolCallId);
   for (const change of getToolFileChanges(part, calls.get(part.toolCallId))) {
    const file = getRelativeFilePath(change.path, directory);
    if (!file) continue;
    const key = normalizePath(file) ?? file;
    const entry = files.get(key) ?? { file, additions: 0, deletions: 0, patches: [] };
    entry.file = file;
    if (change.op === 'create') entry.status = 'added';
    else if (change.op === 'delete') entry.status = 'deleted';
    entry.additions += change.additions ?? 0;
    entry.deletions += change.deletions ?? 0;
    if (change.diff) entry.patches.push(change.diff);
    files.set(key, entry);
   }
  }
 }

 return Array.from(files.values(), ({ file, status, additions, deletions, patches }) => ({
  file, status, additions, deletions, patch: combineTurnPatches(patches),
 }));
};
