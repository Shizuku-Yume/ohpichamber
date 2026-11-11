import { expect, test } from 'bun:test';
import {
  OMP_SETTING_IDS, OmpSettingIdSchema, OmpSettingsStateSchema, OmpSettingsUpdateRequestSchema,
} from './settings.ts';

const descriptor = {
  id: 'compaction.thresholdPercent' as const,
  type: 'number' as const,
  value: 50,
  default: -1,
  configured: true,
  label: 'Compaction Threshold',
  group: 'Compaction',
  tab: 'context',
  surface: 'gui' as const,
};
const state = { workspaceId: 'workspace_1', revision: '2', settings: [descriptor] };

test('OMP settings state carries allowlisted descriptors and revisions', () => {
  expect(OmpSettingsStateSchema.parse(state)).toEqual(state);
  expect(OmpSettingsStateSchema.safeParse({ ...state, settings: [descriptor, descriptor] }).success).toBe(false);
  expect(OmpSettingsStateSchema.safeParse({ ...state, settings: [{ ...descriptor, id: 'appearance.theme' }] }).success).toBe(false);
  expect(OmpSettingsStateSchema.safeParse({ ...state, settings: [{ ...descriptor, value: undefined }] }).success).toBe(false);
  expect(OmpSettingsStateSchema.safeParse({ ...state, settings: [{ ...descriptor, surface: 'off' }] }).success).toBe(false);
});

test('a duplicate names its owner, and a conditional setting reports its condition state', () => {
  const duplicate = { ...descriptor, surface: 'duplicate' as const, owner: 'providers.models' };
  expect(OmpSettingsStateSchema.parse({ ...state, settings: [duplicate] })).toEqual({ ...state, settings: [duplicate] });
  expect(OmpSettingsStateSchema.safeParse({ ...state, settings: [{ ...descriptor, surface: 'duplicate' }] }).success).toBe(false);
  expect(OmpSettingsStateSchema.safeParse({ ...state, settings: [{ ...duplicate, surface: 'gui' }] }).success).toBe(false);

  const conditional = { ...descriptor, condition: 'usageAwareFallbackEnabled', conditionActive: false };
  expect(OmpSettingsStateSchema.parse({ ...state, settings: [conditional] })).toEqual({ ...state, settings: [conditional] });
  expect(OmpSettingsStateSchema.safeParse({ ...state, settings: [{ ...descriptor, condition: 'usageAwareFallbackEnabled' }] }).success).toBe(false);
});

test('OMP settings changes require unique allowlisted ids and a next revision request', () => {
  const request = { expectedRevision: '2', changes: [{ id: 'compaction.thresholdPercent' as const, value: 60 }] };
  expect(OmpSettingsUpdateRequestSchema.parse(request)).toEqual(request);
  expect(OmpSettingsUpdateRequestSchema.safeParse({ ...request, changes: [] }).success).toBe(false);
  expect(OmpSettingsUpdateRequestSchema.safeParse({ ...request, changes: [request.changes[0], request.changes[0]] }).success).toBe(false);
  expect(OmpSettingsUpdateRequestSchema.safeParse({ ...request, changes: [{ id: 'compaction.remoteEndpoint', value: 'https://example.test' }] }).success).toBe(false);
  expect(OmpSettingsUpdateRequestSchema.safeParse({ ...request, changes: [{ id: 'compaction.thresholdPercent', value: undefined }] }).success).toBe(false);
});

test('the allowlist is unique and excludes credential, path, command and egress settings', () => {
  expect(new Set(OMP_SETTING_IDS).size).toBe(OMP_SETTING_IDS.length);
  for (const excluded of [
    'compaction.remoteEndpoint', 'skills.registryUrl', 'skills.customDirectories', 'plan.autosaveDir',
    'task.agentAccountPools', 'task.showResolvedModelBadge', 'goal.statusInFooter',
  ]) expect(OmpSettingIdSchema.safeParse(excluded).success).toBe(false);
  expect(OmpSettingIdSchema.safeParse('compaction.thresholdPercent').success).toBe(true);
  for (const exposed of [
    'cycleOrder', 'modelPresets', 'modelRoleStorage', 'tier.openai', 'tier.anthropic',
    'tier.google', 'tier.subagent', 'tier.advisor', 'out.enabled', 'tui.renderMermaid',
    'tui.renderSvg', 'tui.autoGraph', 'steeringMode', 'followUpMode', 'interruptMode',
    'composer.predictions', 'composer.predictionAlternatives',
    'tools.artifactSpillThreshold', 'tools.artifactTailBytes', 'tools.artifactHeadBytes',
    'tools.outputMaxColumns', 'tools.artifactTailLines', 'tools.artifactMaxBytes',
  ]) expect(OmpSettingIdSchema.safeParse(exposed).success).toBe(true);
});
