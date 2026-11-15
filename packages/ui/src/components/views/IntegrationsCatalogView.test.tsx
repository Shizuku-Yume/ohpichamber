import { afterAll, afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import type { MCPOAuthResult } from '@openchamber/agent-contract';
import React, { act } from 'react';
import type { Root } from 'react-dom/client';
import { Element as HappyElement, HTMLElement, Window } from 'happy-dom';

/** A card or button found by text, narrowed to happy-dom's clickable element. */
const findClickable = (elements: HappyElement[], text: string): HTMLElement | undefined =>
  elements.find((element): element is HTMLElement =>
    element instanceof HTMLElement && Boolean(element.textContent?.includes(text)));
const browser = new Window({ url: 'http://localhost' });
let root: Root;
const descriptors = new Map<string, PropertyDescriptor | undefined>();
// React DOM detects input-event support when imported, so install the DOM first.
for (const [key, value] of Object.entries({
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  localStorage: browser.localStorage,
  Element: browser.Element,
  Node: browser.Node,
  HTMLElement: browser.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
  // happy-dom has no animation frame; base-ui's Collapsible mounts one per panel.
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0),
  cancelAnimationFrame: (handle: number) => clearTimeout(handle),
  getComputedStyle: browser.getComputedStyle.bind(browser),
})) {
  descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { value, configurable: true });
}
// The sign-in panel the detail page mounts reads the same client; the catalog's
// own install path must not reach the network in these tests.
const oauthStarts: string[] = [];
const connects: string[] = [];
const infos: string[] = [];
const successes: string[] = [];
const errors: string[] = [];
const oauthReads: string[] = [];
const actualClient = await import('@/api/canonicalClient');
mock.module('@/api/canonicalClient', () => ({
  ...actualClient,
  canonicalClient: {
    ...actualClient.canonicalClient,
    resolveWorkspace: async () => ({ workspaceId: 'workspace', projectId: 'project', name: 'Workspace' }),
    getWorkspaceMcpOAuth: async (): Promise<MCPOAuthResult> => {
      oauthReads.push('read');
      return { serverId: 'linear', persistedRevision: '1', worker: { rootSessionId: 'root', workspaceId: 'workspace', workerGeneration: 'generation' }, status: 'unauthenticated', authenticated: false };
    },
    submitWorkspaceMcpOAuth: async (_workspaceId: string, serverId: string): Promise<MCPOAuthResult> => {
      oauthStarts.push(serverId);
      return { serverId, persistedRevision: '1', worker: { rootSessionId: 'root', workspaceId: 'workspace', workerGeneration: 'generation' }, status: 'pending', authenticated: false, pendingFlow: { flowId: 'flow', authorizationUrl: 'https://auth.example.test/authorize' } };
    },
  },
}));
const { createRoot } = await import('react-dom/client');
const { toast } = await import('@/components/ui/toast');
// The page's own toasts are its user-visible report; record them per level.
spyOn(toast, 'success').mockImplementation((message) => { successes.push(String(message)); return 'id'; });
spyOn(toast, 'info').mockImplementation((message) => { infos.push(String(message)); return 'id'; });
spyOn(toast, 'error').mockImplementation((message) => { errors.push(String(message)); return 'id'; });
const { I18nProvider } = await import('@/lib/i18n');
const { useUIStore } = await import('@/stores/useUIStore');
const { useMcpConfigStore } = await import('@/stores/useMcpConfigStore');
const { useMcpStore } = await import('@/stores/useMcpStore');
const { usePluginsStore } = await import('@/stores/usePluginsStore');
const { useProjectsStore } = await import('@/stores/useProjectsStore');
const { useSkillsStore } = await import('@/stores/useSkillsStore');
const { useGuestsStore } = await import('@/lib/guests/store');
const { IntegrationsCatalogView } = await import('./IntegrationsCatalogView');
const initialUI = useUIStore.getState();
const initialMcpConfig = useMcpConfigStore.getState();
const initialMcp = useMcpStore.getState();
const initialPlugins = usePluginsStore.getState();
const initialSkills = useSkillsStore.getState();
const initialGuests = useGuestsStore.getState();

const linearServer = {
  serverId: 'linear',
  label: 'Linear',
  enabled: true as const,
  scope: 'project' as const,
  transport: { type: 'http' as const, url: 'https://mcp.linear.app/mcp' },
};
const atlassianServer = {
  serverId: 'atlassian',
  label: 'Atlassian',
  enabled: true as const,
  scope: 'project' as const,
  transport: { type: 'http' as const, url: 'https://mcp.atlassian.com/v2/mcp' },
};
const appliedMcpMutation = () => ({
  ok: true as const,
  outcome: 'applied' as const,
  result: {
    kind: 'mcp' as const,
    status: 'applied' as const,
    outcome: 'applied' as const,
    configuration: { workspaceId: 'workspace', persistedRevision: '1', config: { servers: [] as typeof linearServer[] } },
    workers: [],
  },
});
const needsAuthMcpMutation = () => ({
  ok: true as const,
  outcome: 'saved-needs-auth' as const,
  result: {
    kind: 'mcp' as const,
    status: 'no-active-workers' as const,
    outcome: 'saved-needs-auth' as const,
    configuration: { workspaceId: 'workspace', persistedRevision: '1', config: { servers: [linearServer] } },
    workers: [],
  },
});
const runtimeFor = (configuration: typeof linearServer, state: { runtimeStatus: 'ready' | 'unavailable' } = { runtimeStatus: 'ready' }) => ({
  configuration,
  catalogs: [{
    runtimeStatus: state.runtimeStatus,
    activeServers: state.runtimeStatus === 'ready' ? [configuration.serverId] : [],
    appliedRevision: state.runtimeStatus === 'ready' ? '1' : null,
    catalogRevision: state.runtimeStatus === 'ready' ? '1' : '0',
    worker: { workspaceId: 'workspace', rootSessionId: 'root', workerGeneration: '1' },
    tools: [],
  }],
});
const EMPTY_RUNTIME_STATUS = {};
const linearReadyStatus = { linear: runtimeFor(linearServer) };
const linearFailedStatus = { linear: runtimeFor(linearServer, { runtimeStatus: 'unavailable' }) };

beforeEach(() => {
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  useUIStore.setState({ isIntegrationsCatalogOpen: true });
  // The page's mount effect refreshes each store; keep the test offline.
  useMcpConfigStore.setState({
    loadMcpConfigs: async () => true,
    createMcp: async () => appliedMcpMutation(),
    deleteMcp: async () => appliedMcpMutation(),
  });
  oauthStarts.length = 0;
  oauthReads.length = 0;
  connects.length = 0;
  infos.length = 0;
  successes.length = 0;
  errors.length = 0;
  useMcpStore.setState({
    refresh: async () => undefined,
    connect: async (serverId: string) => { connects.push(serverId); },
    testConnection: async (serverId: string) => ({ workspaceId: 'workspace', serverId, persistedRevision: '1', status: 'failed' as const, error: { code: 'MCP_AUTH_REQUIRED', detail: 'HTTP 403 forbidden', retryable: false } }),
    // A server the test saved carries the probe the Agent Service reported for
    // it: sign-in required once it exists, nothing before.
    getStatusForDirectory: () => useMcpConfigStore.getState().serversByDirectory['/repo']?.some((saved) => saved.serverId === 'linear')
      ? linearAuthRequiredStatus
      : EMPTY_RUNTIME_STATUS,
  });
  usePluginsStore.setState({
    loadPlugins: async () => true,
  });
  useSkillsStore.setState({
    loadSkills: async () => true,
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  useUIStore.setState(initialUI);
  useMcpConfigStore.setState(initialMcpConfig);
  useMcpStore.setState(initialMcp);
  usePluginsStore.setState(initialPlugins);
  useSkillsStore.setState(initialSkills);
  useGuestsStore.setState(initialGuests);
  document.body.replaceChildren();
});

afterAll(async () => {
  await browser.happyDOM.close();
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, { value: descriptor, configurable: true });
    else Reflect.deleteProperty(globalThis, key);
  }
});
test('the catalog lists entries, filters by category and opens a detail page on click', async () => {
  useMcpConfigStore.setState({ mcpServers: [linearServer] });
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  const body = browser.document.body;

  expect(body.textContent?.includes('Linear')).toBe(true);
  expect(body.textContent?.includes('Playwright')).toBe(true);
  expect(body.textContent?.includes('Slack')).toBe(false);

  // Clicking a card opens that integration's detail page.
  const linearCard = findClickable([...body.querySelectorAll('[role="button"], button')], 'Linear');
  if (!linearCard) throw new Error('Linear card missing');
  await act(async () => linearCard.click());
  expect(body.textContent?.includes('Connect Linear so the agent can read your issues')).toBe(true);
  expect(body.textContent?.includes('Playwright')).toBe(false);

  // The detail breadcrumb returns to the grid.
  const back = findClickable([...body.querySelectorAll('nav button')], 'Integrations');
  if (!back) throw new Error('Back button missing');
  await act(async () => back.click());
  expect(body.textContent?.includes('Playwright')).toBe(true);
});

test('the category filter narrows the grid', async () => {
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  const body = browser.document.body;
  const codeChip = [...body.querySelectorAll('button')].find((button) => button.textContent?.startsWith('Code'));
  if (!codeChip) throw new Error('Category chip missing');
  await act(async () => codeChip.click());
  expect(body.textContent?.includes('GitHub')).toBe(true);
  expect(body.textContent?.includes('Playwright')).toBe(false);
});

test('the search field ranks matches and reports an empty result', async () => {
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  const body = browser.document.body;
  const input = body.querySelector('input');
  if (!input) throw new Error('Search field missing');
  const setValue = Object.getOwnPropertyDescriptor(browser.HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    setValue?.call(input, 'playwright');
    input.dispatchEvent(new browser.Event('input', { bubbles: true }));
  });
  expect(body.textContent?.includes('Playwright')).toBe(true);
  expect(body.textContent?.includes('Linear')).toBe(false);
});

const atlassianStatus = { atlassian: { configuration: atlassianServer, catalogs: [], probe: { workspaceId: 'workspace', serverId: 'atlassian', persistedRevision: '1', status: 'connected' as const, toolCount: 1 } } };
test('the rail lists installed integrations and opens one', async () => {
  useProjectsStore.setState({ projects: [{ id: 'repo', path: '/repo' }], activeProjectId: 'repo' });
  useUIStore.setState({ settingsProjectPath: '/repo' });
  useMcpConfigStore.setState({ serversByDirectory: { '/repo': [atlassianServer] } });
  // An installed server carries authoritative runtime evidence; a declaration alone is not installed.
  useMcpStore.setState({ getStatusForDirectory: () => atlassianStatus });
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  const body = browser.document.body;
  const rail = body.querySelector('aside');
  if (!rail) throw new Error('Rail missing');
  expect(rail.textContent?.includes('Installed1')).toBe(true);
  expect(rail.textContent?.includes('Linear')).toBe(false);

  const atlassian = [...rail.querySelectorAll('button')].find((button) => button.textContent?.includes('Atlassian'));
  if (!atlassian) throw new Error('Installed entry missing');
  await act(async () => atlassian.click());
  expect(body.querySelector('main h1')?.textContent).toBe('Atlassian');
  expect(body.textContent?.includes('Connection')).toBe(true);
});

test('the catalog flag follows the mutually exclusive full-page surface contract', () => {
  const store = useUIStore.getState();
  store.setIntegrationsCatalogOpen(true);
  expect(useUIStore.getState().isIntegrationsCatalogOpen).toBe(true);

  // Opening another surface closes the catalog.
  useUIStore.getState().setArchivePageOpen(true);
  expect(useUIStore.getState().isIntegrationsCatalogOpen).toBe(false);
  expect(useUIStore.getState().isArchivePageOpen).toBe(true);

  // Opening the catalog closes the archive.
  useUIStore.getState().setIntegrationsCatalogOpen(true);
  expect(useUIStore.getState().isArchivePageOpen).toBe(false);
  expect(useUIStore.getState().isIntegrationsCatalogOpen).toBe(true);

  // Selecting a session closes every full-page surface.
  useUIStore.getState().closeMainSurfaces();
  expect(useUIStore.getState().isIntegrationsCatalogOpen).toBe(false);

  // Closing the catalog leaves the other surfaces untouched.
  useUIStore.getState().setIntegrationsCatalogOpen(true);
  useUIStore.getState().setIntegrationsCatalogOpen(false);
  expect(useUIStore.getState().isIntegrationsCatalogOpen).toBe(false);
  expect(useUIStore.getState().isUsageStatsPageOpen).toBe(false);
});

test('the canonical runtime state shows as installed, failed or switched off', async () => {
  useMcpStore.setState({
    getStatusForDirectory: () => linearReadyStatus,
  });
  useProjectsStore.setState({ projects: [{ id: 'repo', path: '/repo' }], activeProjectId: 'repo' });
  useUIStore.setState({ settingsProjectPath: '/repo' });
  useMcpConfigStore.setState({ serversByDirectory: { '/repo': [linearServer] } });
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  const body = browser.document.body;
  const rail = body.querySelector('aside');
  expect(rail?.textContent?.includes('Installed1')).toBe(true);

  await act(async () => useMcpStore.setState({ getStatusForDirectory: () => linearFailedStatus }));
  expect(body.textContent?.includes('Failed')).toBe(true);

  await act(async () => {
    useMcpStore.setState({ getStatusForDirectory: () => EMPTY_RUNTIME_STATUS });
    useMcpConfigStore.setState({ serversByDirectory: { '/repo': [{ ...linearServer, enabled: false }] } });
  });
  expect(body.textContent?.includes('Disabled')).toBe(true);
});

test('a same-named skill outside the catalog folder does not count as installed', async () => {
  useSkillsStore.setState({
    skills: [
      { skillId: 'a', name: 'pdf', description: '', content: '', scope: 'inherited', readOnly: true, source: 'native' },
      { skillId: 'b', name: 'pdf', description: '', content: '', scope: 'workspace', readOnly: false, source: 'native', authoredSkillId: 'other/pdf' },
    ],
  });
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  const railText = () => browser.document.body.querySelector('aside')?.textContent ?? '';
  expect(railText().includes('Installed0')).toBe(true);

  // The catalog's own copy, authored in the skills folder, counts.
  await act(async () => useSkillsStore.setState({
    skills: [
      ...useSkillsStore.getState().skills,
      { skillId: 'c', name: 'pdf', description: '', content: '', scope: 'agent', readOnly: false, source: 'native', authoredSkillId: 'pdf' },
    ],
  }));
  expect(railText().includes('Installed1')).toBe(true);
});

const linearProbe = (code: string) => ({ workspaceId: 'workspace', serverId: 'linear', persistedRevision: '1', status: 'failed' as const, error: { code, detail: 'probe', retryable: true } });
const linearAuthRequiredStatus = { linear: { configuration: linearServer, catalogs: [], probe: linearProbe('MCP_AUTH_REQUIRED') } };
const linearNotConnectedStatus = { linear: { configuration: linearServer, catalogs: [], probe: linearProbe('MCP_APPLY_FAILED') } };
const clickButton = async (label: string) => {
  const button = [...browser.document.body.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === label);
  if (!button) throw new Error(`${label} button missing`);
  await act(async () => button.click());
};

test('an existing server that needs sign-in shows sign-in required from its own probe', async () => {
  useProjectsStore.setState({ projects: [{ id: 'repo', path: '/repo' }], activeProjectId: 'repo' });
  useUIStore.setState({ settingsProjectPath: '/repo' });
  useMcpConfigStore.setState({ serversByDirectory: { '/repo': [linearServer] } });
  useMcpStore.setState({ getStatusForDirectory: () => linearAuthRequiredStatus });
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  expect(browser.document.body.textContent?.includes('Sign-in required')).toBe(true);
});

test('a saved OAuth declaration without runtime evidence is not shown as installed or sign-in required', async () => {
  useProjectsStore.setState({ projects: [{ id: 'repo', path: '/repo' }], activeProjectId: 'repo' });
  useUIStore.setState({ settingsProjectPath: '/repo' });
  useMcpConfigStore.setState({ serversByDirectory: { '/repo': [linearServer] } });
  useMcpStore.setState({ getStatusForDirectory: () => EMPTY_RUNTIME_STATUS });
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  const body = browser.document.body;
  expect(body.querySelector('aside')?.textContent?.includes('Installed0')).toBe(true);
  expect(body.textContent?.includes('Sign-in required')).toBe(false);
});

test('installing an existing server configures it again and does not create it', async () => {
  useProjectsStore.setState({ projects: [{ id: 'repo', path: '/repo' }], activeProjectId: 'repo' });
  useUIStore.setState({ settingsProjectPath: '/repo' });
  useMcpConfigStore.setState({ serversByDirectory: { '/repo': [linearServer] } });
  useMcpStore.setState({ getStatusForDirectory: () => linearNotConnectedStatus });
  const created: string[] = [];
  const configured: string[] = [];
  useMcpConfigStore.setState({
    createMcp: async (config) => { created.push(config.serverId); return { ok: false, error: 'create must not run' }; },
    updateMcp: async (serverId) => { configured.push(serverId); return appliedMcpMutation(); },
  });
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  const linearCard = findClickable([...browser.document.body.querySelectorAll('[role="button"], button')], 'Linear');
  if (!linearCard) throw new Error('Linear card missing');
  await act(async () => linearCard.click());
  // The header Install opens the scope dialog; its confirm is the last Install button in the page.
  await clickButton('Install');

  const confirm = [...browser.document.body.querySelectorAll('button')].filter((candidate) => candidate.textContent?.trim() === 'Install').at(-1);
  if (!confirm) throw new Error('Scope dialog confirm missing');
  await act(async () => confirm.click());
  expect(configured).toEqual(['linear']);
  expect(created).toEqual([]);
});

test('a detail page opens at its top and going back restores the browse scroll', async () => {
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  const body = browser.document.body;
  const scroller = body.querySelector('main');
  if (!scroller) throw new Error('Scroller missing');
  scroller.scrollTop = 600;
  await act(async () => scroller.dispatchEvent(new browser.Event('scroll')));

  const card = findClickable([...body.querySelectorAll('main [role="button"]')], 'Notion');
  if (!card) throw new Error('Notion row missing');
  await act(async () => card.click());
  expect(scroller.scrollTop).toBe(0);

  const back = findClickable([...body.querySelectorAll('nav button')], 'Integrations');
  if (!back) throw new Error('Back button missing');
  await act(async () => back.click());
  expect(scroller.scrollTop).toBe(600);
});

test('no OpenCode-only plugin entries are offered', async () => {
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  const body = browser.document.body;
  expect(body.textContent?.includes('Langfuse')).toBe(false);
  expect(body.textContent?.includes('Search Providers')).toBe(false);
  // OpenChamber's own extensions stay.
  expect(body.textContent?.includes('Excalidraw')).toBe(true);
});

const settle = async (turns = 20) => {
  for (let turn = 0; turn < turns; turn += 1) await act(async () => { await Promise.resolve(); });
};

/** Installs the entry the way the user does: open the card, Install, confirm the scope. */
const installFromBrowse = async (name: string) => {
  const card = findClickable([...browser.document.body.querySelectorAll('main [role="button"], main button')], name);
  if (!card) throw new Error(`${name} card missing`);
  await act(async () => card.click());
  await clickButton('Install');
  const confirm = [...browser.document.body.querySelectorAll('button')].filter((candidate) => candidate.textContent?.trim() === 'Install').at(-1);
  if (!confirm) throw new Error('Scope dialog confirm missing');
  await act(async () => confirm.click());
  await settle();
};

/** Saves the server the way the store does after a needs-sign-in apply. */
const saveLinear = () => {
  const configuration = { workspaceId: 'workspace', persistedRevision: '1', config: { servers: [linearServer] } };
  useMcpConfigStore.setState({
    serversByDirectory: { '/repo': [linearServer] },
    configurationsByDirectory: { '/repo': configuration },
  });
};

test('a saved needs-sign-in install opens the connection card and never reports an install error', async () => {
  useProjectsStore.setState({ projects: [{ id: 'repo', path: '/repo' }], activeProjectId: 'repo' });
  useUIStore.setState({ settingsProjectPath: '/repo' });
  useMcpConfigStore.setState({
    createMcp: async () => { saveLinear(); return needsAuthMcpMutation(); },
  });
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  await installFromBrowse('Linear');

  expect(errors).toEqual([]);
  expect(infos).toEqual(['Linear saved. Sign in to finish.']);
  expect(successes).toEqual([]);
  expect(browser.document.body.querySelector('main h1')?.textContent).toBe('Linear');
  expect(browser.document.body.textContent?.includes('Connection')).toBe(true);
  // The install is one action: the panel starts the only sign-in method itself.
  expect(oauthStarts).toEqual(['linear']);
});

test('a needs-sign-in result that arrives as a refused apply is still a sign-in, not an error', async () => {
  useProjectsStore.setState({ projects: [{ id: 'repo', path: '/repo' }], activeProjectId: 'repo' });
  useUIStore.setState({ settingsProjectPath: '/repo' });
  // The store turns this refusal into success-with-action; the view must honour
  // the outcome rather than the `ok` shape it happened to travel in.
  useMcpConfigStore.setState({
    createMcp: async () => { saveLinear(); return { ...needsAuthMcpMutation(), ok: false as unknown as true, error: 'MCP_AUTH_REQUIRED' }; },
  });
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  await installFromBrowse('Linear');

  expect(errors).toEqual([]);
  expect(infos).toEqual(['Linear saved. Sign in to finish.']);
  expect(successes).toEqual([]);
  expect(browser.document.body.textContent?.includes('Connection')).toBe(true);
});

test('reinstalling a saved unauthenticated server never toasts success', async () => {
  useProjectsStore.setState({ projects: [{ id: 'repo', path: '/repo' }], activeProjectId: 'repo' });
  useUIStore.setState({ settingsProjectPath: '/repo' });
  // Saved, but no probe evidence yet: the reinstall reconfigures the server
  // rather than skipping it as installed.
  useMcpConfigStore.setState({ serversByDirectory: { '/repo': [linearServer] } });
  useMcpStore.setState({ getStatusForDirectory: () => EMPTY_RUNTIME_STATUS });
  useMcpConfigStore.setState({
    updateMcp: async () => needsAuthMcpMutation(),
  });
  await act(async () => root.render(<I18nProvider><IntegrationsCatalogView /></I18nProvider>));
  await installFromBrowse('Linear');

  expect(successes).toEqual([]);
  expect(errors).toEqual([]);
  expect(infos).toEqual(['Linear saved. Sign in to finish.']);
});
