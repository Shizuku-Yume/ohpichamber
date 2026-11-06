import React from 'react';
import { z } from 'zod';
import { Icon } from '@/components/icon/Icon';
import type { IconName } from '@/components/icon/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import type { I18nKey } from '@/lib/i18n';
import { runtimeFetch } from '@/lib/runtime-fetch';
import { useSubagentsStore } from '@/stores/useSubagentsStore';
import {
 ProblemDetailsSchema,
 SessionControlAckSchema,
 SessionControlRequestSchema,
 SubagentListResponseSchema,
 SubagentTranscriptResponseSchema,
 SubagentTreeCostResponseSchema,
 type Subagent,
 type SubagentTranscriptResponse,
} from '@openchamber/agent-contract';

const EMPTY_SUBAGENTS: Subagent[] = [];
const encode = (value: string): string => encodeURIComponent(value);

const STATUS_KEYS = {
 running: 'miniChat.status.busy',
 idle: 'miniChat.status.idle',
 parked: 'chat.goal.status.paused',
 completed: 'chat.workStatus.subagent.done',
 failed: 'chat.workStatus.subagent.failed',
 cancelled: 'sessions.scheduledTasks.dialog.status.cancelled',
} as const satisfies Record<Subagent['status'], I18nKey>;

const STATUS_ICONS = {
 running: { name: 'loader-4', className: 'size-3.5 animate-spin text-info' },
 idle: { name: 'ai-agent', className: 'size-3.5 text-info' },
 parked: { name: 'archive', className: 'size-3.5 text-muted-foreground' },
 completed: { name: 'checkbox-circle', className: 'size-3.5 text-success' },
 failed: { name: 'close-circle', className: 'size-3.5 text-status-error' },
 cancelled: { name: 'close-circle', className: 'size-3.5 text-muted-foreground' },
} as const satisfies Record<Subagent['status'], { name: IconName; className: string }>;

async function readJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
 const response = await runtimeFetch(path, init);
 const payload: unknown = await response.json().catch(() => null);
 if (!response.ok) {
  const problem = ProblemDetailsSchema.safeParse(payload);
  throw new Error(problem.success ? problem.data.detail : `Agent Hub request failed with ${response.status}`);
 }
 const parsed = schema.safeParse(payload);
 if (!parsed.success) throw new Error('Agent Hub response did not match the canonical contract');
 return parsed.data;
}

const hubPath = (sessionId: string, suffix: string): string =>
 `/api/agent/v1/sessions/${encode(sessionId)}/subagents${suffix}`;

type HubControl = { type: 'subagent.revive'; subagentId: string; message?: string } | { type: 'subagent.cancel'; subagentId: string };

async function sendSubagentControl(sessionId: string, control: HubControl): Promise<void> {
 const ack = await readJson(
  `/api/agent/v1/sessions/${encode(sessionId)}/control`,
  SessionControlAckSchema,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(SessionControlRequestSchema.parse(control)) },
 );
 if (ack.type !== control.type) throw new Error('The control route answered with another operation');
}

interface AgentHubModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 sessionId: string | null;
}

/** Depth-first so a nested subagent reads directly under its parent row. */
function orderRoster(rows: readonly Subagent[]): Subagent[] {
 const byParent = new Map<string, Subagent[]>();
 const roots: Subagent[] = [];
 for (const row of rows) {
  if (row.parentSubagentId && rows.some(candidate => candidate.subagentId === row.parentSubagentId)) {
   byParent.set(row.parentSubagentId, [...(byParent.get(row.parentSubagentId) ?? []), row]);
   continue;
  }
  roots.push(row);
 }
 const ordered: Subagent[] = [];
 const walk = (row: Subagent, depth: number): void => {
  ordered.push({ ...row, depth: Math.min(8, depth) });
  for (const child of byParent.get(row.subagentId) ?? []) walk(child, depth + 1);
 };
 for (const root of roots) walk(root, 0);
 return ordered;
}

/**
 * Agent Hub: the swarm roster for one session, including subagents restored
 * from persisted transcripts (`parked`), direct and tree cost rollups, an
 * embedded transcript viewer, and Revive / Steer / Cancel controls.
 */
export const AgentHubModal: React.FC<AgentHubModalProps> = ({ open, onOpenChange, sessionId }) => {
 const { t } = useI18n();
 const [rows, setRows] = React.useState<Subagent[]>(EMPTY_SUBAGENTS);
 const [treeCost, setTreeCost] = React.useState<number | null>(null);
 const [selectedId, setSelectedId] = React.useState<string | null>(null);
 const [transcript, setTranscript] = React.useState<SubagentTranscriptResponse | null>(null);
 const [transcriptFailed, setTranscriptFailed] = React.useState(false);
 const [prompt, setPrompt] = React.useState('');
 const [busyId, setBusyId] = React.useState<string | null>(null);
 const liveRows = useSubagentsStore(
  React.useCallback((state) => (sessionId && state.byParent[sessionId]) ? state.byParent[sessionId] : EMPTY_SUBAGENTS, [sessionId]),
 );

 const load = React.useCallback(async () => {
  if (!sessionId) return;
  const roster = await readJson(hubPath(sessionId, ''), SubagentListResponseSchema).catch(() => null);
  if (roster) {
   const store = useSubagentsStore.getState();
   for (const subagent of roster.subagents) store.applySubagentUpdate(sessionId, subagent);
   setRows(roster.subagents);
  }
  setTreeCost(await readJson(hubPath(sessionId, '/tree-cost'), SubagentTreeCostResponseSchema)
   .then(cost => cost.treeCost)
   .catch(() => null));
 }, [sessionId]);

 React.useEffect(() => {
  if (!open) return;
  setSelectedId(null);
  setTranscript(null);
  setTranscriptFailed(false);
  setPrompt('');
  void load();
 }, [open, load]);

 const selectRow = React.useCallback(async (subagentId: string) => {
  if (!sessionId) return;
  setSelectedId(subagentId);
  setTranscript(null);
  setTranscriptFailed(false);
  try {
   setTranscript(await readJson(hubPath(sessionId, `/${encode(subagentId)}/transcript`), SubagentTranscriptResponseSchema));
  } catch {
   setTranscriptFailed(true);
  }
 }, [sessionId]);

 const act = React.useCallback(async (subagentId: string, action: () => Promise<unknown>, failureKey: I18nKey) => {
  setBusyId(subagentId);
  try {
   await action();
   await load();
  } catch (error) {
   toast.error(error instanceof Error ? error.message : t(failureKey));
  } finally {
   setBusyId(null);
  }
 }, [load, t]);

 const visible = React.useMemo(() => {
  const merged = new Map(rows.map((row) => [row.subagentId, row]));
  for (const row of liveRows) merged.set(row.subagentId, merged.get(row.subagentId) ?? row);
  return orderRoster([...merged.values()].sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0)));
 }, [rows, liveRows]);

 const selected = visible.find((row) => row.subagentId === selectedId);
 const canPrompt = selected !== undefined && selected.status !== 'running' && selected.status !== 'idle';

 return (
  <Dialog open={open} onOpenChange={onOpenChange}>
   <DialogContent className="max-w-3xl">
    <DialogHeader>
     <DialogTitle>{t('chat.workStatus.section.subagents')}</DialogTitle>
     <DialogDescription>
      {treeCost === null ? t('common.unavailable') : t('contextUsage.tooltip.cost', { cost: `$${treeCost.toFixed(3)}` })}
     </DialogDescription>
    </DialogHeader>

    {visible.length === 0 ? (
     <div className="py-6 text-center typography-meta text-muted-foreground">{t('chat.workStatus.guestView.empty')}</div>
    ) : (
     <div className="max-h-64 overflow-y-auto rounded-lg border border-border/50">
      <table className="w-full text-xs">
       <thead className="bg-muted/40 text-muted-foreground">
        <tr>
         <th className="px-3 py-1.5 text-start font-medium">{t('settings.routing.category.agent')}</th>
         <th className="px-2 py-1.5 text-start font-medium">{t('references.picker.filter.group.status')}</th>
         <th className="px-2 py-1.5 text-start font-medium">{t('usageStats.tools.title')}</th>
         <th className="px-2 py-1.5 text-end font-medium">{t('usageStats.metric.tokens')}</th>
         <th className="px-2 py-1.5 text-end font-medium">{t('usageStats.metric.cost')}</th>
         <th className="px-2 py-1.5 text-end font-medium">{t('chat.todo.total')}</th>
         <th className="px-2 py-1.5 text-end font-medium">{t('chat.timeline.actions.title')}</th>
        </tr>
       </thead>
       <tbody>
        {visible.map((row) => {
         const status = STATUS_ICONS[row.status];
         const isLive = row.status === 'running' || row.status === 'idle';
         return (
          <tr key={row.subagentId} className="border-t border-border/40 hover:bg-muted/30" onClick={() => void selectRow(row.subagentId)}>
           <td className="px-3 py-1.5" style={{ paddingInlineStart: `${12 + (row.depth ?? 0) * 14}px` }}>
            <span className="inline-flex items-center gap-1.5">
             <Icon name={status.name} className={status.className} />
             <span className="truncate font-medium text-foreground">{row.role || row.subagentId}</span>
            </span>
           </td>
           <td className="px-2 py-1.5 text-muted-foreground">{t(STATUS_KEYS[row.status])}</td>
           <td className="px-2 py-1.5 font-mono text-muted-foreground">{row.activeTool ?? ''}</td>
           <td className="px-2 py-1.5 text-end tabular-nums text-muted-foreground">
            {row.tokens === undefined ? '' : t('chat.subagentHud.tokens', { count: row.tokens })}
           </td>
           <td className="px-2 py-1.5 text-end tabular-nums text-muted-foreground">
            {row.directCost === undefined ? '' : `$${row.directCost.toFixed(3)}`}
           </td>
           <td className="px-2 py-1.5 text-end tabular-nums text-muted-foreground">
            {row.treeCost === undefined ? '' : `$${row.treeCost.toFixed(3)}`}
           </td>
           <td className="px-2 py-1.5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-end gap-1">
             {isLive ? (
              <Button
               variant="ghost"
               size="xs"
               disabled={busyId === row.subagentId || !sessionId}
               onClick={() => void act(row.subagentId, () => sendSubagentControl(sessionId ?? '', { type: 'subagent.cancel', subagentId: row.subagentId }), 'chat.toolPart.subagent.stopFailed')}
               title={t('chat.subagentHud.cancel')}
              >
               <Icon name="close" className="size-3" />
              </Button>
             ) : (
              <Button
               variant="ghost"
               size="xs"
               disabled={busyId === row.subagentId || !sessionId}
               onClick={() => void act(row.subagentId, () => sendSubagentControl(sessionId ?? '', { type: 'subagent.revive', subagentId: row.subagentId }), 'chat.questionCard.submitFailed')}
               title={t('chat.goal.action.resume')}
              >
               <Icon name="play" className="size-3" />
              </Button>
             )}
            </div>
           </td>
          </tr>
         );
        })}
       </tbody>
      </table>
     </div>
    )}

    {selectedId && (
     <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
       <span className="typography-ui-label font-medium text-foreground">{t('workflows.panel.view.log')}</span>
       {canPrompt && (
        <form
         className="flex items-center gap-2"
         onSubmit={(event) => {
          event.preventDefault();
          if (!prompt.trim() || !sessionId) return;
          void act(selectedId, async () => {
           await sendSubagentControl(sessionId, { type: 'subagent.revive', subagentId: selectedId, message: prompt.trim() });
           setPrompt('');
          }, 'chat.questionCard.submitFailed');
         }}
        >
         <Input
          inputSize="compact"
          placeholder={t('chat.subagentHud.steerPlaceholder')}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
         />
         <Button type="submit" size="xs" disabled={!prompt.trim() || busyId === selectedId}>
          {t('chat.goal.action.resume')}
         </Button>
        </form>
       )}
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-border/50 p-2 typography-meta">
       {transcriptFailed ? (
        <div className="text-status-error">{t('chat.toolPart.content.loadFailed')}</div>
       ) : transcript === null ? (
        <div className="text-muted-foreground">{t('common.loading')}</div>
       ) : transcript.entries.length === 0 ? (
        <div className="text-muted-foreground">{t('workflows.panel.agent.noAnswer')}</div>
       ) : (
        <div className="flex flex-col gap-2">
         {transcript.entries.map((entry) => (
          <div key={entry.entryId} className="flex flex-col gap-0.5">
           <span className="typography-micro text-muted-foreground">
            {[entry.role, entry.modelId, entry.toolCalls.join(', ')].filter(Boolean).join(' · ')}
           </span>
           {entry.text && <span className="whitespace-pre-wrap text-foreground/90">{entry.text}</span>}
          </div>
         ))}
        </div>
       )}
      </div>
     </div>
    )}

    <div className="flex justify-end gap-2">
     <Button variant="outline" size="sm" onClick={() => void load()}>
      <Icon name="refresh" className="size-3.5" />
      <span className="ms-1">{t('settings.skills.catalog.page.actions.refreshTitle')}</span>
     </Button>
     <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
      {t('dialog.common.actions.close')}
     </Button>
    </div>
   </DialogContent>
  </Dialog>
 );
};

AgentHubModal.displayName = 'AgentHubModal';
