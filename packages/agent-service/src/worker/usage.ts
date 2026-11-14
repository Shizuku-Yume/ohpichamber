import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import {
  UsageQuerySchema, type UsageModel, type UsageProvider, type UsagePricing,
  type UsageQuery, type UsageQueryResult, type UsageStats, type UsageTokens,
  type UsageToolTotals, type UsageToolsResponse, type UsageToolUsage,
} from '@openchamber/agent-contract';
import type { SessionEntry, SessionHeader } from '@oh-my-pi/pi-coding-agent/session/session-entries';
import { loadSessionFile, normalizeAssistantUsage } from '@oh-my-pi/pi-coding-agent/session/session-loader';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import { MemorySessionStorage } from '@oh-my-pi/pi-coding-agent/session/session-storage';
import type { UsageSessionReference } from '../protocol.ts';
import { initDb } from '@oh-my-pi/omp-stats/db';
import { syncAllSessions } from '@oh-my-pi/omp-stats';
import { getBundledModel, getModelPricingStatus } from '@oh-my-pi/pi-catalog';

const Count = z.number().int().nonnegative();
const Amount = z.number().finite().nonnegative();
const NativeUsage = z.object({
  input: Count.optional(), output: Count.optional(), cacheRead: Count.optional(), cacheWrite: Count.optional(),
  totalTokens: Count.optional(), reasoningTokens: Count.optional(),
  cost: z.object({ input: Amount.optional(), output: Amount.optional(), cacheRead: Amount.optional(), cacheWrite: Amount.optional(), total: Amount.optional() }).optional(),
  orchestration: z.object({ input: Count.optional(), output: Count.optional(), cacheRead: Count.optional() }).optional(),
}).passthrough();
const EntryIdentity = z.object({ type: z.string(), id: z.string().min(1), parentId: z.string().min(1).nullable(), timestamp: z.string().refine(value => Number.isFinite(Date.parse(value))) });
const Header = z.object({ type: z.literal('session'), id: z.string().min(1), version: z.number().int().min(2), timestamp: z.string(), cwd: z.string(), parentSession: z.string().optional() });
const MessageIdentity = z.object({ role: z.string(), timestamp: z.number().finite().nonnegative() });
const Assistant = MessageIdentity.extend({
  role: z.literal('assistant'), provider: z.string().min(1), model: z.string().min(1),
  content: z.array(z.object({ type: z.string() }).passthrough()), usage: NativeUsage.optional(),
  duration: z.number().nullable().optional(), ttft: z.number().nullable().optional(),
});
const ToolCall = z.object({ type: z.literal('toolCall'), id: z.string().min(1), name: z.string().min(1) });
const ToolResult = MessageIdentity.extend({ role: z.literal('toolResult'), toolCallId: z.string().min(1), toolName: z.string().min(1), isError: z.boolean() });
const Interrupted = z.object({ __synthetic: z.boolean().optional(), __interrupted: z.boolean().optional() });
class CorruptSession extends Error { }

type Source = { reference: UsageSessionReference; header: SessionHeader; branch: SessionEntry[] };
type Batch = { sources: Source[]; errors: Record<string, string>; families: Map<Source, string> };

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
const validatedSources = new Map<string, { size: number; mtimeMs: number; tools: boolean; source: Source }>();

/** Read only the authorized transcript. No ancestor paths, stats databases, or session directories are scanned. */
async function readSource(reference: UsageSessionReference, includeTools: boolean): Promise<Source> {
  const file = await realpath(reference.sessionFile);
  // Containment below must run on every call: a symlink swapped in after a
  // cached read would otherwise be trusted.

  if (file !== resolve(reference.sessionFile)) throw new Error('USAGE_SESSION_UNCONTAINED');
  if (reference.sessionsDirectory !== undefined) {
    const directory = await realpath(reference.sessionsDirectory);
    const path = relative(directory, file);
    if (isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`) || path === '') throw new Error('USAGE_SESSION_UNCONTAINED');
  }
  // Reuse a validated read while the file is byte-identical, so the steady
  // state never re-parses the JSONL on a subsequent request.
  const cached = validatedSources.get(file);
  if (cached !== undefined) {
    const info = await stat(file).catch(() => null);
    if (info && info.size === cached.size && info.mtimeMs === cached.mtimeMs && (cached.tools || !includeTools)) {
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
    const base = { id: entry.id, parentId: entry.parentId, timestamp: entry.timestamp };
    if (entry.type === 'message') {
      if (!MessageIdentity.safeParse(entry.message).success) throw new CorruptSession();
      const message = entry.message;
      if (message.role === 'assistant') {
        if (!Assistant.safeParse(message).success) throw new CorruptSession();
        normalizeAssistantUsage(message);
        const content: Extract<typeof message.content[number], { type: 'toolCall' }>[] = [];
        if (includeTools) for (const block of message.content) if (block.type === 'toolCall') {
          if (!ToolCall.safeParse(block).success) throw new CorruptSession();
          content.push({ type: 'toolCall', id: block.id, name: block.name, arguments: {} });
        }
        entries.push({
          ...base, type: 'message', message: {
            role: 'assistant', api: message.api, provider: message.provider,
            model: message.model, usage: message.usage, stopReason: message.stopReason, timestamp: message.timestamp, content,
            duration: typeof message.duration === 'number' ? message.duration : undefined,
            ttft: typeof message.ttft === 'number' ? message.ttft : undefined,
          }
        });
      } else if (message.role === 'user') {
        entries.push({ ...base, type: 'message', message: { role: 'user', content: '', synthetic: message.synthetic, timestamp: message.timestamp } });
      } else if (includeTools && message.role === 'toolResult') {
        if (!ToolResult.safeParse(message).success) throw new CorruptSession();
        const marker = Interrupted.safeParse(message.details);
        // Native recovery results predate the structured interruption discriminator.
        const recovery = message.content.some(block => block.type === 'text' && (block.text === 'The parent session may still be running this tool; its outcome is unknown.'
          || block.text === 'Previous OMP process exited before this tool returned; its outcome is unknown.'
          || block.text.startsWith('Tool was not executed because the run was aborted: ')));
        entries.push({
          ...base, type: 'message', message: {
            role: 'toolResult', toolCallId: message.toolCallId, toolName: message.toolName,
            isError: message.isError, timestamp: message.timestamp, content: [], details: { __interrupted: recovery || (marker.success && (marker.data.__synthetic === true || marker.data.__interrupted === true)) }
          }
        });
      } else entries.push({ ...base, type: 'custom', customType: 'usage-lineage' });
    } else if (entry.type === 'model_usage') {
      if (!NativeUsage.safeParse(entry.usage).success || !entry.provider || !entry.model) throw new CorruptSession();
      const message: Extract<SessionEntry, { type: 'message' }>['message'] & { role: 'assistant' } = {
        role: 'assistant', api: entry.api, provider: entry.provider, model: entry.model, usage: entry.usage,
        stopReason: entry.stopReason, timestamp: Date.parse(entry.timestamp), content: [],
      };
      normalizeAssistantUsage(message);
      entries.push({ ...base, type: 'message', message });
    } else entries.push({ ...base, type: 'custom', customType: 'usage-lineage' });
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
    const info = await stat(file).catch(() => null);
    if (info) validatedSources.set(file, { size: info.size, mtimeMs: info.mtimeMs, tools: includeTools, source: { reference, header, branch } });
    return { reference, header, branch };
  } finally {
    await manager.close();
  }
}

async function readBatch(query: UsageQueryResult, references: readonly UsageSessionReference[], includeTools: boolean): Promise<Batch> {
  const sources: Source[] = [];
  const errors: Record<string, string> = Object.create(null);
  let candidates = 0;
  const files = new Set<string>();
  for (const reference of references) {
    if ((query.workspaceId !== undefined && reference.workspaceId !== query.workspaceId) || (query.projectId !== undefined && reference.projectId !== query.projectId)) continue;
    const file = resolve(reference.sessionFile);
    if (files.has(file)) continue;
    files.add(file);
    candidates++;
    try { sources.push(await readSource(reference, includeTools)); }
    catch (error) { errors[reference.sessionId] = error instanceof CorruptSession ? 'USAGE_SESSION_CORRUPT' : 'USAGE_SESSION_UNREADABLE'; }
  }
  if (candidates > 0 && sources.length === 0) throw new Error('USAGE_UNAVAILABLE');
  // Shared native parent identity proves fork lineage even when the ancestor is not readable or selected.
  // These tokens only link already-authorized sources; no header path is followed on disk.
  const byIdentity = new Map<string, Source>();
  for (const source of sources) { byIdentity.set(source.header.id, source); byIdentity.set(resolve(source.reference.sessionFile), source); }
  const byParent = new Map<string, Source>();
  const parents = new Map<Source, Source>();
  const representative = (source: Source): Source => {
    let current = source;
    while (parents.has(current)) current = parents.get(current)!;
    return current;
  };
  for (const source of sources) {
    const parentToken = source.header.parentSession;
    const parent = parentToken ? byIdentity.get(parentToken) ?? byParent.get(parentToken) : undefined;
    if (parentToken && !byParent.has(parentToken)) byParent.set(parentToken, source);
    const sameSession = byIdentity.get(source.header.id);
    for (const ancestor of [parent, sameSession]) if (ancestor) {
      const from = representative(source), to = representative(ancestor);
      if (from !== to) parents.set(from, to);
    }
  }
  const families = new Map(sources.map(source => [source, representative(source).reference.sessionId]));
  return { sources, errors, families };
}

function addTokens(target: UsageTokens, usage: Extract<SessionEntry, { type: 'message' }>['message'] & { role: 'assistant' }): void {
  target.input += usage.usage.input;
  target.output += usage.usage.output;
  target.cacheRead += usage.usage.cacheRead;
  target.cacheWrite += usage.usage.cacheWrite;
  target.total += usage.usage.totalTokens;
  const usageRecord: unknown = usage.usage;
  if (usageRecord && typeof usageRecord === 'object' && 'reasoningTokens' in usageRecord) {
    const r = usageRecord.reasoningTokens;
    if (typeof r === 'number' && Number.isFinite(r)) {
      target.reasoning = (target.reasoning ?? 0) + r;
    }
  }
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

function resolvePricing(provider: string, model: string, unpriced = 0): UsagePricing | null {
  if (unpriced > 0 || provider === 'xai-oauth') return null;
  const bundled = getBundledModel(provider, model);
  if (!bundled) return null;
  const status = getModelPricingStatus(bundled);
  const c = bundled.cost;
  const hasRates = c && c.input >= 0 && c.output >= 0 && c.cacheRead >= 0 && c.cacheWrite >= 0 && (status === 'fixed' || status === 'free');
  if (!hasRates) return null;
  return {
    inputPerMillionTokens: c.input,
    outputPerMillionTokens: c.output,
    cacheReadPerMillionTokens: c.cacheRead ?? null,
    cacheWritePerMillionTokens: c.cacheWrite ?? null,
  };
}

export async function getUsageStats(input: UsageQuery, references?: readonly UsageSessionReference[]): Promise<UsageStats> {
  const query = UsageQuerySchema.parse(input);
  const format = new Intl.DateTimeFormat('en-US', { timeZone: query.timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  if (references !== undefined) {
    if (references.length === 0) {
      return {
        range: { from: query.from ?? query.to - 1, to: query.to },
        sessions: 0, subagents: 0, prompts: 0, steps: 0,
        tokens: { input: 0, output: 0, reasoning: null, cacheRead: 0, cacheWrite: 0, total: 0 },
        cost: 0, tools: { mode: 'none' },
        activeDays: 0, streak: 0, activity: [], providers: [], models: [], partial: false,
      };
    }
    const batch = await readBatch(query, references, false);
    const partial = Object.keys(batch.errors).length > 0;
    const report: UsageStats = {
      range: { from: query.from ?? query.to - 1, to: query.to },
      sessions: 0, subagents: 0, prompts: 0, steps: 0,
      tokens: { input: 0, output: 0, reasoning: null, cacheRead: 0, cacheWrite: 0, total: 0 },
      cost: 0, tools: { mode: 'none' },
      activeDays: 0, streak: 0, activity: [], providers: [], models: [], partial,
    };
    if (partial) report.errors = batch.errors;

    const models = new Map<string, UsageModel>();
    const days = new Map<string, number>();
    const seen = new Set<string>();
    for (const source of batch.sources) {
      const child = source.reference.sessionId !== source.reference.rootSessionId;
      let active = false;
      for (const entry of source.branch) {
        if (entry.type !== 'message' || entry.message.timestamp < (query.from ?? 0) || entry.message.timestamp >= query.to) continue;
        const message = entry.message;
        if (message.role !== 'assistant' && (message.role !== 'user' || message.synthetic)) continue;
        if (query.providerId !== undefined && message.role === 'assistant' && message.provider !== query.providerId) continue;
        if (query.from === undefined) report.range.from = Math.min(report.range.from, message.timestamp);
        active = true;
        const identity = JSON.stringify([batch.families.get(source), entry.id]);
        if (seen.has(identity)) continue;
        seen.add(identity);
        if (message.role === 'user') { if (!child) report.prompts++; continue; }
        if (message.role !== 'assistant') continue;
        if (!child) report.steps++;
        addTokens(report.tokens, message);
        report.cost += message.usage.cost.total;
        const modelKey = JSON.stringify([message.provider, message.model]);
        let model = models.get(modelKey);
        if (!model) {
          const pricing = resolvePricing(message.provider, message.model);
          model = {
            providerId: message.provider, modelId: message.model, variant: null, steps: 0,
            tokens: { input: 0, output: 0, reasoning: null, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0,
            pricing, avgTtft: null, avgTokensPerSecond: null, errorRate: 0,
          };
          models.set(modelKey, model);
        }
        model.steps++;
        addTokens(model.tokens, message);
        model.cost += message.usage.cost.total;
        const date = dateKey(format, message.timestamp);
        days.set(date, (days.get(date) ?? 0) + 1);
      }
      if (active) { if (child) report.subagents++; else report.sessions++; }
    }
    report.models = [...models.values()].sort((a, b) => b.tokens.total - a.tokens.total || a.providerId.localeCompare(b.providerId) || a.modelId.localeCompare(b.modelId));
    report.activity = [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, steps]) => ({ date, steps }));
    report.activeDays = days.size;

    const providersMap = new Map<string, UsageProvider>();
    for (const m of report.models) {
      let p = providersMap.get(m.providerId);
      if (!p) {
        p = {
          providerId: m.providerId, steps: 0, failedRequests: 0, errorRate: 0,
          tokens: { input: 0, output: 0, reasoning: null, cacheRead: 0, cacheWrite: 0, total: 0 }, cost: 0,
          pricing: m.pricing, avgTtft: null, avgTokensPerSecond: null, modelsCount: 0,
        };
        providersMap.set(m.providerId, p);
      }
      p.steps += m.steps;
      p.tokens.input += m.tokens.input;
      p.tokens.output += m.tokens.output;
      p.tokens.cacheRead += m.tokens.cacheRead;
      p.tokens.cacheWrite += m.tokens.cacheWrite;
      p.tokens.total += m.tokens.total;
      if (m.tokens.reasoning !== null) p.tokens.reasoning = (p.tokens.reasoning ?? 0) + m.tokens.reasoning;
      p.cost += m.cost;
      p.modelsCount++;
      if (m.pricing === null) p.pricing = null;
    }
    report.providers = [...providersMap.values()].sort((a, b) => b.tokens.total - a.tokens.total || a.providerId.localeCompare(b.providerId));

    let previous: number | undefined, streak = 0;
    for (const { date } of report.activity) {
      const ordinal = Date.parse(`${date}T00:00:00Z`) / 86_400_000;
      streak = previous !== undefined && ordinal === previous + 1 ? streak + 1 : 1;
      report.streak = Math.max(report.streak, streak);
      previous = ordinal;
    }
    return report;
  }
  // When references is undefined: query stats.db for ALL OMP sessions
  const db = await initDb().catch(() => null);
  interface DbModelRow {
    provider: string; model: string; steps: number; failed: number;
    input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number; total_tokens: number;
    cost_total: number; unpriced: number; avg_duration: number | null; avg_ttft: number | null; avg_tps: number | null;
    min_ts: number | null; max_ts: number | null;
  }
  let dbModelRows: DbModelRow[] = [];
  if (db) {
    try {
      dbModelRows = db.query(`
        SELECT
          provider, model,
          COUNT(*) AS steps,
          SUM(CASE WHEN stop_reason = 'error' OR error_message IS NOT NULL THEN 1 ELSE 0 END) AS failed,
          SUM(input_tokens) AS input_tokens,
          SUM(output_tokens) AS output_tokens,
          SUM(cache_read_tokens) AS cache_read_tokens,
          SUM(cache_write_tokens) AS cache_write_tokens,
          SUM(total_tokens) AS total_tokens,
          TOTAL(cost_total) AS cost_total,
          SUM(CASE WHEN cost_unpriced = 1 OR provider = 'xai-oauth' THEN 1 ELSE 0 END) AS unpriced,
          TOTAL(duration) / NULLIF(COUNT(duration), 0) AS avg_duration,
          TOTAL(ttft) / NULLIF(COUNT(ttft), 0) AS avg_ttft,
          TOTAL(output_tokens * 1000.0) / NULLIF(TOTAL(duration), 0) AS avg_tps,
          MIN(timestamp) AS min_ts,
          MAX(timestamp) AS max_ts
        FROM messages
        WHERE (timestamp >= ?1 OR ?1 IS NULL)
          AND (timestamp < ?2 OR ?2 IS NULL)
          AND (?3 IS NULL OR provider = ?3)
        GROUP BY provider, model
      `).all(query.from ?? null, query.to, query.providerId ?? null) as DbModelRow[];
    } catch {
      // ignore stats db query failure and fall back
    }
  }

  const report: UsageStats = {
    range: { from: query.from ?? query.to - 1, to: query.to },
    sessions: 0, subagents: 0, prompts: 0, steps: 0,
    tokens: { input: 0, output: 0, reasoning: null, cacheRead: 0, cacheWrite: 0, total: 0 },
    cost: 0, tools: { mode: 'none' },
    activeDays: 0, streak: 0, activity: [], providers: [], models: [], partial: false,
  };
  const modelReasoning = new Map<string, number>();
  const hasModelReasoning = new Set<string>();
  const providerReasoning = new Map<string, number>();
  const hasProviderReasoning = new Set<string>();
  let totalReasoning = 0;
  let hasTotalReasoning = false;

  if (db && dbModelRows.length > 0) {
    try {
      const sessionFileRows = db.query(`
        SELECT DISTINCT session_file FROM messages
        WHERE (timestamp >= ?1 OR ?1 IS NULL)
          AND (timestamp < ?2 OR ?2 IS NULL)
          AND (?3 IS NULL OR provider = ?3)
      `).all(query.from ?? null, query.to, query.providerId ?? null) as Array<{ session_file: string }>;
      for (const row of sessionFileRows) {
        const file = resolve(row.session_file);
        try {
          const content = await readFile(file, 'utf8');
          for (const line of content.split('\n')) {
            if (!line.trim()) continue;
            const json = JSON.parse(line);
            if (json.type === 'message' && json.message?.role === 'assistant') {
              const ts = typeof json.message.timestamp === 'number' ? json.message.timestamp : Date.parse(json.timestamp);
              if (Number.isFinite(ts) && (query.from === undefined || ts >= query.from) && ts < query.to) {
                if (query.providerId !== undefined && json.message.provider !== query.providerId) continue;
                const usageObj = json.message.usage;
                if (usageObj && typeof usageObj === 'object' && 'reasoningTokens' in usageObj) {
                  const r = usageObj.reasoningTokens;
                  if (typeof r === 'number' && Number.isFinite(r)) {
                    const key = JSON.stringify([json.message.provider, json.message.model]);
                    modelReasoning.set(key, (modelReasoning.get(key) ?? 0) + r);
                    hasModelReasoning.add(key);
                    providerReasoning.set(json.message.provider, (providerReasoning.get(json.message.provider) ?? 0) + r);
                    hasProviderReasoning.add(json.message.provider);
                    totalReasoning += r;
                    hasTotalReasoning = true;
                  }
                }
              }
            }
          }
        } catch {
          // ignore unreadable session file
        }
      }
    } catch {
      // ignore session listing failure
    }

    const modelsList: UsageModel[] = [];
    const modelsByProvider = new Map<string, UsageModel[]>();
    let minTs: number | null = null;
    for (const row of dbModelRows) {
      const key = JSON.stringify([row.provider, row.model]);
      const r = hasModelReasoning.has(key) ? (modelReasoning.get(key) ?? 0) : null;
      const pricing = resolvePricing(row.provider, row.model, row.unpriced);
      const steps = row.steps ?? 0;
      const failed = row.failed ?? 0;
      const errorRate = steps > 0 ? failed / steps : 0;
      if (row.min_ts !== null) minTs = minTs === null ? row.min_ts : Math.min(minTs, row.min_ts);
      const modelItem: UsageModel = {
        providerId: row.provider,
        modelId: row.model,
        variant: null,
        steps,
        tokens: {
          input: row.input_tokens ?? 0,
          output: row.output_tokens ?? 0,
          reasoning: r,
          cacheRead: row.cache_read_tokens ?? 0,
          cacheWrite: row.cache_write_tokens ?? 0,
          total: row.total_tokens ?? 0,
        },
        cost: row.cost_total ?? 0,
        pricing,
        avgTtft: row.avg_ttft !== null && Number.isFinite(row.avg_ttft) ? row.avg_ttft : null,
        avgTokensPerSecond: row.avg_tps !== null && Number.isFinite(row.avg_tps) ? row.avg_tps : null,
        errorRate,
      };
      modelsList.push(modelItem);
      const existing = modelsByProvider.get(row.provider) ?? [];
      existing.push(modelItem);
      modelsByProvider.set(row.provider, existing);
    }
    report.models = modelsList.sort((a, b) => b.tokens.total - a.tokens.total || a.providerId.localeCompare(b.providerId) || a.modelId.localeCompare(b.modelId));

    const providersList: UsageProvider[] = [];
    for (const [providerId, pModels] of modelsByProvider) {
      const steps = pModels.reduce((sum, m) => sum + m.steps, 0);
      const input = pModels.reduce((sum, m) => sum + m.tokens.input, 0);
      const output = pModels.reduce((sum, m) => sum + m.tokens.output, 0);
      const cacheRead = pModels.reduce((sum, m) => sum + m.tokens.cacheRead, 0);
      const cacheWrite = pModels.reduce((sum, m) => sum + m.tokens.cacheWrite, 0);
      const total = pModels.reduce((sum, m) => sum + m.tokens.total, 0);
      const cost = pModels.reduce((sum, m) => sum + m.cost, 0);
      const r = hasProviderReasoning.has(providerId) ? (providerReasoning.get(providerId) ?? 0) : null;
      const failed = pModels.reduce((sum, m) => sum + Math.round(m.steps * m.errorRate), 0);
      const errorRate = steps > 0 ? failed / steps : 0;
      const allPriced = pModels.length > 0 && pModels.every(m => m.pricing !== null);
      const pricing = allPriced ? pModels[0]!.pricing : null;
      const validTtfts = pModels.filter(m => m.avgTtft !== null).map(m => m.avgTtft!);
      const avgTtft = validTtfts.length > 0 ? validTtfts.reduce((a, b) => a + b, 0) / validTtfts.length : null;
      const validTps = pModels.filter(m => m.avgTokensPerSecond !== null).map(m => m.avgTokensPerSecond!);
      const avgTokensPerSecond = validTps.length > 0 ? validTps.reduce((a, b) => a + b, 0) / validTps.length : null;
      providersList.push({
        providerId,
        steps,
        failedRequests: failed,
        errorRate,
        tokens: { input, output, reasoning: r, cacheRead, cacheWrite, total },
        cost,
        pricing,
        avgTtft,
        avgTokensPerSecond,
        modelsCount: pModels.length,
      });
    }
    report.providers = providersList.sort((a, b) => b.tokens.total - a.tokens.total || a.providerId.localeCompare(b.providerId));

    if (query.from === undefined && minTs !== null) report.range.from = minTs;
    report.steps = report.models.reduce((sum, m) => sum + m.steps, 0);
    report.cost = report.models.reduce((sum, m) => sum + m.cost, 0);
    report.tokens = {
      input: report.models.reduce((sum, m) => sum + m.tokens.input, 0),
      output: report.models.reduce((sum, m) => sum + m.tokens.output, 0),
      reasoning: hasTotalReasoning ? totalReasoning : null,
      cacheRead: report.models.reduce((sum, m) => sum + m.tokens.cacheRead, 0),
      cacheWrite: report.models.reduce((sum, m) => sum + m.tokens.cacheWrite, 0),
      total: report.models.reduce((sum, m) => sum + m.tokens.total, 0),
    };

    try {
      const summaryRow = db!.query(`
        SELECT
          COUNT(DISTINCT session_file) AS total_sessions,
          SUM(CASE WHEN agent_type = 'subagent' THEN 1 ELSE 0 END) AS subagent_count,
          TOTAL(duration) / NULLIF(COUNT(duration), 0) AS avg_duration,
          TOTAL(ttft) / NULLIF(COUNT(ttft), 0) AS avg_ttft,
          TOTAL(output_tokens * 1000.0) / NULLIF(TOTAL(duration), 0) AS avg_tps,
          SUM(CASE WHEN stop_reason = 'error' OR error_message IS NOT NULL THEN 1 ELSE 0 END) AS failed
        FROM messages
        WHERE (timestamp >= ?1 OR ?1 IS NULL)
          AND (timestamp < ?2 OR ?2 IS NULL)
          AND (?3 IS NULL OR provider = ?3)
      `).get(query.from ?? null, query.to, query.providerId ?? null) as {
        total_sessions: number; subagent_count: number; avg_duration: number | null;
        avg_ttft: number | null; avg_tps: number | null; failed: number;
      } | undefined;

      report.sessions = summaryRow?.total_sessions ?? 0;
      report.subagents = summaryRow?.subagent_count ?? 0;
      report.avgTtft = typeof summaryRow?.avg_ttft === 'number' && Number.isFinite(summaryRow.avg_ttft) ? summaryRow.avg_ttft : null;
      report.avgTokensPerSecond = typeof summaryRow?.avg_tps === 'number' && Number.isFinite(summaryRow.avg_tps) ? summaryRow.avg_tps : null;
      const failed = summaryRow?.failed ?? 0;
      report.errorRate = report.steps > 0 ? failed / report.steps : 0;

      const promptRow = db!.query(`
        SELECT COUNT(*) AS c FROM user_messages
        WHERE (timestamp >= ?1 OR ?1 IS NULL) AND (timestamp < ?2 OR ?2 IS NULL)
      `).get(query.from ?? null, query.to) as { c: number } | undefined;
      report.prompts = promptRow?.c ?? 0;

      const activityRows = db!.query(`
        SELECT timestamp FROM messages
        WHERE (timestamp >= ?1 OR ?1 IS NULL)
          AND (timestamp < ?2 OR ?2 IS NULL)
          AND (?3 IS NULL OR provider = ?3)
      `).all(query.from ?? null, query.to, query.providerId ?? null) as Array<{ timestamp: number }>;
      const days = new Map<string, number>();
      for (const row of activityRows) {
        const date = dateKey(format, row.timestamp);
        days.set(date, (days.get(date) ?? 0) + 1);
      }
      report.activity = [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, steps]) => ({ date, steps }));
      report.activeDays = days.size;
    } catch {
      // ignore activity query failure
    }
  }

  let previous: number | undefined, streak = 0;
  for (const { date } of report.activity) {
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
  const usage = new Map<string, UsageToolUsage>();
  const calls = new Map<string, { name: string; outcome: 'succeeded' | 'failed' | 'unfinished' }>();
  for (const source of batch.sources) {
    const pending = new Map<string, string>();
    for (const entry of source.branch) {
      if (entry.type !== 'message') continue;
      const message = entry.message;
      if (message.role === 'assistant') {
        for (const block of message.content) {
          if (block.type !== 'toolCall') continue;
          const identity = JSON.stringify([batch.families.get(source), entry.id, block.id]);
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
