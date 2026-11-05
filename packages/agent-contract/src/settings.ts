import { z } from 'zod';
import { CounterSchema, EntityIdSchema, JsonValueSchema } from './primitives.ts';

/**
 * OMP behaviour settings exposed through the app. Appearance, path, command,
 * credential and remote-endpoint settings are deliberately absent: the route
 * writes OMP's global config, so it must not become a second provider/MCP entry
 * or an egress/path escape hatch. See `.workflow/specs/omp-native-parity.md`.
 */
export const OMP_SETTING_IDS = [
  'enabledModels',
  'modelRoles',
  'defaultThinkingLevel',
  'retry.enabled',
  'retry.maxRetries',
  'retry.baseDelayMs',
  'retry.maxDelayMs',
  'retry.waitForUsageReset',
  'retry.modelFallback',
  'retry.fallbackOn',
  'retry.usageAwareFallback',
  'retry.usageReservePct',
  'retry.usageReservePolicy',
  'retry.fallbackChains',
  'retry.fallbackRevertPolicy',
  'thinkingBudgets.minimal',
  'thinkingBudgets.low',
  'thinkingBudgets.medium',
  'thinkingBudgets.high',
  'thinkingBudgets.xhigh',
  'thinkingBudgets.max',
  'compaction.enabled',
  'compaction.experimentalContextManagement',
  'compaction.midTurnEnabled',
  'compaction.methodOrder',
  'compaction.thresholdPercent',
  'compaction.thresholdTokens',
  'compaction.modelThresholds',
  'compaction.modelThresholdsEnabled',
  'compaction.handoffSaveToDisk',
  'compaction.remoteStreamingV2Enabled',
  'compaction.asyncEnabled',
  'compaction.reserveTokens',
  'compaction.keepRecentTokens',
  'compaction.autoContinue',
  'compaction.v2RetainedMessageBudget',
  'compaction.idleEnabled',
  'compaction.idleThresholdTokens',
  'compaction.idleTimeoutSeconds',
  'compaction.supersedeReads',
  'compaction.dropUseless',
  'tools.approval',
  'tools.approvalMode',
  'ask.enabled',
  'ask.timeout',
  'ask.notify',
  'lsp.enabled',
  'lsp.lazy',
  'lsp.shared',
  'lsp.formatOnWrite',
  'lsp.diagnosticsOnWrite',
  'lsp.diagnosticsOnEdit',
  'lsp.diagnosticsDeduplicate',
  'task.isolation.enabled',
  'task.isolation.apply',
  'task.isolation.merge',
  'task.isolation.commits',
  'task.eager',
  'task.batch',
  'task.speculativeLaunch',
  'task.enableEffort',
  'task.maxConcurrency',
  'task.enableLsp',
  'task.maxRecursionDepth',
  'task.maxRuntimeMs',
  'task.completionProbe',
  'task.agentIdleTtlMs',
  'task.softRequestBudget',
  'task.softRequestBudgetNotice',
  'task.maxEffort',
  'task.disabledAgents',
  'task.agentModelOverrides',
  'task.agentServiceTierOverrides',
  'task.agentCompactionThresholdOverrides',
  'task.agentPrewalk',
  'task.agentAdvisor',
  'task.prewalk',
  'plan.enabled',
  'plan.defaultOnStartup',
  'plan.autosave',
  'goal.enabled',
  'goal.continuationModes',
  'skills.enabled',
  'skills.enableSkillCommands',
  'skills.enableCodexUser',
  'skills.enableClaudeUser',
  'skills.enableClaudeProject',
  'skills.enablePiUser',
  'skills.enablePiProject',
  'skills.enableAgentsUser',
  'skills.enableAgentsProject',
  'skills.ignoredSkills',
  'skills.includeSkills',
  'mcp.enableProjectConfig',
  'mcp.startupTimeoutMs',
  'mcp.renderMarkdownResults',
  'mcp.notifications',
  'mcp.notificationDebounceMs',
  'tui.autoGraph',
] as const;
export const OmpSettingIdSchema = z.enum(OMP_SETTING_IDS);
export type OmpSettingId = z.infer<typeof OmpSettingIdSchema>;

export const OmpSettingTypeSchema = z.enum(['boolean', 'number', 'string', 'enum', 'array', 'record']);
export type OmpSettingType = z.infer<typeof OmpSettingTypeSchema>;

export const OmpSettingOptionSchema = z.strictObject({
  value: z.string(),
  label: z.string().min(1),
  description: z.string().optional(),
});
export type OmpSettingOption = z.infer<typeof OmpSettingOptionSchema>;

/** A setting value from OMP; `null` means the global config does not set it. */
export const OmpSettingValueSchema = JsonValueSchema.nullable();
export type OmpSettingValue = z.infer<typeof OmpSettingValueSchema>;

export const OmpSettingSchema = z.strictObject({
  id: OmpSettingIdSchema,
  type: OmpSettingTypeSchema,
  /** Effective layered value. `null` when the setting has no value at any layer. */
  value: OmpSettingValueSchema,
  /** OMP's declared default, when the pinned package exports one. */
  default: OmpSettingValueSchema,
  /** Whether a config layer or environment variable supplies a value. */
  configured: z.boolean(),
  enumValues: z.array(z.string().min(1)).optional(),
  options: z.array(OmpSettingOptionSchema).optional(),
  label: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  group: z.string().min(1).optional(),
  tab: z.string().min(1).optional(),
});
export type OmpSetting = z.infer<typeof OmpSettingSchema>;

export const OmpSettingsStateSchema = z.strictObject({
  workspaceId: EntityIdSchema,
  revision: CounterSchema,
  settings: z.array(OmpSettingSchema),
}).refine((state) => new Set(state.settings.map((setting) => setting.id)).size === state.settings.length,
  'OMP setting ids are unique');
export type OmpSettingsState = z.infer<typeof OmpSettingsStateSchema>;

export const OmpSettingsChangeSchema = z.strictObject({
  id: OmpSettingIdSchema,
  value: OmpSettingValueSchema,
});
export type OmpSettingsChange = z.infer<typeof OmpSettingsChangeSchema>;

export const OmpSettingsUpdateRequestSchema = z.strictObject({
  expectedRevision: CounterSchema,
  changes: z.array(OmpSettingsChangeSchema).min(1).max(OMP_SETTING_IDS.length),
}).refine((request) => new Set(request.changes.map((change) => change.id)).size === request.changes.length,
  'OMP setting changes name each setting once');
export type OmpSettingsUpdateRequest = z.infer<typeof OmpSettingsUpdateRequestSchema>;
