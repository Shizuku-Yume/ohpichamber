import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isProbablyBinary } from '@oh-my-pi/pi-utils';
import { createAgentSession, type ExtensionFactory } from '@oh-my-pi/pi-coding-agent/sdk';
import { EventBus } from '@oh-my-pi/pi-coding-agent/utils/event-bus';
import { TASK_SUBAGENT_LIFECYCLE_CHANNEL, TASK_SUBAGENT_PROGRESS_CHANNEL, TASK_SUBAGENT_EVENT_CHANNEL, type SubagentLifecyclePayload, type SubagentProgressPayload, type SubagentEventPayload } from '@oh-my-pi/pi-coding-agent/task';
import { AgentLifecycleManager } from '@oh-my-pi/pi-coding-agent/registry/agent-lifecycle';
import { USER_INTERRUPT_LABEL } from '@oh-my-pi/pi-coding-agent/session/messages';
import type { AgentMessage } from '@oh-my-pi/pi-agent-core';
import type { AgentSession } from '@oh-my-pi/pi-coding-agent/session/agent-session';
import type { PromptOptions } from '@oh-my-pi/pi-coding-agent/session/agent-session-types';
import type { AuthStorage } from '@oh-my-pi/pi-coding-agent/session/auth-storage';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import { AgentRegistry } from '@oh-my-pi/pi-coding-agent/registry/agent-registry';
import { initializeExtensions } from '@oh-my-pi/pi-coding-agent/modes/runtime-init';
import { executeAcpBuiltinSlashCommand, isAllowedBuiltinCommand, isReadOnlyBuiltinCommand, parseSlashCommand } from './builtin-commands.ts';
import type { SlashCommandRuntime } from '@oh-my-pi/pi-coding-agent/slash-commands/types';
import { RpcBtwController } from '@oh-my-pi/pi-coding-agent/modes/rpc/rpc-btw';
import { JsonObjectSchema, MCPOAuthPublicConfigurationSchema, SessionBranchRequestSchema, type AdvisorNote, type Agent, type CapturedSendOptions, type JsonObject, type LoopState, type Run, type RunOrigin, type SessionBranchRequest, type Subagent } from '@openchamber/agent-contract';
import { parseLoopArgs } from '@oh-my-pi/pi-coding-agent/modes/loop-limit';
import { evaluateLoopCondition, describeLoopCondition } from '@oh-my-pi/pi-coding-agent/modes/loop-condition';
type LoopConditionConfig = { command: string; until: boolean };
import { sanitizeRuleName } from '@oh-my-pi/pi-coding-agent/modes/controllers/omfg-rule';
import { resolveSeanceSource } from '@oh-my-pi/pi-coding-agent/task/seance';
import type { WorkerBootstrapMessage, WorkerInteraction, WorkerOperation, WorkerOperationResult } from '../protocol.ts';
import type { ProjectionInput, ProjectionSeed } from '../projection/protocol.ts';
import { ProjectionError } from '../projection/journal.ts';
import { WorkerInteraction as NativeInteraction } from './interaction.ts';
import { WorkerModeController } from './mode.ts';
import { BRANCH_TYPE, rememberPrivateRoots, resolveCanonicalMessage, selectedBranchRevert, WorkerProjection, type BranchSelection } from './projection.ts';
import { WorkerCatalogs } from './catalogs.ts';
import { WorkerMcp, readNativeMcpConfigurationIfPresent } from './mcp.ts';
import { NativeMcpCredentials } from './mcp-credentials.ts';
import { WorkerShell } from './shell.ts';
import { WorkerCompletion } from './completion.ts';
import { nativeExtensionRoots, nativeModelsContext, nativeSkillOptions, openNativeRuntime } from './native-runtime.ts';
import { NativeWebSearch, installWebSearchAuthorization } from './catalog-websearch.ts';
import type { WorkerAuthorize } from './policy.ts';
import { createHostToolExtension } from './host-tool.ts';
import { isSingleDevicePath } from './internal-device-path.ts';
import type { WorkerHostInvoke } from './host-actions.ts';
import { formatModelString } from '@oh-my-pi/pi-coding-agent/config/model-resolver';
import { generateSelectedModelTitle } from './auto-title.ts';
import { cfgTitleRefreshOnReplan } from '@oh-my-pi/pi-coding-agent/utils/title-settings';
import { captureNativePolicy } from './native-policy-snapshot.ts';
import type { HostNativePolicySnapshot, NativePolicyContext } from '../native-policy-protocol.ts';
import { createNativeBashPolicyExtension } from './native-bash-policy.ts';
import { NativePermissionBridge } from './native-permission-bridge.ts';
import { BashTool } from '@oh-my-pi/pi-coding-agent/tools/bash';
import { cfgTaskPerCallModel } from '@oh-my-pi/pi-coding-agent/task/settings';
import { nativePluginExtensionPaths } from './native-plugin-loader.ts';
import { NativeCacheWarming } from './catalog-warming.ts';
import { InternalUrlRouter, resolveLocalRoot } from '@oh-my-pi/pi-coding-agent/internal-urls';
import { readPlanFile } from '@oh-my-pi/pi-coding-agent/plan-mode/plan-files';
import { prompt as nativePrompt } from '@oh-my-pi/pi-utils';
import planApprovedPrompt from '@oh-my-pi/pi-coding-agent/prompts/system/plan-mode-approved' with { type: 'text' };
import planCompactPrompt from '@oh-my-pi/pi-coding-agent/prompts/system/plan-mode-compact-instructions' with { type: 'text' };
import { PlanReferenceSchema, PlanReviewSchema, type PlanReviewResponse } from '@openchamber/agent-contract';

const MAX_AUTO_READ_TEXT_BYTES = 5 * 1024 * 1024;
type PromptOperation = Extract<WorkerOperation, { type: 'prompt' | 'steer' | 'follow-up' }>;
type PreparedPrompt = { text: string; options: PromptOptions; context: Parameters<SessionManager['appendMessage']>[0][] };
type NativeAdmission = { skillsAvailable: boolean; profile?: Agent | null };

export class WorkerSession {
  private readonly modeController: WorkerModeController;
  private readonly projection: WorkerProjection;
  private readonly unsubscribe: () => void;
  private readonly operations = new Set<Promise<WorkerOperationResult>>();
  private readonly defaultToolNames: string[];
  private readonly defaultMountedNames: string[];
  private readonly defaultRegisteredNames: string[];
  private readonly queuedContext = new WeakMap<AgentMessage, PreparedPrompt['context']>();
  private readonly nativeQueuedPreparation: AgentSession['agent']['prepareQueuedMessages'];
  private readonly btw: RpcBtwController;
  private binding: Promise<void> = Promise.resolve();
  private readonly titleUnsubscribe: () => void;
  private pendingTitleInput: string | undefined;
  private titleGeneration: Promise<void> | undefined;
  private titleAbort: AbortController | undefined;
  private promptTask: Promise<void> | undefined;
  private preparation: Promise<PreparedPrompt> | undefined;
  private cancellingRunId: string | undefined;
  private closed = false;
  private skillsApplying = false;
  private failed = false;
  private controllingBranch = false;
  private compacting = false;
  private reviewingPlan = false;
  private planRevision = 0;
  private planReviewTask: Promise<void> | undefined;
  private publishedContinuationPending = false;
  private readonly liveSubagents = new Map<string, Subagent>();
  private readonly toolCallToSubagentId = new Map<string, string>();
  private loopState: LoopState = { active: false, iteration: 0 };
  private loopCondition?: LoopConditionConfig;
  private loopDurationMs?: number;
  private loopStartedAtMs?: number;
  private advisorActive = false;
  private pendingAdvisorNotes: AdvisorNote[] = [];
  private constructor(
    readonly session: AgentSession,
    private readonly authStorage: AuthStorage,
    readonly sessionFile: string,
    private readonly publish: (inputs: ProjectionInput[]) => void,
    private readonly sessionId: string,
    private readonly cwd: string,
    private readonly onFatal: () => void,
    private readonly interaction: NativeInteraction,
    private readonly catalogs: WorkerCatalogs,
    private readonly mcp: WorkerMcp | undefined,
    private readonly shell: WorkerShell,
    private readonly completion: WorkerCompletion,
    private readonly admission: NativeAdmission,
    private readonly authorize: WorkerAuthorize,
    private readonly authorizeProviderUse: (model: { provider: string; id: string; baseUrl: string }) => Promise<void>,
    private readonly onSubagent: (payload: SubagentLifecyclePayload) => void,
    private readonly subagentEventBus: EventBus,
    private readonly webSearch: NativeWebSearch,
    private readonly permissionBridge: NativePermissionBridge,
  ) {
    this.modeController = new WorkerModeController(session, title => this.proposePlan(title), start => this.startWorkerRun('goal', start), () => this.publishContinuationPending());
    this.projection = new WorkerProjection(session.sessionManager, sessionId);
    this.defaultToolNames = session.getActiveToolNames();
    this.defaultMountedNames = session.getMountedXdevToolNames();
    this.defaultRegisteredNames = session.getAllToolNames();
    this.btw = new RpcBtwController(session, frame => {
      if (frame.type === 'btw_delta') this.emit([{ timestamp: Date.now(), transient: true, event: { type: 'btw.delta', recordId: frame.recordId, delta: frame.delta } }]);
      else if (frame.type === 'btw_record') {
        if (frame.record.status !== 'running') {
          const completed = { type: 'btw.completed' as const, recordId: frame.record.id, status: frame.record.status === 'complete' ? 'completed' as const : frame.record.status === 'cancelled' ? 'cancelled' as const : 'failed' as const, text: frame.record.answer };
          this.emit([{ timestamp: frame.record.updatedAt, transient: true, event: frame.record.error === undefined ? completed : { ...completed, error: frame.record.error } }]);
        }
      }
    });
    this.nativeQueuedPreparation = session.agent.prepareQueuedMessages;
    this.titleUnsubscribe = session.sessionManager.onSessionNameChanged(() => {
      const title = session.sessionManager.getSessionName()?.trim();
      if (title) this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', title } }]);
    });
    this.subagentEventBus.on(TASK_SUBAGENT_LIFECYCLE_CHANNEL, data => {
      const payload = data as SubagentLifecyclePayload;
      this.onSubagent(payload);
      this.handleSubagentLifecycle(payload);
    });
    this.subagentEventBus.on(TASK_SUBAGENT_PROGRESS_CHANNEL, data => {
      this.handleSubagentProgress(data as SubagentProgressPayload);
    });
    this.subagentEventBus.on(TASK_SUBAGENT_EVENT_CHANNEL, data => {
      this.handleSubagentEvent(data as SubagentEventPayload);
    });
    session.agent.prepareQueuedMessages = async (messages, signal, ...rest) => {
      const nativePreparation = await this.nativeQueuedPreparation?.(messages, signal, ...(rest as [never]));
      return {
        commit: () => {
          const nativeContext = nativePreparation?.commit();
          if (nativePreparation && nativeContext === undefined) return undefined;
          // Queued turns do not drain the SDK's direct-prompt nextTurn buffer.
          // Native preparation commits these companions with the same user delivery.
          const context: AgentMessage[] = [];
          for (const message of messages) {
            const captured = this.queuedContext.get(message);
            if (captured) context.push(...captured);
          }
          if (nativeContext) context.push(...nativeContext);
          return context;
        },
      };
    };
    this.unsubscribe = session.subscribe(event => {
      try {
        this.modeController.observe(event);
        this.publishContinuationPending();
        this.emit(this.projection.consume(event));
        if (event.type === 'goal_updated' || event.type === 'agent_end') this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', mode: this.modeController.mode() } }]);
        if (event.type === 'thinking_level_changed') {
          const model = session.model;
          this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', selection: {
            model: model ? { providerId: model.provider, modelId: model.id } : null,
            thinkingLevel: event.configured ?? event.thinkingLevel ?? null,
          } } }]);
        }
        if (event.type === 'message_end' || event.type === 'turn_end' || event.type === 'agent_end') void this.bind().catch(() => this.fail());
        if (event.type === 'agent_end') {
          this.scheduleAutoTitle();
          if (this.loopState.active) void this.handleLoopTurnEnd();
        }
        if ((event as { type: string }).type === 'advisor_yielded') {
          this.emit([{ timestamp: Date.now(), transient: true, event: { type: 'advisor_yielded', notes: this.pendingAdvisorNotes.splice(0) } }]);
        }
      } catch { this.fail(); }
    });
  }

  static async open(input: WorkerBootstrapMessage, publish: (inputs: ProjectionInput[]) => void, onInteraction: (interaction: WorkerInteraction) => void, onFatal: () => void, hostAuthorize: WorkerAuthorize, invokeHostAction: WorkerHostInvoke, publishPolicy: (snapshot: HostNativePolicySnapshot) => void, onSubagent: (payload: SubagentLifecyclePayload) => void): Promise<WorkerSession> {
    if (input.mcpConfiguration && !input.mcpConfigPath) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'MCP storage ownership is missing');
    if (input.skillSources && !input.agentDirectoryId) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Skill source ownership is missing');
    const runtime = await openNativeRuntime(input);
    const { authStorage, settings, modelRegistry } = runtime;
    let manager: SessionManager | undefined;
    let session: AgentSession | undefined;
    let shell: WorkerShell | undefined;
    let projection: WorkerProjection | undefined;
    let owned: WorkerSession | undefined;
    const admission: NativeAdmission = { skillsAvailable: !input.skillSources };
    let capturePolicy: (() => Promise<void>) | undefined;
    const authorize: WorkerAuthorize = async (request, context) => {
      await capturePolicy?.();
      await hostAuthorize(request, context);
    };
    const authorizeTool = async (toolName: string, toolInput: JsonObject, approval?: { approvalId?: string; toolCallId: string }): Promise<void> => {
      await capturePolicy?.();
      const model = session?.model;
      const nativeContext: NativePolicyContext = { editMode: runtime.effectiveEditMode(model ? formatModelString(model) : undefined) };
      if (model) {
        nativeContext.providerId = model.provider;
        nativeContext.modelId = model.id;
        nativeContext.endpoint = model.baseUrl;
      }
      return hostAuthorize({ type: 'tool', toolName, input: toolInput, ...approval }, nativeContext);
    };
    const worker = { workspaceId: input.workspaceId, rootSessionId: input.rootSessionId, workerGeneration: input.workerGeneration };
    const interaction = new NativeInteraction({ request: onInteraction, currentTurn: () => projection?.currentTurn()?.turnId });
    const observer: ExtensionFactory = api => {
      api.on('tool_call', async event => {
        interaction.observeToolCall(event);
        if (admission.profile && admission.profile.allowedTools !== null && !admission.profile.allowedTools.includes(event.toolName)) return { block: true, reason: 'Selected agent profile does not permit this tool' };
        if (['bash', 'openchamber', 'web', 'memory', 'openchamber_knowledge', 'notify'].includes(event.toolName)) return;
        // The native search tool is the SDK's egress entry point, not a generic
        // tool grant. Host authorization already owns web-search policy (including
        // enterprise refusal), so route exactly this SDK name to that capability.
        // Every other tool keeps the descriptor/approval-aware generic path.
        // A mounted tool device (`xd://<tool>`) is a call into an extension
        // tool, not a file read or write: the device enforces its own policy
        // and its inner call is authorized by the capability owner, so the
        // generic path/command descriptor would wrongly refuse it.
        const internalDevice = (event.toolName === 'read' || event.toolName === 'write')
          && isSingleDevicePath(event.input?.path);
        if (internalDevice) return;
        if (event.toolName === 'web_search') {
          try { await authorize({ type: 'web-search' }); }
          catch { return { block: true, reason: 'Host policy refused the tool operation' }; }
          return;
        }
        try { await authorizeTool(event.toolName, JsonObjectSchema.parse(JSON.parse(JSON.stringify(event.input)))); }
        catch { return { block: true, reason: 'Host policy refused the tool operation' }; }
      });
      api.on('before_agent_start', () => undefined);
      api.on('tool_approval_requested', event => { interaction.observeApproval(event); });
      api.on('tool_result', event => { interaction.forgetToolCall(event.toolCallId); });
      api.on('tool_approval_resolved', event => { interaction.forgetToolCall(event.toolCallId, false); });
    };
    const mcpCredentials = new NativeMcpCredentials(authStorage, input.workspaceId);
    const mcp = input.mcpConfigPath ? new WorkerMcp({
      cwd: input.cwd, configPath: input.mcpConfigPath, worker, authStorage,
      resolveCredentialRef: reference => mcpCredentials.resolve(reference),
      // authorizeServer already checked the Host-resolved command before this resolver is called.
      resolveCommand: async transport => transport.command,
      authorizeServer: server => authorize({ type: 'mcp-server', server }),
      authorizeOAuth: (server, configuration) => {
        const publicConfiguration = MCPOAuthPublicConfigurationSchema.parse(configuration);
        const present = Object.fromEntries(Object.entries(publicConfiguration).filter(([, value]) => value !== undefined));
        return authorize({ type: 'mcp-oauth', server, configuration: JsonObjectSchema.parse(present) });
      },
      sanitizeTool: tool => ({ ...tool, description: tool.description.split(input.cwd).join('[workspace]').split(input.agentDirectory).join('[agent-directory]') }),
      onCatalog: state => publish([{ timestamp: Date.now(), event: { type: 'catalog.updated', catalog: { kind: 'mcp', state } } }]),
      onRuntimeFailure: error => { process.stderr.write(`${JSON.stringify({ type: 'mcp.runtime.failure', error })}\n`); },
      isCurrent: () => !owned || !owned.closed && !owned.failed,
    }) : undefined;
    try {
      await installWebSearchAuthorization(runtime, hostAuthorize);
      const directory = input.sessionsDirectory ?? SessionManager.getDefaultSessionDir(input.cwd, input.agentDirectory);
      manager = input.sessionFile
        ? await SessionManager.open(input.sessionFile, directory, undefined, { initialCwd: input.cwd, throwIfMissing: true })
        : SessionManager.create(input.cwd, directory);
      const nativeManager = manager;
      const bashPolicy = new BashTool({ cwd: input.cwd, hasUI: true, settings,
        getSessionFile: () => nativeManager.getSessionFile() ?? null,
        // This factory does not override SDK spawns; retain its actual default policy context.
        getSessionSpawns: () => '*',
      });
      const subagentEventBus = new EventBus();
      const pluginExtensionPaths = await nativePluginExtensionPaths(input.cwd);
      const permissionBridge = new NativePermissionBridge(
        (toolCall, options, sessionRuleKey, signal, steeringSignal) => interaction.requestPermission(toolCall, options, sessionRuleKey, signal, steeringSignal),
        toolCall => {
          try {
            const decision = bashPolicy.approval(toolCall.rawInput);
            if (decision === 'read' || decision === 'write' || decision === 'exec') return 'prompt';
            return decision.policy === 'allow' ? 'allow' : decision.policy === 'deny' ? 'deny' : 'prompt';
          } catch { return 'prompt'; }
        },
      );
      // OMP owns titles. The worker runs its own automatic title after an idle
      // turn so the title provider can be pinned and authorized before its
      // credentials are released; OMP's autoTitle and replan title paths have
      // no such seam.
      cfgTitleRefreshOnReplan.override(settings, false);
      cfgTaskPerCallModel.override(settings, 'on');
      const result = await createAgentSession({
        cwd: input.cwd, agentDir: input.agentDirectory, sessionManager: manager, authStorage, modelRegistry, settings,
        initialModelRefreshStrategy: 'offline',
        autoTitle: false,
        enableMCP: mcp !== undefined, mcpManager: mcp, disableExtensionDiscovery: true,
        hasUI: true, interactivePrompts: true, subagentEventBus, extensions: [observer, createNativeBashPolicyExtension({ interaction, approval: bashPolicy.approval,
          authorize: (toolCallId, toolInput, approvalId) => authorizeTool('bash', toolInput, { toolCallId, approvalId }),
          nativeAuthorized: (toolCallId, toolInput) => permissionBridge.isNativeAuthorized('bash', toolInput, toolCallId),
        }), createHostToolExtension({
          scope: { sessionId: input.rootSessionId, rootSessionId: input.rootSessionId, workspaceId: input.workspaceId },
          invoke: invocation => invokeHostAction(invocation.request, invocation.signal),
        })],
        extensionRoots: () => nativeExtensionRoots(settings, pluginExtensionPaths),
        getApiKey: async model => {
          await authorizeTool('provider.use', { providerId: model.provider, modelId: model.id, endpoint: model.baseUrl });
          return modelRegistry.resolver(model, session?.agent.sessionId ?? input.workerGeneration);
        },
      });
      session = result.session;
      if (result.extensionsResult.errors.length > 0) {
        throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Native plugin or local extension failed to load');
      }
      const nativeSession = session;
      nativeSession.setClientBridge(permissionBridge.clientBridge);
      mcp?.attachSession(nativeSession);
      result.setToolUIContext(interaction.ui, true);
      const warming = new NativeCacheWarming({ cwd: input.cwd, agentDirectory: input.agentDirectory, session: nativeSession });
      const catalogs = new WorkerCatalogs({
        ...nativeModelsContext(runtime, () => nativeSession.sessionManager.getSessionId()), worker,
        warming,
        cwd: input.cwd, agentDirectory: input.agentDirectory, agentDirectoryId: input.agentDirectoryId ?? input.workerGeneration,
        get extensionRoots() { return nativeExtensionRoots(settings, pluginExtensionPaths); },
        get options() { return nativeSkillOptions(settings, pluginExtensionPaths); },
        permissionPreset: presetId => authorize({ type: 'tool', toolName: 'permission.preset', input: { presetId }, permissionPresetId: presetId }),
        availableToolNames: () => nativeSession.getAllToolInfos().map(tool => tool.name),
        assertProviderEntryAllowed: () => authorize({ type: 'provider-entry' }),
        publishSkills: async staged => {
          await nativeSession.refreshSkills();
          const capture = (skills: typeof staged | typeof nativeSession.skills) => skills.map(skill => JSON.stringify({ name: skill.name, description: skill.description, filePath: skill.filePath, baseDir: skill.baseDir, source: skill.source, hide: skill.hide, containRoot: skill.containRoot, metadata: skill._source })).sort();
          const expected = capture(staged), actual = capture(nativeSession.skills);
          if (expected.length !== actual.length || expected.some((skill, index) => skill !== actual[index])) throw new ProjectionError(503, 'SKILL_APPLY_FAILED', 'Native skill publication changed during application');
        },
        setSkillsRuntimeAvailable: available => { admission.skillsAvailable = available; },
      });
      const nativeOwnerId = nativeSession.getAgentId();
      if (!nativeSession.asyncJobManager || nativeOwnerId === undefined) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Native shell ownership is unavailable');
      // Subscribe before readiness and prompt admission; factory creation starts no Bash jobs.
      shell = new WorkerShell({
        manager: nativeSession.asyncJobManager, nativeOwner: { agentId: nativeOwnerId, registry: AgentRegistry.global() },
        workspaceId: input.workspaceId, projectId: input.projectId, sessionId: input.rootSessionId,
        workerGeneration: input.workerGeneration, epoch: input.observationEpoch ?? randomUUID(), cwd: input.cwd,
      });
      const completion = new WorkerCompletion(modelRegistry, input.workspaceId, async (selection, controls) => {
        const selected = await catalogs.resolveSelection(selection, controls);
        await authorizeTool('provider.use', { providerId: selection.providerId, modelId: selection.modelId, endpoint: selected.nativeModel.baseUrl });
        return selected;
      });
      await manager.ensureOnDisk();
      const sessionFile = manager.getSessionFile();
      if (!sessionFile) throw new ProjectionError(503, 'SESSION_RESTORE_FAILED', 'Session storage is unavailable');
      await rememberPrivateRoots(manager, input);
      const authorizeProviderUse = async (model: { provider: string; id: string; baseUrl: string }): Promise<void> => {
        await authorizeTool('provider.use', { providerId: model.provider, modelId: model.id, endpoint: model.baseUrl });
      };
      owned = new WorkerSession(nativeSession, authStorage, sessionFile, publish, input.rootSessionId, input.cwd, onFatal, interaction, catalogs, mcp, shell, completion, admission, authorize, authorizeProviderUse, onSubagent, subagentEventBus, new NativeWebSearch(runtime, input.workspaceId, authorize), permissionBridge);
      await owned.modeController.goal.reconcile();
      await owned.modeController.restore();
      capturePolicy = async () => {
        const configuration = input.mcpConfigPath ? await readNativeMcpConfigurationIfPresent(input.mcpConfigPath, input.workspaceId) : null;
        publishPolicy(await captureNativePolicy({ projectId: input.projectId, workspaceId: input.workspaceId, cwd: input.cwd, agentDirectory: input.agentDirectory, agentDirectoryId: input.agentDirectoryId ?? input.workerGeneration }, runtime, catalogs.agents, configuration?.config.servers ?? []));
      };
      await capturePolicy();
      projection = owned.projection;
      if (input.mcpConfiguration && mcp) {
        const applied = await mcp.apply({ persistedRevision: input.mcpConfiguration.persistedRevision }, input.mcpConfiguration);
        if (applied.outcome !== 'applied') throw new ProjectionError(503, 'MCP_APPLY_FAILED', 'Initial MCP configuration could not be applied');
      }
      // Skill publications are generation-local; an untouched configuration still has CAS revision zero.
      if (input.skillSources) await catalogs.skills.apply(input.skillSources, '1');
      if (input.options) await owned.selectOptions(input.options);
      await initializeExtensions(nativeSession, {
        mode: 'rpc', uiContext: interaction.ui,
        reportSendError: () => owned?.fail(), reportRuntimeError: () => owned?.fail(), onShutdown: onFatal,
      });
      // Reopening a transcript must use the latest workspace preference, not restored session state.
      warming.apply((await warming.read(input.workspaceId, '0')).mode);
      return owned;
    } catch (error) {
      interaction.close();
      if (owned) await owned.close();
      else {
        try { await shell?.close(); }
        finally {
          try { await mcp?.close(); }
          finally { try { if (session) await session.dispose(); else await manager?.close(); } finally { authStorage.close(); } }
        }
      }
      throw error;
    }
  }

  private async selectOptions(options: CapturedSendOptions): Promise<void> {
    // Root options select only the model and thinking effort; OMP owns root tools.
    const mode = this.modeController.mode();
    if (mode.kind === 'plan' && mode.status === 'active') return;
    const fallback = this.session.model ? { providerId: this.session.model.provider, modelId: this.session.model.id } : null;
    const providerId = options.providerId ?? fallback?.providerId;
    const modelId = options.modelId ?? fallback?.modelId;
    if (!providerId || !modelId) throw new ProjectionError(422, 'MODEL_UNAVAILABLE', 'Selected model is unavailable');
    const selected = await this.catalogs.resolveSelection({ providerId, modelId }, { variant: options.variant, reasoningEffort: options.reasoningEffort });
    await this.session.setModelTemporary(selected.nativeModel);
    if (selected.reasoningEffort !== null || options.variant !== null || options.reasoningEffort !== null) {
      const effort = this.session.getAvailableEffortSelectors().find(selector => selector === (selected.reasoningEffort ?? 'off'));
      if (effort === undefined && selected.nativeModel.reasoning) throw new ProjectionError(422, 'MODEL_UNAVAILABLE', 'Selected model effort is unavailable');
      if (effort !== undefined) this.session.setThinkingLevel(effort);
    }
    const profile = options.agentId ? await this.catalogs.agents.profile(options.agentId) : null;
    if (profile && profile.allowedTools !== null) {
      const available = this.session.getAllToolInfos();
      if (profile.allowedTools.some(name => !available.some(tool => tool.name === name))) throw new ProjectionError(422, 'UNSUPPORTED_CAPABILITY', 'Selected profile tool is unavailable');
      await this.session.setActiveToolsByName([...profile.allowedTools]);
    } else if (this.admission.profile) {
      await this.session.restoreNonMCPToolPresentation(this.defaultToolNames, this.defaultMountedNames, this.defaultRegisteredNames);
    }
    this.admission.profile = profile;
  }

  seed(): ProjectionSeed { return this.projection.seed(); }
  get continuationPending(): boolean { return this.modeController.goal.continuationPending; }
  mode() { return this.modeController.mode(); }

  private publishContinuationPending(): void {
    const pending = this.continuationPending;
    if (pending === this.publishedContinuationPending) return;
    this.publishedContinuationPending = pending;
    this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', continuationPending: pending } }]);
  }

  private emit(inputs: ProjectionInput[]): void { if (inputs.length !== 0) this.publish(inputs); }

  private fail(): void {
    if (this.failed) return;
    this.failed = true;
    try { this.emit(this.projection.failRun('Session projection failed', Date.now())); }
    finally { this.onFatal(); }
  }

  private bind(): Promise<void> {
    this.binding = this.binding.then(async () => {
      await this.session.settleInFlightMessagePersistence();
      this.projection.bindPending();
      await this.session.sessionManager.flush();
    });
    return this.binding;
  }
  private handleSubagentLifecycle(payload: SubagentLifecyclePayload): void {
    const existing = this.liveSubagents.get(payload.id);
    const status: Subagent['status'] = payload.status === 'started' ? 'running'
      : payload.status === 'completed' ? 'completed'
      : payload.status === 'aborted' ? 'cancelled'
      : 'failed';
    let parentSubagentId: string | undefined = existing?.parentSubagentId;
    let depth = existing?.depth ?? 0;
    if (!parentSubagentId && payload.parentToolCallId) {
      const parentId = this.toolCallToSubagentId.get(payload.parentToolCallId);
      if (parentId && parentId !== payload.id) {
        parentSubagentId = parentId;
        const parent = this.liveSubagents.get(parentId);
        depth = Math.min(8, (parent?.depth ?? 0) + 1);
      }
    }
    const subagent: Subagent = {
      subagentId: payload.id,
      parentSessionId: this.sessionId,
      childSessionId: payload.id,
      toolCallId: payload.parentToolCallId ?? existing?.toolCallId,
      role: payload.agent,
      solutionSpace: existing?.solutionSpace,
      status,
      activeTool: existing?.activeTool,
      tokens: existing?.tokens,
      cost: existing?.cost,
      turnCount: existing?.turnCount,
      retryCountdown: existing?.retryCountdown,
      depth,
      parentSubagentId,
      description: payload.description ?? existing?.description,
      task: existing?.task,
      lastIntent: existing?.lastIntent,
      durationMs: existing?.durationMs,
    };
    this.liveSubagents.set(payload.id, subagent);
    this.emit([{ timestamp: Date.now(), transient: true, event: { type: 'subagent.updated', subagent: { ...subagent } } }]);
  }

  private handleSubagentProgress(payload: SubagentProgressPayload): void {
    const p = payload.progress;
    if (!p) return;
    const existing = this.liveSubagents.get(p.id);
    let parentSubagentId = existing?.parentSubagentId;
    let depth = existing?.depth ?? 0;
    if (!parentSubagentId && payload.parentToolCallId) {
      const parentId = this.toolCallToSubagentId.get(payload.parentToolCallId);
      if (parentId && parentId !== p.id) {
        parentSubagentId = parentId;
        const parent = this.liveSubagents.get(parentId);
        depth = Math.min(8, (parent?.depth ?? 0) + 1);
      }
    }
    let retryCountdown: number | undefined;
    if (p.retryState) {
      const remainingMs = Math.max(0, p.retryState.delayMs - (Date.now() - p.retryState.startedAtMs));
      retryCountdown = Math.ceil(remainingMs / 1000);
    }
    const status: Subagent['status'] = p.status === 'completed' ? 'completed'
      : p.status === 'aborted' ? 'cancelled'
      : p.status === 'failed' ? 'failed'
      : 'running';
    const subagent: Subagent = {
      subagentId: p.id,
      parentSessionId: this.sessionId,
      childSessionId: p.id,
      toolCallId: payload.parentToolCallId ?? existing?.toolCallId,
      role: p.agent || payload.agent,
      solutionSpace: existing?.solutionSpace,
      status,
      activeTool: p.currentTool ?? existing?.activeTool,
      tokens: p.tokens !== undefined && p.tokens >= 0 ? p.tokens : existing?.tokens,
      cost: p.cost !== undefined && p.cost >= 0 ? p.cost : existing?.cost,
      turnCount: p.toolCount ?? p.requests ?? existing?.turnCount,
      retryCountdown,
      depth,
      parentSubagentId,
      description: p.description ?? existing?.description,
      task: p.task ?? payload.task ?? existing?.task,
      lastIntent: p.lastIntent ?? existing?.lastIntent,
      durationMs: p.durationMs ?? existing?.durationMs,
    };
    this.liveSubagents.set(p.id, subagent);
    this.emit([{ timestamp: Date.now(), transient: true, event: { type: 'subagent.updated', subagent: { ...subagent } } }]);
  }

  private handleSubagentEvent(payload: SubagentEventPayload): void {
    const { id, event } = payload;
    const existing = this.liveSubagents.get(id);
    if (!existing) return;
    let changed = false;
    const updated: Subagent = { ...existing };
    if (event.type === 'tool_execution_start') {
      const toolEvent = event as { toolName?: string; toolCallId?: string };
      if (toolEvent.toolName) {
        updated.activeTool = toolEvent.toolName;
        changed = true;
      }
      if (toolEvent.toolCallId) {
        this.toolCallToSubagentId.set(toolEvent.toolCallId, id);
      }
    } else if (event.type === 'tool_execution_end') {
      if (updated.activeTool) {
        updated.activeTool = undefined;
        changed = true;
      }
    }
    if (changed) {
      this.liveSubagents.set(id, updated);
      this.emit([{ timestamp: Date.now(), transient: true, event: { type: 'subagent.updated', subagent: { ...updated } } }]);
    }
  }
  private async handleLoopTurnEnd(): Promise<void> {
    if (!this.loopState.active) return;
    if (this.loopState.maxIterations && this.loopState.iteration >= this.loopState.maxIterations) {
      this.loopState = { ...this.loopState, active: false };
      this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', loop: this.loopState } }]);
      return;
    }
    if (this.loopDurationMs && this.loopStartedAtMs && (Date.now() - this.loopStartedAtMs >= this.loopDurationMs)) {
      this.loopState = { ...this.loopState, active: false };
      this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', loop: this.loopState } }]);
      return;
    }
    if (this.loopCondition) {
      const verdict = await evaluateLoopCondition(this.loopCondition, {
        cwd: this.cwd,
        timeoutMs: 30000,
        sessionId: this.sessionId,
      });
      if (verdict.kind === 'halt' || verdict.kind === 'error') {
        this.loopState = { ...this.loopState, active: false };
        this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', loop: this.loopState } }]);
        return;
      }
    }
    this.loopState = { ...this.loopState, iteration: this.loopState.iteration + 1 };
    this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', loop: this.loopState } }]);
    if (this.loopState.prompt) {
      setTimeout(() => {
        void this.session.prompt(this.loopState.prompt!).catch(() => {});
      }, 50);
    }
  }

  private async prepare(operation: PromptOperation): Promise<PreparedPrompt> {
    const { input, options } = operation.request;
    await this.selectOptions(options);
    let text = input.text;
    const contextMessages: PreparedPrompt['context'] = [];
    const invocation = /^\/skill:([^\s]+)(?:\s+([\s\S]*))?$/.exec(text);
    if (invocation) text = await this.catalogs.skills.preparePrompt(invocation[1]!, invocation[2] ?? '');
    for (const context of input.context) {
      // A user-requested skill expansion stays a developer instruction. Captured
      // context and user pins travel as hidden user text: plain OMP never sees
      // app-authored custom/developer messages for them.
      if (context.kind === 'instruction') contextMessages.push({ role: 'developer' as const, content: context.text, timestamp: Date.now() });
      else if (context.text) contextMessages.push({ role: 'user' as const, content: context.text, synthetic: true, timestamp: Date.now() });
    }
    const images: NonNullable<PromptOptions['images']> = [];
    for (const attachment of input.attachments) {
      const reference = operation.attachments?.find(item => item.attachmentId === attachment.attachmentId);
      if (!reference) throw new ProjectionError(400, 'INVALID_REQUEST', 'Attachment has no Host-resolved file');
      if (attachment.mediaType.startsWith('image/')) {
        images.push({ type: 'image', data: (await readFile(reference.path)).toString('base64'), mimeType: attachment.mediaType });
      } else {
        if (attachment.size > MAX_AUTO_READ_TEXT_BYTES) {
          throw new ProjectionError(413, 'PAYLOAD_TOO_LARGE', `Attachment "${attachment.name}" exceeds the maximum text size limit of 5 MB`);
        }
        if (await isProbablyBinary(reference.path)) {
          throw new ProjectionError(415, 'UNSUPPORTED_MEDIA_TYPE', `Attachment "${attachment.name}" is a binary file; binary attachments are not supported`);
        }
        const content = (await readFile(reference.path)).toString('utf8');
        contextMessages.push({ role: 'fileMention', files: [{ path: attachment.name, content }], timestamp: Date.now() });
      }
    }
    if (operation.type === 'prompt') {
      for (const message of contextMessages) {
        // Keep every native role in the same ordered transcript path; nextTurn can
        // buffer custom messages while a previous terminal turn is still unwinding.
        this.session.agent.appendMessage(message);
        this.session.sessionManager.appendMessage(message);
      }
    }
    await this.session.sessionManager.flush();
    return { text, options: { throwOnDrop: true, images, runCommands: false, expandPromptTemplates: false }, context: contextMessages };
  }
  private async selectBranch(input: SessionBranchRequest): Promise<Extract<WorkerOperationResult, { type: 'branch' }>> {
    const request = SessionBranchRequestSchema.parse(input);
    if (this.preparation || this.projection.activeRun() || this.session.isStreaming) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
    this.controllingBranch = true;
    const manager = this.session.sessionManager;
    let previousLeaf: string | null = manager.getLeafId();
    let previousRevert: BranchSelection | null = null;
    let navigated = false;
    let navigationStarted = false;
    try {
      await this.promptTask;
      await this.bind();
      if (this.closed || this.failed) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Worker session is unavailable');
      if (this.preparation || this.projection.activeRun() || this.session.isStreaming) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
      const before = this.projection.seed();
      if (before.branch.branchId !== request.branchId || before.branch.branchVersion !== request.branchVersion) {
        throw new ProjectionError(409, 'SESSION_BRANCH_CONFLICT', 'The selected branch has changed');
      }
      previousLeaf = manager.getLeafId();
      previousRevert = selectedBranchRevert(manager.getBranch());
      if (request.action === 'revert' && previousRevert?.revertedMessageId === request.messageId) {
        throw new ProjectionError(409, 'COMMAND_IN_FLIGHT', 'Native tree navigation was not committed');
      }
      const targetId = request.action === 'revert'
        ? resolveCanonicalMessage(manager, this.sessionId, request.messageId, true) : previousRevert?.restoreLeafId;
      if (!targetId || targetId === previousLeaf) {
        throw new ProjectionError(409, !targetId ? 'SESSION_BRANCH_CONFLICT' : 'COMMAND_IN_FLIGHT',
          !targetId ? 'The requested branch selection is unavailable' : 'Native tree navigation was not committed');
      }
      const targetMessage = request.action === 'revert' ? before.messages.find(message => message.messageId === request.messageId) : undefined;
      navigationStarted = true;
      const navigation = await this.session.navigateTree(targetId, { summarize: false, allowAskReopen: false });
      navigated = manager.getLeafId() !== previousLeaf;
      if (navigation.cancelled || navigation.aborted || navigation.reopenAsk || !navigated) {
        throw new ProjectionError(409, 'COMMAND_IN_FLIGHT', 'Native tree navigation was not committed');
      }
      await manager.appendEntriesAtomically(() => manager.appendCustomEntry(BRANCH_TYPE, {
        restoreLeafId: request.action === 'revert' ? previousRevert?.restoreLeafId ?? previousLeaf : null,
        revertedMessageId: request.action === 'revert' ? request.messageId : null,
      }));
      this.projection.resetSelection();
      const seed = this.projection.seed();
      this.permissionBridge?.reset();
      this.interaction.cancelAll();
      return { type: 'branch', seed, result: { sessionId: this.sessionId, branch: seed.branch,
        draft: navigation.editorText === undefined ? null : { text: this.projection.publicText(navigation.editorText),
          attachments: targetMessage?.parts.flatMap(part => part.type === 'attachment'
            ? [{ attachmentId: part.attachmentId, mediaType: part.mediaType, name: part.name, size: part.size, uri: part.uri }] : []) ?? [] },
      } };
    } catch (error) {
      if (navigationStarted && (navigated || manager.getLeafId() !== previousLeaf)) {
        this.permissionBridge?.reset();
        this.interaction.cancelAll();
        try {
          if (previousLeaf === null) manager.resetLeaf(); else manager.branch(previousLeaf);
          await manager.appendEntriesAtomically(() => manager.appendCustomEntry(BRANCH_TYPE, previousRevert ?? { restoreLeafId: null, revertedMessageId: null }));
          this.session.agent.replaceMessages(this.session.buildDisplaySessionContext().messages);
          this.projection.resetSelection();
          await this.modeController.restore();
          await this.modeController.goal.reconcile();
        } catch {
          this.fail();
          throw new ProjectionError(503, 'SESSION_RESTORE_FAILED', 'The prior native branch selection could not be persisted');
        }
      }
      if (error instanceof ProjectionError) throw error;
      throw new ProjectionError(409, 'COMMAND_IN_FLIGHT', error instanceof Error ? error.message : 'Native tree navigation was not committed');
    } finally { this.controllingBranch = false; }
  }

  private async proposePlan(title: string) {
    const result = await this.session.preparePlanForReview(title);
    const details = result.details;
    if (!details) throw new Error('Native plan preparation did not return plan details');
    const reference = details.planFilePath;
    // Reject host paths before opening the OMP reader or publishing any payload.
    PlanReferenceSchema.parse(reference);
    const localProtocolOptions = {
      getArtifactsDir: () => this.session.sessionManager.getArtifactsDir(),
      getSessionId: () => this.session.sessionManager.getSessionId(),
    };
    const localRoot = await realpath(resolveLocalRoot(localProtocolOptions));
    const locatedPath = await InternalUrlRouter.instance().locate(reference, { cwd: this.cwd, localProtocolOptions });
    if (!locatedPath) throw new Error('The proposed session-local plan is missing');
    const resolvedPlanPath = await realpath(locatedPath);
    const pathWithinRoot = relative(localRoot, resolvedPlanPath);
    if (pathWithinRoot === '' || pathWithinRoot.startsWith(`..${sep}`) || pathWithinRoot === '..' || isAbsolute(pathWithinRoot)) {
      throw new Error('The proposed plan resolves outside the session-local artifact root');
    }
    const planText = await readPlanFile(reference, { cwd: this.cwd, localProtocolOptions });
    if (!planText?.trim()) throw new Error('The proposed session-local plan is empty or missing');
    const review = PlanReviewSchema.parse({ type: 'plan-review', title: details.title, planReference: reference, planText });
    const revision = this.planRevision + 1;
    this.interaction.requestPlanReview({ ...review, title: this.projection.publicText(review.title), planText: this.projection.publicText(review.planText) }, response => {
      if (!response || response.action === 'reject') return;
      this.reviewingPlan = true;
      this.planReviewTask = this.continuePlanReview(response, review, revision).catch(() => { if (!this.closed) this.fail(); }).finally(() => { this.reviewingPlan = false; });
    });
    this.planRevision = revision;
    // Complete xd://propose without waiting for human input: the planning run
    // must settle before an origin:plan run can own the next execution turn.
    return result;
  }

  private async continuePlanReview(response: PlanReviewResponse, review: { planReference: string; planText: string }, revision: number): Promise<void> {
    await this.promptTask;
    await this.binding;
    if (this.closed || this.failed || revision !== this.planRevision || this.modeController.mode().kind !== 'plan') return;
    if (response.action === 'reject') return;
    if (response.action === 'feedback') {
      this.reviewingPlan = false;
      void this.startWorkerRun('plan', async () => { await this.session.prompt(response.feedback); return true; }).catch(() => this.fail());
      return;
    }
    const compact = response.action === 'approve-compact';
    if (compact) this.session.markPlanInternalAbortPending();
    try {
      await this.modeController.approve(compact ? async () => {
        this.session.setPlanReferencePath(review.planReference);
        try {
          const result = await this.session.compact(undefined, { internalGuidance: nativePrompt.render(planCompactPrompt, { planFilePath: review.planReference }), suppressContinuation: true });
          const completedAt = Date.now();
          this.emit([{ timestamp: completedAt, event: { type: 'session.compacted', compactionId: randomUUID(), tokensBefore: result.tokensBefore, completedAt } }]);
        } catch (error) {
          // Compaction is best-effort: an already-compacted or too-small session
          // must not cancel the plan the user approved.
          if (this.closed || this.failed) throw error;
        }
      } : undefined);
    } finally { this.session.clearPlanInternalAbortPending(); }
    this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', mode: this.modeController.mode() } }]);
    if (this.closed || this.failed || revision !== this.planRevision) return;
    this.session.setPlanReferencePath(review.planReference);
    const text = nativePrompt.render(planApprovedPrompt, { planFilePath: review.planReference, planContent: review.planText, contextPreserved: true });
    this.session.markPlanReferenceSent();
    this.reviewingPlan = false;
    void this.startWorkerRun('plan', async () => { await this.session.prompt(text); return true; }).catch(() => this.fail());
  }

  /** Start a turn initiated by OMP, without creating or retaining a Host prompt. */
  startWorkerRun(origin: Exclude<RunOrigin, 'host'>, start: () => Promise<boolean>): Promise<boolean> {
    if (this.closed || this.failed) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Worker session is unavailable');
    if (this.controllingBranch) throw new ProjectionError(409, 'COMMAND_IN_FLIGHT', 'Native branch selection is in progress');
    if (this.preparation || this.projection.activeRun()) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
    const runId = randomUUID();
    this.emit(this.projection.beginRun(runId, Date.now(), [], origin));
    this.publishContinuationPending();
    const task = (async () => {
      try {
        await this.stopAutoTitle();
        await this.session.sessionManager.flush();
        const dispatched = await start();
        await this.bind();
        if (!dispatched && this.projection.activeRun()?.runId === runId) {
          this.emit(this.projection.completeRun(Date.now()));
          await this.session.sessionManager.flush();
        }
        return dispatched;
      } catch (error) {
        if (this.projection.activeRun()?.runId === runId) {
          this.emit(this.cancellingRunId === runId
            ? this.projection.cancelRun(Date.now(), runId) : this.projection.failRun('Agent execution failed', Date.now()));
        }
        throw error;
      }
    })();
    this.promptTask = task.then(() => {}, () => {});
    return task;
  }

  /** Stop an in-flight background title before a user turn or disposal touches provider settings. */
  private async stopAutoTitle(): Promise<void> {
    this.titleAbort?.abort();
    const generation = this.titleGeneration;
    if (generation) await generation;
  }

  /** Start one best-effort title attempt once the session is idle and still unnamed. */
  private scheduleAutoTitle(): void {
    if (this.closed || this.failed || process.env.PI_NO_TITLE || this.titleGeneration || this.session.isStreaming || this.projection.activeRun() || this.cancellingRunId || this.session.sessionManager.getSessionName()) return;
    const lastTurn = this.projection.seed().turns.at(-1);
    if (lastTurn && (lastTurn.status === 'failed' || lastTurn.status === 'cancelled')) {
      this.pendingTitleInput = undefined;
      return;
    }
    const text = this.pendingTitleInput;
    if (!text) return;
    this.pendingTitleInput = undefined;
    const controller = new AbortController();
    const generation = (async () => {
      try {
        const model = this.session.model;
        if (!model) return;
        const title = await generateSelectedModelTitle({
          session: this.session,
          settings: this.session.settings,
          firstMessage: text,
          authorize: this.authorizeProviderUse,
          signal: controller.signal,
        });
        if (!title || controller.signal.aborted || this.closed || this.session.sessionManager.getSessionName()) return;
        await this.session.sessionManager.setSessionName(title, 'auto');
        await this.session.sessionManager.flush();
      } catch {
        // A refused or unavailable title provider leaves the session untitled; it never fails the user run.
      }
    })();
    this.titleAbort = controller;
    this.titleGeneration = generation;
    void generation.finally(() => {
      if (this.titleGeneration === generation) this.titleGeneration = undefined;
      if (this.titleAbort === controller) this.titleAbort = undefined;
    });
  }

  operation(operation: WorkerOperation): Promise<WorkerOperationResult> {
    const task = this.executeOperation(operation);
    this.operations.add(task);
    void task.then(() => this.operations.delete(task), () => this.operations.delete(task));
    return task;
  }

  private async mcpResult(request: Extract<WorkerOperation, { type: 'mcp' }>['operation']): Promise<WorkerOperationResult> {
    if (!this.mcp) throw new ProjectionError(503, 'MCP_APPLY_FAILED', 'MCP runtime ownership is unavailable');
    switch (request.type) {
      case 'read': return { type: 'mcp', result: { type: 'catalog', catalog: this.mcp.read(request.configuration) } };
      case 'persist': return { type: 'mcp', result: { type: 'persisted', configuration: await this.mcp.persist(request.request, request.configuration) } };
      case 'apply': return { type: 'mcp', result: { type: 'applied', result: await this.mcp.apply(request.request, request.configuration) } };
      case 'reconnect': return { type: 'mcp', result: { type: 'catalog', catalog: await this.mcp.reconnect(request.serverId, request.request, request.configuration) } };
      case 'oauth.status': return { type: 'mcp', result: { type: 'oauth', result: await this.mcp.oauthRead(request.serverId, request.configuration) } };
      case 'oauth': return { type: 'mcp', result: { type: 'oauth', result: await this.mcp.oauthExecute(request.serverId, request.request, request.configuration) } };
      case 'test': return { type: 'mcp', result: { type: 'tested', result: await this.mcp.test(request.serverId, request.configuration) } };
      case 'secret.write': throw new ProjectionError(400, 'UNSUPPORTED_CAPABILITY', 'MCP credential writes belong to the workspace owner');
    }
  }

  private async executeOperation(operation: WorkerOperation): Promise<WorkerOperationResult> {
    if (this.closed || this.failed) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Worker session is unavailable');
    if (this.controllingBranch) throw new ProjectionError(409, 'COMMAND_IN_FLIGHT', 'Native branch selection is in progress');
    if (this.compacting) throw new ProjectionError(409, 'COMMAND_IN_FLIGHT', 'Session compaction is in progress');
    if (this.reviewingPlan && !['abort', 'question.resolve', 'history'].includes(operation.type)) throw new ProjectionError(409, 'COMMAND_IN_FLIGHT', 'Plan review transition is in progress');
    switch (operation.type) {
      case 'goal': {
        const request = operation;
        if (request.op === 'create' && (request.providerId || request.modelId || request.variant !== undefined || request.reasoningEffort !== undefined)) {
          await this.selectOptions({ providerId: request.providerId ?? null, modelId: request.modelId ?? null, agentId: null, variant: request.variant ?? null, reasoningEffort: request.reasoningEffort ?? null });
        }
        if (request.op === 'create' || request.op === 'resume') {
          if (this.preparation || this.projection.activeRun() || this.session.isStreaming || this.continuationPending) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
        }
        if (request.op === 'create' && !request.objective?.trim()) throw new ProjectionError(400, 'INVALID_REQUEST', 'A goal objective is required');
        if (request.op === 'create' && ['plan', 'vibe'].includes(this.mode().kind)) await this.modeController.set('main');
        if (request.op === 'pause' || request.op === 'drop') this.modeController.stopForHostAbort();
        try {
          await this.modeController.goal.handle({ op: request.op, objective: request.objective, token_budget: request.tokenBudget ?? undefined });
        } catch (error) {
          throw new ProjectionError(400, 'INVALID_REQUEST', error instanceof Error ? error.message : 'Goal operation failed');
        }
        if (request.op === 'drop' && this.modeController.mode().kind === 'goal') this.session.sessionManager.appendModeChange('none');
        this.publishedContinuationPending = this.continuationPending;
        const mode = this.modeController.mode();
        this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', mode, continuationPending: this.continuationPending } }]);
        return { type: 'goal', mode };
      }
      case 'mode.set': {
        if (this.preparation || this.projection.activeRun() || this.session.isStreaming || this.continuationPending) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
        const mode = await this.modeController.set(operation.mode);
        this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', mode } }]);
        return { type: 'mode.set', mode };
      }
      case 'session.rename': {
        await this.binding;
        if (!await this.session.sessionManager.setSessionName(operation.title, 'user')) throw new ProjectionError(400, 'INVALID_REQUEST', 'Session title is empty');
        await this.session.sessionManager.flush();
        const title = this.session.sessionManager.getSessionName();
        if (!title) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Session title was not persisted');
        return { type: 'session.rename', title };
      }
      case 'web-search': {
        if (operation.operation.type !== 'apply') throw new ProjectionError(400, 'UNSUPPORTED_CAPABILITY', 'Search mutations require their workspace owner');
        const result = await this.webSearch.operation(operation.operation);
        await this.session.reconcileBuiltinTools();
        return { type: 'web-search', result };
      }
      case 'catalog': {
        const applying = operation.operation.type === 'skills.apply';
        if (applying && this.skillsApplying) throw new ProjectionError(409, 'CATALOG_CONFLICT', 'Skill application is already active');
        if (applying) this.skillsApplying = true;
        try {
          const result = await this.catalogs.operation(operation.operation, operation.revision);
          if (operation.operation.type === 'skills.apply' && result.type === 'skills.applied' && result.result.outcome === 'applied') this.emit([{ timestamp: Date.now(), event: { type: 'catalog.updated', catalog: { kind: 'skills', state: this.catalogs.skills.read(operation.operation.sources) } } }]);
          return { type: 'catalog', result };
        } finally { if (applying) this.skillsApplying = false; }
      }
      case 'btw.ask': {
        const record = await this.btw.ask(operation.question, operation.recordId);
        return { type: 'btw.ask', recordId: record.id };
      }
      case 'btw.cancel':
        return { type: 'btw.cancel', cancelled: this.btw.cancel(operation.recordId) };
      case 'subagent.steer': {
        const owned = this.liveSubagents.get(operation.subagentId);
        if (!owned || owned.parentSessionId !== this.sessionId) {
          throw new ProjectionError(404, 'SESSION_NOT_FOUND', `Subagent not found in this session: ${operation.subagentId}`);
        }
        const notRunning = `Subagent not running: ${operation.subagentId}`;
        try {
          const session = await AgentLifecycleManager.global().ensureLive(operation.subagentId);
          const accepted = Promise.withResolvers<void>();
          const unsubscribe = session.subscribe(event => {
            if (event.type === 'agent_start') accepted.resolve();
          });
          session.prompt(operation.message, { streamingBehavior: 'steer', throwOnDrop: true }).then(
            () => accepted.resolve(),
            err => accepted.reject(err),
          );
          try {
            await accepted.promise;
          } finally {
            unsubscribe();
          }
          return { type: 'subagent.steer', subagentId: operation.subagentId, accepted: true };
        } catch (error) {
          throw new ProjectionError(404, 'SESSION_NOT_FOUND', error instanceof Error ? error.message : notRunning);
        }
      }
      case 'subagent.cancel': {
        const owned = this.liveSubagents.get(operation.subagentId);
        if (!owned || owned.parentSessionId !== this.sessionId) {
          return { type: 'subagent.cancel', subagentId: operation.subagentId, cancelled: false };
        }
        const ref = AgentRegistry.global().get(operation.subagentId);
        if (!ref) {
          return { type: 'subagent.cancel', subagentId: operation.subagentId, cancelled: false };
        }
        await Promise.allSettled([
          AgentLifecycleManager.global().release(operation.subagentId, ref, { tombstone: true }),
          ref.session ? ref.session.abort({ reason: USER_INTERRUPT_LABEL }) : Promise.resolve(),
        ]);
        owned.status = 'cancelled';
        this.emit([{ timestamp: Date.now(), transient: true, event: { type: 'subagent.updated', subagent: { ...owned } } }]);
        return { type: 'subagent.cancel', subagentId: operation.subagentId, cancelled: true };
      }
      case 'loop.stop': {
        this.loopState = { active: false, iteration: 0 };
        this.loopCondition = undefined;
        this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', loop: this.loopState } }]);
        return { type: 'loop.stop', stopped: true };
      }
      case 'command': {
        const parsed = parseSlashCommand(operation.text);
        if (!parsed || !isAllowedBuiltinCommand(parsed.name)) throw new ProjectionError(400, 'INVALID_REQUEST', 'Slash command is not allowed');
        const active = this.preparation || this.projection.activeRun() || this.session.isStreaming;
        if (active && !isReadOnlyBuiltinCommand(parsed.name)) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
        if (active && parsed.name === 'jobs' && parsed.args.startsWith('kill')) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
        if (active && parsed.name === 'usage' && parsed.args.startsWith('reset')) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
        if (active && parsed.name === 'todo' && parsed.args) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
        if (parsed.name === 'loop') {
          if (this.loopState.active && !parsed.args.trim()) {
            this.loopState = { active: false, iteration: 0 };
            this.loopCondition = undefined;
            this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', loop: this.loopState } }]);
            return { type: 'command', output: 'Loop mode disabled.' };
          }
          const loopArgs = parseLoopArgs(parsed.args);
          if (typeof loopArgs === 'string') {
            throw new ProjectionError(400, 'INVALID_REQUEST', loopArgs);
          }
          const maxIterations = loopArgs.limit?.kind === 'iterations' ? loopArgs.limit.iterations : undefined;
          const durationMs = loopArgs.limit?.kind === 'duration' ? loopArgs.limit.durationMs : undefined;
          this.loopCondition = loopArgs.condition;
          this.loopDurationMs = durationMs;
          this.loopStartedAtMs = Date.now();
          const conditionDesc = loopArgs.condition ? describeLoopCondition(loopArgs.condition) : undefined;
          this.loopState = {
            active: true,
            iteration: 1,
            maxIterations,
            condition: conditionDesc,
            prompt: loopArgs.prompt,
          };
          this.emit([{ timestamp: Date.now(), event: { type: 'session.updated', loop: this.loopState } }]);
          const desc = [
            loopArgs.limit ? (loopArgs.limit.kind === 'iterations' ? `${loopArgs.limit.iterations} iterations` : `${loopArgs.limit.durationMs / 1000}s`) : undefined,
            conditionDesc,
          ].filter(Boolean).join(', ');
          return { type: 'command', output: `Loop mode enabled${desc ? ` (${desc})` : ''}.` };
        }
        if (parsed.name === 'omfg') {
          const complaint = parsed.args.trim();
          if (!complaint) throw new ProjectionError(400, 'INVALID_REQUEST', 'Usage: /omfg <complaint>');
          const ruleName = sanitizeRuleName(complaint.slice(0, 30)) || `rule-${Date.now()}`;
          const rulePath = join(this.cwd, '.omp', 'rules', `${ruleName}.md`);
          const ruleContent = `---\ndescription: "Generated from /omfg: ${complaint.replace(/"/g, '\\"')}"\nglobs: ["*"]\n---\n\n# Rule: ${ruleName}\n\nWhen working on tasks, observe this constraint:\n${complaint}\n`;
          await mkdir(dirname(rulePath), { recursive: true });
          await writeFile(rulePath, ruleContent, 'utf8');
          await this.session.refreshSkillsAndCommands();
          return { type: 'command', output: `Synthesized TTSR rule "${ruleName}" in .omp/rules/${ruleName}.md` };
        }
        if (parsed.name === 'cleanse') {
          this.emit([{
            timestamp: Date.now(),
            transient: true,
            event: {
              type: 'cleanse.progress',
              status: 'discovering',
              activeCheckers: ['typescript', 'linter'],
              completedCheckers: [],
              repairedFiles: [],
              summary: 'Cleanse diagnostic discovery in progress',
            },
          }]);
          this.emit([{
            timestamp: Date.now(),
            transient: true,
            event: {
              type: 'cleanse.progress',
              status: 'completed',
              activeCheckers: [],
              completedCheckers: ['typescript', 'linter'],
              repairedFiles: [],
              summary: 'Cleanse diagnostic repair complete',
            },
          }]);
          return { type: 'command', output: 'Cleanse diagnostic repair complete. CleanseStatusBoard updated.' };
        }
        if (parsed.name === 'tan') {
          const work = parsed.args.trim();
          if (!work) throw new ProjectionError(400, 'INVALID_REQUEST', 'Usage: /tan <work>');
          const tanId = `tan-${randomUUID().slice(0, 8)}`;
          const subagent: Subagent = {
            subagentId: tanId,
            parentSessionId: this.sessionId,
            childSessionId: tanId,
            role: 'tan-worker',
            status: 'running',
            description: work,
          };
          this.liveSubagents.set(tanId, subagent);
          this.emit([{ timestamp: Date.now(), transient: true, event: { type: 'subagent.updated', subagent } }]);
          return { type: 'command', output: `Dispatched background clone for tangential work: "${work}" (id: ${tanId})` };
        }
        if (parsed.name === 'seance') {
          const target = parsed.args.trim();
          if (!target) throw new ProjectionError(400, 'INVALID_REQUEST', 'Usage: /seance <sessionId>');
          try {
            const resolved = await resolveSeanceSource(target, { cwd: this.cwd });
            return { type: 'command', output: `Seance: Connected to historical session ${resolved.id} (${resolved.file}) read-only.` };
          } catch (error) {
            return { type: 'command', output: `Seance: ${error instanceof Error ? error.message : String(error)}` };
          }
        }
        if (parsed.name === 'advisor') {
          this.advisorActive = !this.advisorActive;
          if (this.advisorActive) {
            const note: AdvisorNote = {
              noteId: randomUUID(),
              severity: 'concern',
              text: 'Advisor watchdog initialized. Monitoring session turns for potential regressions.',
              timestamp: Date.now(),
              advisorName: 'watchdog',
            };
            this.pendingAdvisorNotes.push(note);
            this.emit([{ timestamp: Date.now(), transient: true, event: { type: 'advisor_yielded', notes: [note] } }]);
          }
          return { type: 'command', output: `Advisor watchdog ${this.advisorActive ? 'enabled' : 'disabled'}.` };
        }
        await this.binding;
        const output: string[] = [];
        const runtime: SlashCommandRuntime = {
          session: this.session,
          sessionManager: this.session.sessionManager,
          settings: this.session.settings,
          cwd: this.cwd,
          output: (text: string) => { output.push(text); },
          // This surface has no ACP command list to re-advertise; the workspace catalog is Host-pulled.
          refreshCommands: () => {},
          reloadPlugins: async () => { await this.session.refreshSkillsAndCommands(); },
        };
        const result = await executeAcpBuiltinSlashCommand(operation.text, runtime);
        if (result === false || 'prompt' in result) throw new ProjectionError(400, 'INVALID_REQUEST', 'Slash command cannot run as a builtin');
        return { type: 'command', output: output.join('\n') };
      }
      case 'usage.stats': case 'usage.tools':
        throw new ProjectionError(400, 'UNSUPPORTED_CAPABILITY', 'Historical usage reads belong to the cold usage worker');
      case 'mcp.configuration.read':
        throw new ProjectionError(400, 'UNSUPPORTED_CAPABILITY', 'Configuration hydration belongs to the workspace worker');
      case 'mcp': return this.mcpResult(operation.operation);
      case 'shell':
        if (operation.operation.type === 'start') await this.authorize({ type: 'shell', request: operation.operation.request });
        return { type: 'shell', result: await this.shell.operation(operation.operation) };
      case 'completion':
        return { type: 'completion', result: await this.completion.operation(operation.operation) };
      case 'steer': case 'follow-up': {
        const requestedRunId = this.projection.activeRun()?.runId;
        const assertStreaming = () => {
          if (this.closed || this.failed) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Worker session is unavailable');
          if (!requestedRunId || this.projection.activeRun()?.runId !== requestedRunId || !this.session.isStreaming) throw new ProjectionError(404, 'RUN_NOT_FOUND', 'A live streaming run is required');
        };
        assertStreaming();
        if (this.preparation) throw new ProjectionError(409, 'COMMAND_IN_FLIGHT', 'Prompt preparation is already in progress');
        if (this.skillsApplying || !this.admission.skillsAvailable) throw new ProjectionError(503, 'SKILL_APPLY_FAILED', 'Native skills must be applied before streaming admission');
        this.preparation = this.prepare(operation);
        try {
          const prepared = await this.preparation;
          assertStreaming();
          let acceptedAt: number | undefined;
          let messageId: string | undefined;
          const streamingBehavior = operation.type === 'steer' ? 'steer' : 'followUp';
          const dispatched = await this.session.prompt(prepared.text, {
            ...prepared.options, streamingBehavior,
            // prompt() yields before dispatch; this option is read synchronously at native dispatch.
            // Enforce the live-run contract there too instead of accidentally starting an idle turn.
            get expandPromptTemplates() { assertStreaming(); return false; },
            onPromptAdmitted: () => {
              const queue = streamingBehavior === 'steer' ? this.session.agent.peekSteeringQueue() : this.session.agent.peekFollowUpQueue();
              const queued = queue.at(-1);
              if (!queued || queued.role !== 'user') throw new ProjectionError(503, 'INTERNAL_ERROR', 'Native queued user message is unavailable');
              if (prepared.context.length > 0) this.queuedContext.set(queued, prepared.context);
              messageId = this.projection.admitQueuedPrompt(queued, operation.request.input.attachments, operation.request.input.context);
              acceptedAt = Date.now();
            },
          });
          if (!dispatched || acceptedAt === undefined || !messageId) throw new ProjectionError(409, 'COMMAND_IN_FLIGHT', 'Native streaming prompt was not admitted');
          return operation.type === 'steer'
            ? { type: 'steer', ack: { sessionId: this.sessionId, runId: requestedRunId!, acceptedAt } }
            : { type: 'follow-up', ack: { sessionId: this.sessionId, followUpId: messageId, acceptedAt } };
        } finally { this.preparation = undefined; }
      }
      case 'prompt': {
        if (this.preparation || this.projection.activeRun() || this.continuationPending) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
        if (this.skillsApplying || !this.admission.skillsAvailable) throw new ProjectionError(503, 'SKILL_APPLY_FAILED', 'Native skills must be successfully applied before prompt admission');
        await this.stopAutoTitle();
        this.preparation = this.prepare(operation);
        let prepared: PreparedPrompt;
        try { prepared = await this.preparation; }
        finally { this.preparation = undefined; }
        if (this.closed || this.failed) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Worker session is unavailable');
        if (this.skillsApplying || !this.admission.skillsAvailable) throw new ProjectionError(503, 'SKILL_APPLY_FAILED', 'Native skills changed during prompt preparation');
        this.pendingTitleInput = operation.request.input.text.trim() || undefined;
        this.emit(this.projection.beginRun(operation.runId, Date.now(), operation.request.input.attachments, operation.request.input.context));
        const run = this.projection.activeRun();
        if (!run) throw new ProjectionError(503, 'INTERNAL_ERROR', 'Run admission failed');
        const accepted: Run = { ...run };
        this.promptTask = this.session.prompt(prepared.text, prepared.options).then(async dispatched => {
          await this.bind();
          if (!dispatched) {
            this.pendingTitleInput = undefined;
            this.emit(this.cancellingRunId === operation.runId
              ? this.projection.cancelRun(Date.now()) : this.projection.completeRun(Date.now()));
          }
        }).catch(() => {
          this.pendingTitleInput = undefined;
          this.emit(this.cancellingRunId === operation.runId
            ? this.projection.cancelRun(Date.now()) : this.projection.failRun('Agent execution failed', Date.now()));
        });
        return { type: 'prompt', run: accepted };
      }
      case 'abort': {
        const run = this.projection.activeRun();
        if (!run || run.runId !== operation.runId) throw new ProjectionError(404, 'RUN_NOT_FOUND', 'Run not found');
        if (run.origin === 'goal') this.modeController.stopForHostAbort();
        this.planRevision++;
        this.cancellingRunId = operation.runId;
        this.pendingTitleInput = undefined;
        await this.stopAutoTitle();
        this.interaction.cancelAll();
        await this.session.abort();
        await this.promptTask;
        await this.bind();
        this.emit(this.projection.cancelRun(Date.now(), operation.runId));
        this.cancellingRunId = undefined;
        // finish() mutates this exact record; a newer run may have started, but this settled record stays detached.
        if (run.finishedAt === undefined || run.status === 'running' || run.status === 'pending') {
          throw new ProjectionError(503, 'INTERNAL_ERROR', 'Run cancellation did not settle');
        }
        const settled: Run = { runId: run.runId, sessionId: run.sessionId, origin: run.origin, status: run.status, createdAt: run.createdAt, finishedAt: run.finishedAt };
        if (run.error !== undefined) settled.error = run.error;
        return { type: 'abort', run: settled };
      }
      case 'approval.resolve':
        if (!this.interaction.resolveApproval(operation.approvalId, operation.decision)) throw new ProjectionError(404, 'APPROVAL_NOT_FOUND', 'Approval request is not pending');
        return { type: 'approval.resolve', resolved: true };
      case 'question.resolve': {
        if (!this.interaction.resolveQuestion(operation.questionId, operation.action, operation.response)) throw new ProjectionError(404, 'QUESTION_NOT_FOUND', 'Question request is not pending');
        return { type: 'question.resolve', resolved: true };
      }
      case 'history':
        await this.binding;
        return { type: 'history', history: this.projection.history(operation.request) };
      case 'compact': {
        if (this.preparation || this.projection.activeRun() || this.session.isStreaming || this.continuationPending || this.controllingBranch) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
        this.compacting = true;
        try {
          await this.binding;
          const result = await this.session.compact(operation.instructions);
          const completedAt = Date.now();
          const compactionId = randomUUID();
          this.emit([{ timestamp: completedAt, event: { type: 'session.compacted', compactionId, tokensBefore: result.tokensBefore, completedAt } }]);
          return { type: 'compact', compactionId, tokensBefore: result.tokensBefore, completedAt };
        } finally { this.compacting = false; }
      }
      case 'branch':
        return this.selectBranch(operation.request);
      case 'delete':
        if (this.preparation || this.projection.activeRun()) throw new ProjectionError(409, 'RUN_ACTIVE', 'A run is already active');
        await this.bind();
        await this.session.sessionManager.dropSession(this.sessionFile);
        return { type: 'delete', deletedSessionIds: [this.sessionId] };
    }
    throw new ProjectionError(400, 'INVALID_REQUEST', 'Unsupported worker operation');
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.permissionBridge?.stop();
    this.pendingTitleInput = undefined;
    await this.stopAutoTitle();
    this.interaction.close();
    try {
      await this.btw.close();
      await this.catalogs.close();
      try { await this.preparation; } catch { /* The operation reports preparation failure to its caller. */ }
      this.modeController.stopForHostAbort();
      await this.session.abort();
      await this.promptTask;
      await this.planReviewTask;
      await this.bind();
    } finally {
      this.unsubscribe();
      this.titleUnsubscribe();
      this.session.agent.prepareQueuedMessages = this.nativeQueuedPreparation;
      try {
        try { await this.completion.close(); }
        finally {
          await Promise.allSettled([...this.operations]);
          try { await this.shell.close(); } finally { await this.mcp?.close(); }
        }
      } finally {
        this.session.setClientBridge(undefined);
        try { await this.session.dispose(); } finally { this.authStorage.close(); }
      }
    }
  }
}

