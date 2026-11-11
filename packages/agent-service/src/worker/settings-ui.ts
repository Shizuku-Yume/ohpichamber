import type { OmpSettingId, OmpSettingSurface } from '@openchamber/agent-contract';
import { cfgAdvisorEnabled } from '@oh-my-pi/pi-coding-agent/advisor/settings';
import { cfgComposerPredictions } from '@oh-my-pi/pi-coding-agent/modes/settings';
import { cfgPlanEnabled } from '@oh-my-pi/pi-coding-agent/plan-mode/settings';
import { cfgRetryUsageAwareFallback } from '@oh-my-pi/pi-coding-agent/session/settings';
import type { Settings } from '@oh-my-pi/pi-coding-agent/config/settings';

/**
 * Where one OMP setting belongs on a GUI surface.
 *
 * The OMP settings page once rendered every allowlisted id through one type
 * switch, so a 157-row page mixed observable behaviour, terminal presentation,
 * concepts OpenChamber already owns and internal tuning knobs. The
 * classification is a static per-id table rather than a prefix rule: prefixes
 * (`tui.`, `task.`, `skills.`) each span several surfaces, and a new id has to
 * be placed deliberately instead of inheriting a neighbour's guess.
 */
export type OmpSettingPlacement =
  | { readonly surface: 'gui' }
  | { readonly surface: 'tui-only' }
  | { readonly surface: 'duplicate'; readonly owner: string }
  | { readonly surface: 'advanced' };

/** Terminal presentation, terminal interaction and TUI-only input aids. */
const TUI_ONLY: readonly OmpSettingId[] = [
  'cycleOrder',
  'modelPresets',
  'composer.predictions',
  'composer.predictionAlternatives',
  'display.shellVisualization',
  'update.auto',
  'extensionRenderers.transcriptPresenters',
  'tui.colorfulMarkdown',
  'tui.maxFps',
  'tui.motion',
  'tui.spinnerInterval',
  'tui.renderSvg',
  'tui.autoGraph',
];

/**
 * Settings whose concept an OpenChamber control already owns. The owner is the
 * settings-item id of that control, so the OMP page can point at it instead of
 * offering a second authority for the same value.
 */
const DUPLICATES: readonly (readonly [OmpSettingId, string])[] = [
  ['enabledModels', 'providers.models'],
  ['tui.renderMermaid', 'chat.mermaid-rendering'],
  ['followUpMode', 'chat.follow-up-behavior'],
  ['ask.notify', 'notifications.events'],
  ['recap.enabled', 'chat.session-recap'],
  ['recap.idleSeconds', 'chat.session-recap'],
  ['tools.approvalMode', 'sessions.permission-default'],
];

/**
 * Observable behaviour a GUI user acts on. `defaultThinkingLevel` is here
 * although the Defaults page renders it: the OMP page's registry owns only the
 * rows it draws, and the value belongs to the session-default controls.
 */
const GUI: readonly OmpSettingId[] = [
  'modelRoles',
  'defaultThinkingLevel',
  'retry.enabled',
  'retry.maxRetries',
  'retry.waitForUsageReset',
  'retry.modelFallback',
  'retry.fallbackOn',
  'retry.usageAwareFallback',
  'retry.usageReservePct',
  'retry.usageReservePolicy',
  'retry.fallbackRevertPolicy',
  'compaction.enabled',
  'compaction.thresholdPercent',
  'compaction.thresholdTokens',
  'compaction.autoContinue',
  'compaction.idleEnabled',
  'compaction.idleThresholdTokens',
  'compaction.idleTimeoutSeconds',
  'lsp.enabled',
  'lsp.formatOnWrite',
  'task.isolation.enabled',
  'task.maxConcurrency',
  'task.maxRecursionDepth',
  'plan.enabled',
  'plan.defaultOnStartup',
  'plan.autosave',
  'goal.enabled',
  'skills.enabled',
  'skills.enableSkillCommands',
  'mcp.enableProjectConfig',
];

/**
 * Internal tuning knobs: values that shape how the agent spends tokens or
 * survives failure but that a GUI user does not choose between. Listed
 * explicitly so an id added to the allowlist has to be placed here or in one
 * of the three lists above instead of silently defaulting.
 */
const ADVANCED: readonly OmpSettingId[] = [
  'ask.enabled',
  'ask.timeout',
  'astEdit.enabled',
  'astGrep.enabled',
  'async.enabled',
  'async.widgets',
  'checkpoint.enabled',
  'compaction.asyncEnabled',
  'compaction.dropUseless',
  'compaction.experimentalContextManagement',
  'compaction.handoffSaveToDisk',
  'compaction.keepRecentTokens',
  'compaction.methodOrder',
  'compaction.midTurnEnabled',
  'compaction.modelThresholds',
  'compaction.modelThresholdsEnabled',
  'compaction.remoteStreamingV2Enabled',
  'compaction.reserveTokens',
  'compaction.supersedeReads',
  'compaction.v2RetainedMessageBudget',
  'glob.enabled',
  'goal.continuationModes',
  'grep.enabled',
  'interruptMode',
  'lsp.diagnosticsDeduplicate',
  'lsp.diagnosticsOnEdit',
  'lsp.diagnosticsOnWrite',
  'lsp.lazy',
  'lsp.shared',
  'mcp.notificationDebounceMs',
  'mcp.notifications',
  'mcp.renderMarkdownResults',
  'mcp.startupTimeoutMs',
  'modelRoleStorage',
  'out.enabled',
  'providers.openaiResponsesWebsockets',
  'retry.baseDelayMs',
  'retry.fallbackChains',
  'retry.maxDelayMs',
  'skills.enableAgentsProject',
  'skills.enableAgentsUser',
  'skills.enableClaudeProject',
  'skills.enableClaudeUser',
  'skills.enableCodexUser',
  'skills.enablePiProject',
  'skills.enablePiUser',
  'skills.ignoredSkills',
  'skills.includeSkills',
  'skills.manualSkills',
  'spotlight.experiment.enabled',
  'spotlight.experiment.holdout',
  'spotlight.experiment.scoreFree',
  'spotlight.experiment.tools',
  'spotlight.model',
  'spotlight.thinking',
  'spotlight.timeoutMs',
  'spotlight.url',
  'steeringMode',
  'task.agentAdvisor',
  'task.agentCompactionThresholdOverrides',
  'task.agentIdleTtlMs',
  'task.agentModelOverrides',
  'task.agentPrewalk',
  'task.agentServiceTierOverrides',
  'task.batch',
  'task.completionProbe',
  'task.disabledAgents',
  'task.eager',
  'task.enableEffort',
  'task.enableLsp',
  'task.isolation.apply',
  'task.isolation.commits',
  'task.isolation.merge',
  'task.maxEffort',
  'task.maxRuntimeMs',
  'task.prewalk',
  'task.softRequestBudget',
  'task.softRequestBudgetNotice',
  'task.speculativeLaunch',
  'task.workerThreads',
  'thinkingBudgets.high',
  'thinkingBudgets.low',
  'thinkingBudgets.max',
  'thinkingBudgets.medium',
  'thinkingBudgets.minimal',
  'thinkingBudgets.xhigh',
  'tier.advisor',
  'tier.anthropic',
  'tier.google',
  'tier.openai',
  'tier.subagent',
  'tools.abortOnFabricatedResult',
  'tools.approval',
  'tools.artifactHeadBytes',
  'tools.artifactMaxBytes',
  'tools.artifactSpillThreshold',
  'tools.artifactTailBytes',
  'tools.artifactTailLines',
  'tools.intentTracing',
  'tools.maxTimeout',
  'tools.outputMaxColumns',
  'tools.speculativeExecution.enabled',
  'tools.speculativeExecution.maxInFlight',
  'tools.xdev',
  'tools.xdevDocs',
  'tools.xdevInlineDevices',
  'tools.xdevNotices',
];

function buildTable(): Readonly<Record<OmpSettingId, OmpSettingPlacement>> {
  const table: Record<string, OmpSettingPlacement> = {};
  for (const id of GUI) table[id] = { surface: 'gui' };
  for (const id of TUI_ONLY) table[id] = { surface: 'tui-only' };
  for (const [id, owner] of DUPLICATES) table[id] = { surface: 'duplicate', owner };
  for (const id of ADVANCED) table[id] = { surface: 'advanced' };
  return table as Readonly<Record<OmpSettingId, OmpSettingPlacement>>;
}

/**
 * The one classification table. An id the lists above do not place is a
 * programming error, so `presentOmpSetting` asserts instead of returning
 * `undefined`; the surface-classification test walks every `OMP_SETTING_IDS`
 * entry through this table.
 */
export const OMP_SETTING_PLACEMENTS: Readonly<Record<OmpSettingId, OmpSettingPlacement>> = buildTable();


/** Every owner named by the table, so a test can check they are real controls. */
export const OMP_SETTING_OWNER_IDS: readonly string[] = [...new Set(DUPLICATES.map(([, owner]) => owner))];

/**
 * OMP gates six of its own panel rows on a condition over the live settings.
 * Its `CONDITIONS` map is module-private and reads the process-wide
 * `Settings.instance`, so the same predicates are re-evaluated here against the
 * settings handle this worker owns. The platform- and terminal-derived
 * conditions gate no allowlisted id and are intentionally absent; an unknown
 * name therefore keeps the row rather than hiding a real setting.
 */
const CONDITIONS: Readonly<Record<string, (settings: Settings) => boolean>> = {
  advisorEnabled: (settings) => cfgAdvisorEnabled.get(settings) === true,
  composerPredictionsEnabled: (settings) => cfgComposerPredictions.get(settings) === true,
  usageAwareFallbackEnabled: (settings) => cfgRetryUsageAwareFallback.get(settings) === true,
  planModeEnabled: (settings) => cfgPlanEnabled.get(settings) === true,
};

export interface OmpSettingPresentation {
  readonly surface: OmpSettingSurface;
  readonly owner?: string;
  readonly condition?: string;
  readonly conditionActive?: boolean;
}

/**
 * Placement plus OMP's own condition state for one descriptor. A condition the
 * pinned package named but this module does not know leaves the row visible:
 * hiding a setting is a user-visible loss, while showing one an unnamed
 * condition would keep only costs a row.
 */
export function presentOmpSetting(id: OmpSettingId, condition: string | undefined, settings: Settings): OmpSettingPresentation {
  const placement = OMP_SETTING_PLACEMENTS[id];
  if (placement === undefined) throw new Error(`OMP setting ${id} has no GUI surface classification`);
  const presentation: OmpSettingPresentation = placement.surface === 'duplicate'
    ? { surface: 'duplicate', owner: placement.owner }
    : { surface: placement.surface };
  if (condition === undefined) return presentation;
  const evaluate = Object.hasOwn(CONDITIONS, condition) ? CONDITIONS[condition] : undefined;
  return {
    ...presentation,
    condition,
    conditionActive: evaluate === undefined ? true : evaluate(settings),
  };
}
