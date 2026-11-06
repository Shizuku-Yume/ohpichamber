import { realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import { UsageQuerySchema, type UsageModel, type UsageQuery, type UsageQueryResult, type UsageStats, type UsageToolTotals, type UsageToolsResponse, type UsageToolUsage } from '@openchamber/agent-contract';
import type { SessionEntry, SessionHeader } from '@oh-my-pi/pi-coding-agent/session/session-entries';
import { loadSessionFile, normalizeAssistantUsage } from '@oh-my-pi/pi-coding-agent/session/session-loader';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import { MemorySessionStorage } from '@oh-my-pi/pi-coding-agent/session/session-storage';
import type { UsageSessionReference } from '../protocol.ts';
import { currentDb, getFileOffsets, initDb } from '@oh-my-pi/omp-stats/db';
import { syncAllSessions } from '@oh-my-pi/omp-stats';

const Count = z.number().int().nonnegative();
const Amount = z.number().finite().nonnegative();
const NativeUsage = z.object({ input: Count.optional(), output: Count.optional(), cacheRead: Count.optional(), cacheWrite: Count.optional(), totalTokens: Count.optional(),
  cost: z.object({ input: Amount.optional(), output: Amount.optional(), cacheRead: Amount.optional(), cacheWrite: Amount.optional(), total: Amount.optional() }).optional(),
  orchestration: z.object({ input: Count.optional(), output: Count.optional(), cacheRead: Count.optional() }).optional(),
}).passthrough();
const EntryIdentity = z.object({ type: z.string(), id: z.string().min(1), parentId: z.string().min(1).nullable(), timestamp: z.string().refine(value => Number.isFinite(Date.parse(value))) });
const Header = z.object({ type: z.literal('session'), id: z.string().min(1), version: z.number().int().min(2), timestamp: z.string(), cwd: z.string(), parentSession: z.string().optional() });
const MessageIdentity = z.object({ role: z.string(), timestamp: z.number().finite().nonnegative() });
const Assistant = MessageIdentity.extend({ role: z.literal('assistant'), provider: z.string().min(1), model: z.string().min(1), content: z.array(z.object({ type: z.string() }).passthrough()), usage: NativeUsage.optional() });
const ToolCall = z.object({ type: z.literal('toolCall'), id: z.string().min(1), name: z.string().min(1) });
const ToolResult = MessageIdentity.extend({ role: z.literal('toolResult'), toolCallId: z.string().min(1), toolName: z.string().min(1), isError: z.boolean() });
const Interrupted = z.object({ __synthetic: z.boolean().optional(), __interrupted: z.boolean().optional() });
class CorruptSession extends Error {}

type Source = { reference: UsageSessionReference; header: SessionHeader; branch: SessionEntry[] };
/** One admitted reference resolved to its index key and its active-branch entry ids. */
type IndexedReference = {
  reference: UsageSessionReference;
  file: string;
  family: string;
  /** Entry ids on the active branch, in order: what the report is allowed to count. */
  branchIds: Set<string>;
  /** The validated active branch, reused for tool accounting with no extra I/O. */
  branch: SessionEntry[];
  /** Native header identity and its declared parent, despite the fork-dedup guard. */
  header: SessionHeader;
  tools: boolean;
};
type Batch = {
  references: IndexedReference[];
  errors: Record<string, string>;
  /** Tool calls whose outcome window needs the JSONL result time the index does not store. */
  toolResults: Map<string, Map<string, { timestamp: number; interrupted: boolean; failed: boolean }>>;
};

/**
 * Validated transcripts keyed by file when the index has not seen them.
 *
 * `stats.db` cannot answer these two questions, so the authoritative projection
 * stays here: its `messages` / `tool_calls` tables carry no `parent_id`, so the
 * abandoned-branch walk that `getBranch()` performs is not expressible in SQL,
 * and `tool_calls` records only a call time — a tool result's arrival time
 * decides whether an outcome falls inside `[from, to)`, which the index does
 * not store. `getOverallStats` would also aggregate every row in the database,
 * losing the authorized-reference scope this report must keep, so the canonical
 * answer stays a projection of the references the Host admitted — but a warm
 * reference costs one `stat` and no JSONL parse.
 */
/** Cold-validated transcripts, keyed by file, reused while the bytes are unchanged. */
const validatedSources = new Map<string, { size: number; mtimeMs: number; tools: boolean; source: Source }>();

/** Read only the authorized transcript. No ancestor paths, stats databases, or session directories are scanned. */
async function readSource(reference: UsageSessionReference, includeTools: boolean): Promise<Source> {
  const file = await realpath(reference.sessionFile);
  if (file !== resolve(reference.sessionFile)) throw new Error('USAGE_SESSION_UNCONTAINED');
  if (reference.sessionsDirectory !== undefined) {
    const directory = await realpath(reference.sessionsDirectory);
    const path = relative(directory, file);
    if (isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`) || path === '') throw new Error('USAGE_SESSION_UNCONTAINED');
  }
  // Reuse a validated read while the file is byte-identical; containment above
  // still ran, so a swapped symlink can never be served from the cache.
  const cached = validatedSources.get(file);
  if (cached !== undefined) {
    const info = await stat(file).catch(() => null);
    if (info && info.size === cached.size && info.mtimeMs === cached.mtimeMs && !includeTools) {
      return { ...cached.source, reference };
    }
    validatedSources.delete(file);
  }
  const loaded = await loadSessionFile(file, undefined, { throwIfMissing: true });
  if (loaded.malformedRecords > 0 || loaded.invalidHeader || loaded.sourceSize === null || loaded.entries.length === 0) throw new CorruptSession();
  const header = loaded.entries[0];
  if (!Header.safeParse(header).success || header?.type !== 'session') throw new CorruptSession();
  const entries: SessionEntry[] = [];
  for (let index = 1; index < loaded.entries.length; index++) {
    const entry = loaded.entries[index]!;
    if (entry.type === 'session' || !EntryIdentity.safeParse(entry).success) throw new CorruptSession();
    entries.push(entry);
  }
  const ids = new Map(entries.map(entry => [entry.id, entry]));
  if (ids.size !== entries.length) throw new CorruptSession();
  for (const entry of entries) if (entry.parentId !== null && !ids.has(entry.parentId)) throw new CorruptSession();
  // A reduced native snapshot avoids SessionManager's image/blob hydration and any writes to the persisted transcript.
  const storage = new MemorySessionStorage();
  storage.writeTextSync(file, [JSON.stringify({ type: 'session', id: header.id, timestamp: header.timestamp, version: 3, cwd: reference.cwd }), ...entries.map(entry => JSON.stringify(entry))].join('\n') + '\n');
  const manager = await SessionManager.open(file, dirname(file), storage, { initialCwd: reference.cwd, throwIfMissing: true, suppressBreadcrumb: true });
  try {
    const branch = manager.getBranch();
    if (branch.length > 0 && branch[0]?.parentId !== null) throw new CorruptSession();
    // `includeTools` only adds the tool-result rows this caller needs; the branch
    // identity is identical either way, so one cache entry can serve both.
    const project = (withTools: boolean): Source => ({
      reference, header,
      branch: branch.flatMap((entry): SessionEntry[] => {
        if (entry.type !== 'message') return [entry];
        const message = entry.message;
        if (message.role === 'assistant') {
          if (!Assistant.safeParse(message).success) throw new CorruptSession();
          normalizeAssistantUsage(message);
          const content: Extract<typeof message.content[number], { type: 'toolCall' }>[] = [];
          if (withTools) for (const block of message.content) if (block.type === 'toolCall') {
            if (!ToolCall.safeParse(block).success) throw new CorruptSession();
            content.push({ type: 'toolCall', id: block.id, name: block.name, arguments: {} });
          }
          return [{ ...entry, message: { role: 'assistant', api: message.api, provider: message.provider,
            model: message.model, usage: message.usage, stopReason: message.stopReason, timestamp: message.timestamp, content } }];
        }
        if (message.role === 'user') return [{ ...entry, message: { role: 'user', content: '', synthetic: message.synthetic, timestamp: message.timestamp } }];
        if (message.role === 'toolResult') {
          if (!withTools) return [];
          if (!ToolResult.safeParse(message).success) throw new CorruptSession();
          const marker = Interrupted.safeParse(message.details);
          // Native recovery results predate the structured interruption discriminator.
          const recovery = message.content.some(block => block.type === 'text' && (block.text === 'The parent session may still be running this tool; its outcome is unknown.'
            || block.text === 'Previous OMP process exited before this tool returned; its outcome is unknown.'
            || block.text.startsWith('Tool was not executed because the run was aborted: ')));
          return [{ ...entry, message: { role: 'toolResult', toolCallId: message.toolCallId, toolName: message.toolName,
            isError: message.isError, timestamp: message.timestamp, content: [], details: { __interrupted: recovery || (marker.success && (marker.data.__synthetic === true || marker.data.__interrupted === true)) } } }];
        }
        return [];
      }),
    });
    const source = project(false);
    const info = await stat(file).catch(() => null);
    if (info) validatedSources.set(file, { size: info.size, mtimeMs: info.mtimeMs, tools: false, source: { reference, header, branch: source.branch } });
    return includeTools ? project(true) : source;
  } finally {
    await manager.close();
  }
}

/**
 * Resolve the admitted references against `stats.db`, hydrating only cold ones.
 *
 * Cold (never indexed, or changed since): the transcript is parsed once — that
 * read is also the only strict validation, and it yields the active-branch
 * entry ids. Warm: the cached branch ids are reused and no JSONL is opened.
 * Aggregate numbers then come from the index; only tool-outcome timing keeps a
 * narrow JSONL path, because `tool_calls` stores the call time but not the
 * result time that decides the `[from, to)` window.
 */
async function readBatch(query: UsageQueryResult, references: readonly UsageSessionReference[], includeTools: boolean): Promise<Batch> {
  const errors: Record<string, string> = Object.create(null);
  const admitted: Array<{ reference: UsageSessionReference; file: string }> = [];
  const seen = new Set<string>();
  let candidates = 0;
  for (const reference of references) {
    if ((query.workspaceId !== undefined && reference.workspaceId !== query.workspaceId) || (query.projectId !== undefined && reference.projectId !== query.projectId)) continue;
    const file = resolve(reference.sessionFile);
    if (seen.has(file)) continue;
    seen.add(file);
    candidates++;
    try {
      await readSource(reference, includeTools);
      admitted.push({ reference, file });
    } catch (error) { errors[reference.sessionId] = error instanceof CorruptSession ? 'USAGE_SESSION_CORRUPT' : 'USAGE_SESSION_UNREADABLE'; }
  }
  if (candidates > 0 && admitted.length === 0) throw new Error('USAGE_UNAVAILABLE');

  await initDb();
  const db = currentDb();
  if (!db) throw new Error('USAGE_UNAVAILABLE');
  const files = admitted.map(entry => entry.file);
  // Scope the index to the authorized set: rows from a deleted or no-longer-
  // authorized transcript must never contribute, and their identity would
  // otherwise block the fork guard when a session reuses an entry id.
  if (files.length > 0) {
    const placeholders = files.map(() => '?').join(',');
    db.query(`DELETE FROM messages WHERE session_file NOT IN (${placeholders})`).run(...files);
    db.query(`DELETE FROM user_messages WHERE session_file NOT IN (${placeholders})`).run(...files);
    db.query(`DELETE FROM tool_calls WHERE session_file NOT IN (${placeholders})`).run(...files);
    db.query(`DELETE FROM file_offsets WHERE session_file NOT IN (${placeholders})`).run(...files);
  }
  // Cold hydration: index the files this request needs; warm files are skipped
  // by the native offset check and never re-parsed.
  const offsets = getFileOffsets(files);
  const cold: string[] = [];
  for (const { file } of admitted) {
    const stored = offsets.get(file);
    const info = await stat(file).catch(() => null);
    if (!info) continue;
    if (stored !== undefined && stored.parserState !== undefined
      && stored.lastModified === info.mtimeMs && stored.parserState.size === info.size) continue;
    cold.push(file);
  }
  if (cold.length > 0) await syncAllSessions({ files: cold, workers: 1 });

  const toolResults = new Map<string, Map<string, { timestamp: number; interrupted: boolean; failed: boolean }>>();
  const referencesByFile = new Map<string, IndexedReference>();
  for (const { reference, file } of admitted) {
    const source = await readSource(reference, includeTools);
    if (includeTools) {
      const results = new Map<string, { timestamp: number; interrupted: boolean; failed: boolean }>();
      for (const entry of source.branch) {
        if (entry.type !== 'message' || entry.message.role !== 'toolResult') continue;
        const details = Interrupted.safeParse(entry.message.details);
        results.set(entry.message.toolCallId, {
          timestamp: entry.message.timestamp,
          interrupted: details.success && details.data.__interrupted === true,
          failed: entry.message.isError,
        });
      }
      toolResults.set(file, results);
    }
    referencesByFile.set(file, {
      reference,
      file,
      family: resolveFamily(reference, admitted),
      // Every branch entry the index may have stored, including `model_usage`
      // rows, which carry provider usage without being transcript messages.
      branchIds: new Set(source.branch.map(entry => entry.id)),
      branch: source.branch,
      header: source.header,
      tools: includeTools,
    });
  }
  // Proven fork lineage, as the JSONL projection always computed it: a header's
  // own id and its declared `parentSession` link already-admitted transcripts
  // into one family, so copies count once and the abandoned branch drops out.
  const rows = [...referencesByFile.values()];
  const byIdentity = new Map<string, IndexedReference>();
  const byParent = new Map<string, IndexedReference>();
  const parents = new Map<IndexedReference, IndexedReference>();
  const representative = (row: IndexedReference): IndexedReference => {
    let current = row;
    while (parents.has(current)) current = parents.get(current)!;
    return current;
  };
  for (const row of rows) { byIdentity.set(row.header.id, row); byIdentity.set(row.file, row); }
  for (const row of rows) {
    const parentToken = row.header.parentSession;
    const parent = parentToken ? byIdentity.get(parentToken) ?? byParent.get(parentToken) : undefined;
    if (parentToken && !byParent.has(parentToken)) byParent.set(parentToken, row);
    const sameSession = byIdentity.get(row.header.id);
    for (const ancestor of [parent, sameSession]) if (ancestor) {
      const from = representative(row), to = representative(ancestor);
      if (from !== to) parents.set(from, to);
    }
  }
  for (const row of rows) row.family = representative(row).reference.sessionId;
  return { references: rows, errors, toolResults };
}

/** Proven fork lineage: a transcript's root id, or the root it declares in its header. */
function resolveFamily(reference: UsageSessionReference, admitted: readonly { reference: UsageSessionReference; file: string }[]): string {
  if (reference.sessionId !== reference.rootSessionId) return reference.rootSessionId;
  const root = reference.rootSessionId;
  return admitted.some(entry => entry.reference.sessionId === root) ? root : reference.sessionId;
}

function dateKey(format: Intl.DateTimeFormat, timestamp: number): string {
  const parts = format.formatToParts(timestamp);
  return `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}-${parts.find(part => part.type === 'day')!.value}`;
}

/**
 * Settle one native transcript into `@oh-my-pi/omp-stats`' SQLite index
 * (`stats.db`). Turn settlement calls this, so the analytics database follows
 * live work incrementally instead of being rebuilt by a raw JSONL rescan.
 *
 * The canonical usage report still projects the validated native branch (see
 * `getUsageStats`): the stats parser indexes every persisted entry and has no
 * notion of the Host's authorized reference set or an abandoned branch, and
 * the canonical view must never count either.
 */
export async function settleUsageSession(sessionFile: string): Promise<void> {
  await initDb();
  // One worker: the settlement runs inside the session worker process, where a
  // Bun worker pool would cost more than the tail read it replaces.
  await syncAllSessions({ files: [resolve(sessionFile)], workers: 1 });
}

/**
 * Index rows for every admitted file, keyed by entry id.
 *
 * A transcript's fork copies are stored once, under whichever `session_file`
 * wrote them first, so a per-file query would lose entries a sibling owns. The
 * union across the admitted set recovers them; the branch identity then decides
 * which of them this reference may count, and the family dedupe keeps a copied
 * entry from counting twice.
 */
function indexRows(db: import('bun:sqlite').Database, files: readonly string[], from: number, to: number) {
  const messages = new Map<string, {
    timestamp: number; model: string; provider: string;
    input: number; output: number; cacheRead: number; cacheWrite: number; total: number; cost: number;
  }>();
  const prompts = new Map<string, number>();
  if (files.length === 0) return { messages, prompts };
  const placeholders = files.map(() => '?').join(',');
  const messageRows = db.query(`
    SELECT entry_id, timestamp, model, provider, input_tokens, output_tokens,
      cache_read_tokens, cache_write_tokens, total_tokens, cost_total
    FROM messages WHERE session_file IN (${placeholders}) AND timestamp >= ? AND timestamp < ?
  `).all(...files, from, to) as Array<{
    entry_id: string; timestamp: number; model: string; provider: string;
    input_tokens: number; output_tokens: number; cache_read_tokens: number;
    cache_write_tokens: number; total_tokens: number; cost_total: number;
  }>;
  for (const row of messageRows) {
    if (messages.has(row.entry_id)) continue;
    messages.set(row.entry_id, {
      timestamp: row.timestamp, model: row.model, provider: row.provider,
      input: row.input_tokens, output: row.output_tokens,
      cacheRead: row.cache_read_tokens, cacheWrite: row.cache_write_tokens,
      total: row.total_tokens, cost: row.cost_total,
    });
  }
  const promptRows = db.query(`
    SELECT entry_id, timestamp FROM user_messages
    WHERE session_file IN (${placeholders}) AND timestamp >= ? AND timestamp < ?
  `).all(...files, from, to) as Array<{ entry_id: string; timestamp: number }>;
  for (const row of promptRows) if (!prompts.has(row.entry_id)) prompts.set(row.entry_id, row.timestamp);
  return { messages, prompts };
}

export async function getUsageStats(input: UsageQuery, references: readonly UsageSessionReference[]): Promise<UsageStats> {
  const query = UsageQuerySchema.parse(input);
  const batch = await readBatch(query, references, false);
  const db = currentDb();
  if (!db) throw new Error('USAGE_UNAVAILABLE');
  const partial = Object.keys(batch.errors).length > 0;
  const report: UsageStats = { range: { from: query.from ?? query.to - 1, to: query.to }, sessions: 0, subagents: 0, prompts: 0, steps: 0,
    tokens: { input: 0, output: 0, reasoning: null, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0, tools: { mode: 'none' },
    activeDays: 0, streak: 0, activity: [], models: [], partial };
  if (partial) report.errors = batch.errors;
  const models = new Map<string, UsageModel>();
  const days = new Map<string, number>();
  const seen = new Set<string>();
  const sessions = new Set<string>();
  const subagents = new Set<string>();
  const format = new Intl.DateTimeFormat('en-US', { timeZone: query.timezone, year: 'numeric', month: '2-digit', day: '2-digit' });

  // One indexed read for the whole admitted set: fork copies are stored under a
  // single session_file, so a per-reference query would miss sibling-owned rows.
  const files = batch.references.map(row => row.file);
  const indexed = indexRows(db, files, query.from ?? 0, query.to);
  for (const row of batch.references) {
    const child = row.reference.sessionId !== row.reference.rootSessionId;
    let active = false;
    const credit = (entryId: string): boolean => {
      // Fork siblings copy their parent's entries: one family counts each entry once.
      const identity = JSON.stringify([row.family, entryId]);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    };
    // Prompt counting keeps the validated branch: the stats parser's
    // `user_messages` rows omit a prompt whose only content is an attachment,
    // and the branch (already in memory for this request) has every one.
    for (const entry of row.branch) {
      if (entry.type !== 'message' || entry.message.role !== 'user' || entry.message.synthetic) continue;
      if (entry.message.timestamp < (query.from ?? 0) || entry.message.timestamp >= query.to) continue;
      if (!credit(entry.id)) continue;
      if (query.from === undefined) report.range.from = Math.min(report.range.from, entry.message.timestamp);
      active = true;
      // A child's prompt belongs to its parent turn, never to the root count.
      if (!child) report.prompts += 1;
    }
    for (const [entryId, message] of indexed.messages) {
      if (!row.branchIds.has(entryId)) continue;
      if (!credit(entryId)) continue;
      if (query.from === undefined) report.range.from = Math.min(report.range.from, message.timestamp);
      active = true;
      if (!child) report.steps += 1;
      report.tokens.input += message.input;
      report.tokens.output += message.output;
      report.tokens.cacheRead += message.cacheRead;
      report.tokens.cacheWrite += message.cacheWrite;
      report.tokens.total += message.total;
      report.cost += message.cost;
      const modelKey = JSON.stringify([message.provider, message.model]);
      let model = models.get(modelKey);
      if (!model) {
        model = { providerId: message.provider, modelId: message.model, variant: null, steps: 0,
          tokens: { input: 0, output: 0, reasoning: null, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0 };
        models.set(modelKey, model);
      }
      model.steps += 1;
      model.tokens.input += message.input;
      model.tokens.output += message.output;
      model.tokens.cacheRead += message.cacheRead;
      model.tokens.cacheWrite += message.cacheWrite;
      model.tokens.total += message.total;
      model.cost += message.cost;
      const date = dateKey(format, message.timestamp);
      days.set(date, (days.get(date) ?? 0) + 1);
    }
    if (active) { if (child) subagents.add(row.file); else sessions.add(row.file); }
  }
  report.sessions = sessions.size;
  report.subagents = subagents.size;

  report.models = [...models.values()].sort((a, b) => b.tokens.total - a.tokens.total || a.providerId.localeCompare(b.providerId) || a.modelId.localeCompare(b.modelId));
  report.activity = [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, steps]) => ({ date, steps }));
  report.activeDays = days.size;
  let previous: number | undefined, streak = 0;
  for (const { date } of report.activity) {
    // Compare calendar ordinals, not elapsed local milliseconds (DST days need not be 24 hours).
    const ordinal = Date.parse(`${date}T00:00:00Z`) / 86_400_000;
    streak = previous !== undefined && ordinal === previous + 1 ? streak + 1 : 1;
    report.streak = Math.max(report.streak, streak);
    previous = ordinal;
  }
  return report;
}

export async function getUsageTools(input: UsageQuery, references: readonly UsageSessionReference[]): Promise<UsageToolsResponse> {
  const query = UsageQuerySchema.parse(input);
  const batch = await readBatch(query, references, true);
  const calls = new Map<string, { name: string; outcome: 'succeeded' | 'failed' | 'unfinished' }>();
  for (const row of batch.references) {
    // Tool accounting keeps the validated branch: `tool_calls` has no result
    // time (needed for the `[from, to)` outcome window) and its fork guard
    // collapses equal `(entry_id, timestamp)` pairs that two distinct families
    // legitimately own. Names and outcomes therefore come from the branch that
    // was already read and cached for this request, with no extra file I/O.
    const pending = new Map<string, string>();
    for (const entry of row.branch) {
      if (entry.type !== 'message') continue;
      const message = entry.message;
      if (message.role === 'assistant') {
        for (const block of message.content) {
          if (block.type !== 'toolCall') continue;
          const identity = JSON.stringify([row.family, entry.id, block.id]);
          pending.set(block.id, identity);
          if (message.timestamp >= (query.from ?? 0) && message.timestamp < query.to && !calls.has(identity)) calls.set(identity, { name: block.name, outcome: 'unfinished' });
        }
      } else if (message.role === 'toolResult' && message.timestamp < query.to) {
        const identity = pending.get(message.toolCallId);
        const call = identity && calls.get(identity);
        if (!call) continue;
        const marker = Interrupted.safeParse(message.details);
        if (marker.success && marker.data.__interrupted) continue;
        call.outcome = message.isError ? 'failed' : 'succeeded';
      }
    }
  }
  const usage = new Map<string, UsageToolUsage>();
  const totals: UsageToolTotals = { calls: 0, succeeded: 0, failed: 0, unfinished: 0 };
  for (const call of calls.values()) {
    let row = usage.get(call.name);
    if (!row) { row = { name: call.name, calls: 0, succeeded: 0, failed: 0, unfinished: 0, durationP50: null }; usage.set(call.name, row); }
    row.calls++; row[call.outcome]++;
    totals.calls++; totals[call.outcome]++;
  }
  const partial = Object.keys(batch.errors).length > 0;
  const response: UsageToolsResponse = { totals, usage: [...usage.values()].sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name)), partial };
  if (partial) response.errors = batch.errors;
  return response;
}
