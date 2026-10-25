import { z } from 'zod';
import { SessionModeSchema, type SessionMode } from '@openchamber/agent-contract';
import type { AgentSession } from '@oh-my-pi/pi-coding-agent/session/agent-session';
import { isMCPToolName } from '@oh-my-pi/pi-coding-agent/tools/builtin-names';
import type { PlanProposalHandler } from '@oh-my-pi/pi-coding-agent/tools/resolve';
import { parseConfiguredThinkingLevel } from '@oh-my-pi/pi-tui/thinking';
import { ProjectionError } from '../projection/journal.ts';

const ThinkingLevelSchema = z.string().transform((value, context) => {
  const level = parseConfiguredThinkingLevel(value);
  if (level !== undefined) return level;
  context.addIssue({ code: 'custom', message: 'Invalid native thinking level' });
  return z.NEVER;
});
const PlanModeDataSchema = z.object({
  planFilePath: z.string().optional(),
  previousTools: z.array(z.string()).optional(),
  previousMounted: z.array(z.string()).optional(),
  previousModel: z.object({ provider: z.string().min(1), id: z.string().min(1), thinkingLevel: ThinkingLevelSchema.optional() }).optional(),
});
type Previous = {
  tools: string[];
  mounted: string[];
  model?: z.infer<typeof PlanModeDataSchema>['previousModel'];
};
function planReference(value: string | undefined): string {
  const parsed = SessionModeSchema.safeParse({ kind: 'plan', status: 'active', planReference: value });
  return parsed.success && parsed.data.kind === 'plan' ? parsed.data.planReference : 'local://PLAN.md';
}

/** OMP owns durable mode; the worker restores the interactive recipe without its TUI. */
export class WorkerModeController {
  private previous: Previous | undefined;
  private current: SessionMode;

  constructor(private readonly session: AgentSession, private readonly propose: PlanProposalHandler = title => session.preparePlanForReview(title)) {
    const context = session.sessionManager.buildSessionContext();
    const parsed = PlanModeDataSchema.safeParse(context.modeData);
    if (!parsed.success && context.modeData !== undefined && (context.mode === 'plan' || context.mode === 'plan_paused')) {
      throw new ProjectionError(503, 'SESSION_RESTORE_FAILED', 'Stored plan mode is invalid');
    }
    const data = parsed.success ? parsed.data : undefined;
    this.current = context.mode === 'plan' || context.mode === 'plan_paused'
      ? { kind: 'plan', status: context.mode === 'plan' ? 'active' : 'paused', planReference: planReference(data?.planFilePath) }
      : { kind: 'main' };
    if (this.current.kind === 'plan' && data?.previousTools) {
      this.previous = { tools: data.previousTools, mounted: data.previousMounted ?? [], model: data.previousModel };
    }
  }

  mode(): SessionMode { return { ...this.current }; }

  async set(kind: 'main' | 'plan'): Promise<SessionMode> {
    if (this.session.isStreaming) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
    if (kind === 'plan') await this.enterPlan();
    else await this.exitPlan();
    return this.mode();
  }

  private async enterPlan(): Promise<void> {
    if (this.current.kind === 'plan' && this.current.status === 'active') return;
    const reference = this.current.kind === 'plan' ? this.current.planReference : planReference(this.session.getPlanReferencePath());
    const previous: Previous = {
      tools: this.session.getEnabledToolNames().filter(name => !isMCPToolName(name)),
      mounted: this.session.getMountedXdevToolNames().filter(name => !isMCPToolName(name)),
      model: this.session.model ? { provider: this.session.model.provider, id: this.session.model.id, thinkingLevel: this.session.configuredThinkingLevel() } : undefined,
    };
    const planModel = this.session.resolveRoleModelWithThinking('plan');
    if (!planModel.model) throw new ProjectionError(422, 'MODEL_UNAVAILABLE', 'The plan model role is unavailable');
    const originalTools = this.session.getEnabledToolNames();
    const originalState = this.session.getPlanModeState();
    // Native Code Mode partitions tools using plan state, so state must land first.
    this.session.setPlanModeState({ enabled: true, planFilePath: reference, workflow: 'parallel', reentry: this.current.kind === 'plan' });
    try {
      await this.session.setActiveToolsByName([...new Set([...originalTools, ...(this.session.hasBuiltInTool('write') ? ['write'] : [])])]);
      this.session.setPlanProposalHandler(this.propose);
      await this.session.setModelTemporary(planModel.model, planModel.thinkingLevel);
      const modeData: { planFilePath: string; previousTools: string[]; previousMounted: string[]; previousModel?: NonNullable<Previous['model']> } = {
        planFilePath: reference, previousTools: previous.tools, previousMounted: previous.mounted,
      };
      if (previous.model) modeData.previousModel = previous.model;
      this.session.sessionManager.appendModeChange('plan', modeData);
    } catch (error) {
      this.session.setPlanModeState(originalState);
      this.session.setPlanProposalHandler(null);
      await this.session.restoreNonMCPToolPresentation(previous.tools, previous.mounted);
      if (previous.model) {
        const model = this.session.modelRegistry.find(previous.model.provider, previous.model.id);
        if (model) await this.session.setModelTemporary(model, previous.model.thinkingLevel);
      }
      throw error;
    }
    this.previous = previous;
    this.current = { kind: 'plan', status: 'active', planReference: reference };
  }

  private async exitPlan(restoreTools = true): Promise<void> {
    if (this.current.kind === 'main') return;
    const previous = this.previous;
    const restoredModel = previous?.model && this.session.modelRegistry.find(previous.model.provider, previous.model.id);
    if (previous?.model && !restoredModel) throw new ProjectionError(422, 'MODEL_UNAVAILABLE', 'The previous session model is unavailable');
    const planState = this.session.getPlanModeState();
    const planTools = this.session.getEnabledToolNames();
    const planMounted = this.session.getMountedXdevToolNames();
    const planModel = this.session.model;
    const planThinking = this.session.configuredThinkingLevel();
    this.session.setPlanModeState(undefined);
    try {
      if (restoreTools && previous) await this.session.restoreNonMCPToolPresentation(previous.tools, previous.mounted);
      if (restoredModel) await this.session.setModelTemporary(restoredModel, previous?.model?.thinkingLevel);
      this.session.sessionManager.appendModeChange('none');
    } catch (error) {
      this.session.setPlanModeState(planState);
      await this.session.setActiveToolPresentation(planTools, planMounted);
      if (planModel) await this.session.setModelTemporary(planModel, planThinking);
      throw error;
    }
    this.session.setPlanProposalHandler(null);
    this.previous = undefined;
    this.current = { kind: 'main' };
  }

  async approve(compact?: () => Promise<void>): Promise<SessionMode> {
    if (this.session.isStreaming) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
    if (this.current.kind !== 'plan') throw new ProjectionError(409, 'INVALID_REQUEST', 'Plan mode is not active');
    const previous = this.previous ?? {
      tools: this.session.getEnabledToolNames().filter(name => !isMCPToolName(name)),
      mounted: this.session.getMountedXdevToolNames().filter(name => !isMCPToolName(name)),
    };
    await this.exitPlan(false);
    try { await compact?.(); }
    finally {
      const tools = previous.tools.includes('read') ? previous.tools : [...previous.tools, 'read'];
      await this.session.restoreNonMCPToolPresentation(tools, previous.mounted);
    }
    return this.mode();
  }

  async restore(): Promise<void> {
    if (this.current.kind !== 'plan' || this.current.status === 'paused') return;
    const tools = this.session.getEnabledToolNames();
    this.session.setPlanModeState({ enabled: true, planFilePath: this.current.planReference, workflow: 'parallel', reentry: true });
    await this.session.setActiveToolsByName([...new Set([...tools, ...(this.session.hasBuiltInTool('write') ? ['write'] : [])])]);
    this.session.setPlanProposalHandler(this.propose);
    // AgentSession already restored the journal's model, not today's role configuration.
  }
}
