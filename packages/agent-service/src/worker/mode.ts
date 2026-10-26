import { VibeSessionRegistry, type VibeOwnerScope, type VibeParentSession } from '@oh-my-pi/pi-coding-agent/vibe/runtime';
import { cfgGoalContinuationModes } from '@oh-my-pi/pi-coding-agent/goals/settings';
import { goalFromModeData } from '@oh-my-pi/pi-coding-agent/goals/state';
import type { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import { RpcGoalController, type RpcGoalResult, type RpcGoalSession } from '@oh-my-pi/pi-coding-agent/modes/rpc/rpc-goal';
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
type PlanModeData = z.infer<typeof PlanModeDataSchema>;
type VibePrevious = { tools: string[]; ownerScope: VibeOwnerScope };
type Previous = {
  tools: string[];
  mounted: string[];
  model?: PlanModeData['previousModel'];
};
function planReference(value: string | undefined): string {
  const parsed = SessionModeSchema.safeParse({ kind: 'plan', status: 'active', planReference: value });
  return parsed.success && parsed.data.kind === 'plan' ? parsed.data.planReference : 'local://PLAN.md';
}

/** Project durable mode on the selected branch, including the terminal goal record. */
export function readSessionMode(manager: SessionManager): SessionMode {
  const context = manager.buildSessionContext();
  if (context.mode === 'goal' || context.mode === 'goal_paused') {
    const data = goalFromModeData(context.modeData);
    const parsed = SessionModeSchema.safeParse({ kind: 'goal', status: context.mode === 'goal_paused' ? 'paused' : data?.status,
      objective: data?.objective, tokenBudget: data?.tokenBudget ?? null, tokensUsed: data?.tokensUsed });
    if (parsed.success) return parsed.data;
  }
  if (context.mode === 'plan' || context.mode === 'plan_paused') {
    const data = PlanModeDataSchema.safeParse(context.modeData);
    return { kind: 'plan', status: context.mode === 'plan' ? 'active' : 'paused', planReference: planReference(data.success ? data.data.planFilePath : undefined) };
  }
  if (context.mode === 'vibe') return { kind: 'vibe' };
  const branch = manager.getBranch();
  for (let index = branch.length - 1; index >= 0; index--) {
    const entry = branch[index];
    if (entry.type === 'mode_change') break;
    if (entry.type !== 'custom' || entry.customType !== 'goal-completed') continue;
    const data = z.object({ objective: z.string().min(1), tokenBudget: z.number().int().positive().optional(), tokensUsed: z.number().int().nonnegative() }).safeParse(entry.data);
    if (data.success) return { kind: 'goal', status: 'complete', objective: data.data.objective, tokenBudget: data.data.tokenBudget ?? null, tokensUsed: data.data.tokensUsed };
  }
  return { kind: 'main' };
}

/** OMP owns durable mode; the worker restores the interactive recipe without its TUI. */
export class WorkerModeController {
  readonly goal: RpcGoalController;
  private previous: Previous | undefined;
  private vibePrevious: VibePrevious | undefined;
  private current: SessionMode;

  constructor(private readonly session: AgentSession, private readonly propose: PlanProposalHandler = title => session.preparePlanForReview(title), startGoalRun?: (start: () => Promise<boolean>) => Promise<boolean>, onContinuationDropped?: () => void) {
    const continuationModes = cfgGoalContinuationModes.get(session.settings);
    if (!continuationModes.includes('rpc')) cfgGoalContinuationModes.override(session.settings, [...continuationModes, 'rpc']);
    const nativePrompt = session.promptCustomMessage.bind(session);
    const goalSession: RpcGoalSession = {
      settings: session.settings,
      sessionManager: session.sessionManager,
      get goalRuntime() { return session.goalRuntime; },
      getGoalModeState: () => session.getGoalModeState(),
      setGoalModeState: state => session.setGoalModeState(state),
      getPlanModeState: () => session.getPlanModeState(),
      getEnabledToolNames: () => session.getEnabledToolNames(),
      setActiveToolsByName: names => session.setActiveToolsByName(names),
      sendGoalModeContext: options => session.sendGoalModeContext(options),
      getTodoPhases: () => session.getTodoPhases(),
      promptCustomMessage: input => startGoalRun ? startGoalRun(() => nativePrompt(input)) : nativePrompt(input),
      waitForIdle: () => session.waitForIdle(),
      get isStreaming() { return session.isStreaming; },
      get isDisposed() { return session.isDisposed; },
      get isSessionTransitioning() { return session.isSessionTransitioning; },
      get hasAdmittedSubmission() { return session.hasAdmittedSubmission; },
      get queuedMessageCount() { return session.queuedMessageCount; },
    };
    this.goal = new RpcGoalController(goalSession, onContinuationDropped);
    const context = session.sessionManager.buildSessionContext();
    const parsed = PlanModeDataSchema.safeParse(context.modeData);
    if (!parsed.success && context.modeData !== undefined && (context.mode === 'plan' || context.mode === 'plan_paused')) {
      throw new ProjectionError(503, 'SESSION_RESTORE_FAILED', 'Stored plan mode is invalid');
    }
    const data = parsed.success ? parsed.data : undefined;
    this.current = context.mode === 'plan' || context.mode === 'plan_paused'
      ? { kind: 'plan', status: context.mode === 'plan' ? 'active' : 'paused', planReference: planReference(data?.planFilePath) }
      : context.mode === 'vibe' ? { kind: 'vibe' } : { kind: 'main' };
    if (this.current.kind === 'plan' && data?.previousTools) {
      this.previous = { tools: data.previousTools, mounted: data.previousMounted ?? [], model: data.previousModel };
    }
    if (this.current.kind === 'vibe') {
      const previousTools = z.array(z.string()).safeParse(context.modeData?.previousTools);
      if (!previousTools.success) throw new ProjectionError(503, 'SESSION_RESTORE_FAILED', 'Stored vibe mode tools are invalid');
      this.vibePrevious = { tools: previousTools.data, ownerScope: VibeSessionRegistry.global().ownerScope(this.vibeParent()) };
    }
  }

  mode(): SessionMode {
    const goal = this.session.getGoalModeState()?.goal;
    if (goal && goal.status !== 'dropped') return { kind: 'goal', status: goal.status, objective: goal.objective, tokenBudget: goal.tokenBudget ?? null, tokensUsed: goal.tokensUsed };
    return readSessionMode(this.session.sessionManager);
  }

  async goalState(): Promise<RpcGoalResult> { return this.goal.handle({ op: 'get' }); }
  observe(event: Parameters<RpcGoalController['observe']>[0]): void { this.goal.observe(event); }
  stopForHostAbort(): void { this.goal.stopForHostAbort(); }

  async set(kind: 'main' | 'plan' | 'vibe'): Promise<SessionMode> {
    if (this.session.isStreaming) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
    if (this.mode().kind === 'goal') {
      await this.goal.handle({ op: 'drop' });
      this.session.sessionManager.appendModeChange('none');
    }
    if (kind === 'plan') {
      if (this.current.kind === 'vibe') await this.exitVibe();
      await this.enterPlan();
    } else if (kind === 'vibe') {
      if (this.current.kind === 'plan') await this.exitPlan();
      await this.enterVibe();
    } else if (this.current.kind === 'plan') await this.exitPlan();
    else await this.exitVibe();
    return this.mode();
  }

  private vibeParent(): VibeParentSession {
    return {
      getAgentId: () => this.session.getAgentId() ?? this.session.sessionManager.getSessionId() ?? 'native-session',
      getSessionId: () => this.session.sessionManager.getSessionId() ?? this.session.getAgentId(),
      getSessionFile: () => this.session.sessionManager.getSessionFile() ?? null,
      sessionManager: this.session.sessionManager,
      settings: this.session.settings,
      asyncJobManager: this.session.asyncJobManager,
    };
  }

  private async enterVibe(): Promise<void> {
    if (this.current.kind === 'vibe') return;
    const previous = this.session.getEnabledToolNames();
    const registry = VibeSessionRegistry.global();
    const parent = this.vibeParent();
    const ownerScope = registry.ownerScope(parent);
    registry.activateScope(ownerScope);
    const baseTools = ['read', ...(this.session.hasBuiltInTool('todo') ? ['todo'] : [])];
    try {
      await this.session.activateVibeTools(baseTools);
      this.session.setVibeModeState({ enabled: true });
      this.session.sessionManager.appendModeChange('vibe', { previousTools: previous });
    } catch (error) {
      await this.session.deactivateVibeTools(previous);
      this.session.setVibeModeState(undefined);
      throw error;
    }
    this.vibePrevious = { tools: previous, ownerScope };
    this.current = { kind: 'vibe' };
  }

  private async exitVibe(): Promise<void> {
    if (this.current.kind !== 'vibe') return;
    const previous = this.vibePrevious;
    const registry = VibeSessionRegistry.global();
    await this.session.runModeExitTeardown(async () => {
      if (this.session.isStreaming) await this.session.abort();
      await registry.killAll(this.vibeParent(), previous?.ownerScope);
      await this.session.deactivateVibeTools(previous?.tools ?? []);
      this.session.setVibeModeState(undefined);
    });
    this.session.sessionManager.appendModeChange('none');
    this.vibePrevious = undefined;
    this.current = { kind: 'main' };
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
      const modeData: PlanModeData = {
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
    if (this.current.kind === 'vibe') {
      const vibePrevious = this.vibePrevious;
      const tools = vibePrevious?.tools;
      if (!vibePrevious || !tools) throw new ProjectionError(503, 'SESSION_RESTORE_FAILED', 'Stored vibe mode tools are unavailable');
      const parent = this.vibeParent();
      VibeSessionRegistry.global().activateScope(vibePrevious.ownerScope);
      await this.session.activateVibeTools(['read', ...(this.session.hasBuiltInTool('todo') ? ['todo'] : [])]);
      this.session.setVibeModeState({ enabled: true });
      await VibeSessionRegistry.global().rehydrate(parent);
      return;
    }
    if (this.current.kind !== 'plan' || this.current.status === 'paused') return;
    const tools = this.session.getEnabledToolNames();
    this.session.setPlanModeState({ enabled: true, planFilePath: this.current.planReference, workflow: 'parallel', reentry: true });
    await this.session.setActiveToolsByName([...new Set([...tools, ...(this.session.hasBuiltInTool('write') ? ['write'] : [])])]);
    this.session.setPlanProposalHandler(this.propose);
    // AgentSession already restored the journal's model, not today's role configuration.
  }
}
