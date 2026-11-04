import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Settings, resetSettingsForTest } from '@oh-my-pi/pi-coding-agent/config/settings';
import { cfgModelRoles } from '@oh-my-pi/pi-coding-agent/config/model-settings';
import { cfgRetryModelFallback } from '@oh-my-pi/pi-coding-agent/session/settings';
import { cfgTitleRefreshOnReplan } from '@oh-my-pi/pi-coding-agent/utils/title-settings';
import type { AgentSession } from '@oh-my-pi/pi-coding-agent/session/agent-session';
import { generateSelectedModelTitle } from './auto-title.ts';

type TitleModel = NonNullable<AgentSession['model']>;
// SAFETY: formatModelString and the title generator read only provider, id and baseUrl from this fixture.
const selectedModel = { provider: 'selected', id: 'title-model', baseUrl: 'https://selected.example/v1' } as TitleModel;

let root: string;
let settings: Settings;
beforeEach(async () => {
  resetSettingsForTest();
  root = await mkdtemp(join(tmpdir(), 'auto-title-'));
  const cwd = join(root, 'workspace');
  const agentDir = join(root, 'agent');
  await mkdir(cwd, { recursive: true });
  await mkdir(agentDir, { recursive: true });
  settings = await Settings.init({ cwd, agentDir });
});
afterEach(async () => {
  resetSettingsForTest();
  await rm(root, { recursive: true, force: true });
});

test('title generation authorizes the selected model before one pinned-provider request', async () => {
  cfgModelRoles.override(settings, { tiny: 'previous/tiny', plan: 'previous/plan' });
  cfgRetryModelFallback.override(settings, true);
  const calls: string[] = [];
  // SAFETY: the helper reads only model and generateTitle; the fixture supplies exactly those members.
  const session = {
    model: selectedModel,
    generateTitle: async () => {
      calls.push('generate');
      expect(cfgModelRoles.get(settings)).toMatchObject({ tiny: 'selected/title-model', commit: 'selected/title-model', smol: 'selected/title-model', plan: 'previous/plan' });
      expect(cfgRetryModelFallback.get(settings)).toBe(false);
      return 'Selected title';
    },
  } as Pick<AgentSession, 'model' | 'generateTitle'>;

  const title = await generateSelectedModelTitle({
    session,
    settings,
    firstMessage: 'Name this session',
    authorize: async model => {
      calls.push(`authorize:${model.provider}/${model.id}`);
      expect(model).toBe(selectedModel);
    },
  });

  expect(title).toBe('Selected title');
  expect(calls).toEqual(['authorize:selected/title-model', 'generate']);
  expect(cfgModelRoles.get(settings)).toMatchObject({ tiny: 'previous/tiny', plan: 'previous/plan' });
  expect(cfgRetryModelFallback.get(settings)).toBe(true);
});

test('an unauthorized title provider releases no credential and leaves the session untitled', async () => {
  cfgModelRoles.override(settings, { tiny: 'previous/tiny' });
  let generated = false;
  // SAFETY: the helper reads only model and generateTitle; the fixture supplies exactly those members.
  const session = {
    model: selectedModel,
    generateTitle: async () => {
      generated = true;
      return 'Must not be used';
    },
  } as Pick<AgentSession, 'model' | 'generateTitle'>;

  await expect(generateSelectedModelTitle({
    session,
    settings,
    firstMessage: 'Name this session',
    authorize: async () => { throw new Error('provider.use denied'); },
  })).rejects.toThrow('provider.use denied');

  expect(generated).toBe(false);
  expect(cfgModelRoles.get(settings)).toMatchObject({ tiny: 'previous/tiny' });
  expect(cfgRetryModelFallback.get(settings)).toBe(true);
});

test('restores model roles provenance to non-runtime when no prior override existed', async () => {
  expect(settings.getProvenance(cfgModelRoles)).not.toBe('runtime');
  // SAFETY: the helper reads only model and generateTitle; the fixture supplies exactly those members.
  const session = {
    model: selectedModel,
    generateTitle: async () => 'Fresh Title',
  } as Pick<AgentSession, 'model' | 'generateTitle'>;

  const title = await generateSelectedModelTitle({
    session,
    settings,
    firstMessage: 'Test prompt',
    authorize: async () => {},
  });

  expect(title).toBe('Fresh Title');
  expect(settings.getProvenance(cfgModelRoles)).not.toBe('runtime');
});

test('replan-triggered OMP generation is disabled by cfgTitleRefreshOnReplan while authorized generation succeeds', async () => {
  cfgTitleRefreshOnReplan.override(settings, false);
  expect(cfgTitleRefreshOnReplan.get(settings)).toBe(false);

  // SAFETY: the helper reads only model and generateTitle; the fixture supplies exactly those members.
  const session = {
    model: selectedModel,
    generateTitle: async () => 'Authorized replan title',
  } as Pick<AgentSession, 'model' | 'generateTitle'>;
  const title = await generateSelectedModelTitle({
    session,
    settings,
    firstMessage: 'Authorized prompt',
    authorize: async () => {},
  });

  expect(title).toBe('Authorized replan title');
  expect(cfgTitleRefreshOnReplan.get(settings)).toBe(false);
});
