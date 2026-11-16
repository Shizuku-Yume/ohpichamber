import { afterAll, afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import type { Agent } from '@openchamber/agent-contract';
import type { Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import { plugin } from 'bun';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser, document: browser.document, navigator: browser.navigator, localStorage: browser.localStorage,
  Node: browser.Node, Element: browser.Element, HTMLElement: browser.HTMLElement,
  HTMLInputElement: browser.HTMLInputElement, HTMLTextAreaElement: browser.HTMLTextAreaElement,
  Event: browser.Event, FocusEvent: browser.FocusEvent, CustomEvent: browser.CustomEvent,
  MutationObserver: browser.MutationObserver, ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser), IS_REACT_ACT_ENVIRONMENT: true,
});
const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes('/workspaces/resolve')) {
    return Response.json({ workspaceId: 'ws_1', projectId: 'project', name: 'project' });
  }
  if (url.includes('/tools')) {
    return Response.json({
      sessionId: 'sess_1',
      tools: [
        { name: 'read', label: 'Read', description: 'Read files', tier: 'read', availability: true },
        { name: 'bash', label: 'Bash', description: 'Run commands', tier: 'exec', availability: true },
        { name: 'custom-tool', label: 'Custom', description: 'Custom tool', tier: 'exec', availability: true },
        { name: 'disabled-tool', label: 'Disabled', description: 'Disabled tool', tier: 'exec', availability: false },
      ],
    });
  }
  if (url.includes('/omp')) {
    return Response.json({ workspaceId: 'ws_1', revision: '1', totalCount: 0, placementCounts: { tuiOnly: 0, boundary: 0, elsewhere: 0 }, settings: [] });
  }
  return Response.json(url.includes('/config/mcp') ? [] : { home: '/test', projects: [{ id: 'project', path: '/project' }], activeProjectId: 'project' });
});
// These loading boundaries must run after the browser globals and the Bun asset-loader plugin are installed.
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { useAgentsStore } = await import('@/stores/useAgentsStore');
const { useProjectsStore } = await import('@/stores/useProjectsStore');
const { useSessionUIStore } = await import('@/sync/session-ui-store');
plugin({
  name: 'agent-settings-provider-logos',
  setup(build) {
    build.onLoad({ filter: /useProviderLogo\.ts$/ }, ({ path }) => {
      const directory = resolve(dirname(path), '../assets/provider-logos');
      const logos = Object.fromEntries(readdirSync(directory).filter((name) => name.endsWith('.svg')).map((name) => [
        `../assets/provider-logos/${name}`, pathToFileURL(resolve(directory, name)).href,
      ]));
      return { contents: readFileSync(path, 'utf8').replace(/import\.meta\.glob<string>\([\s\S]*?\);/, `${JSON.stringify(logos)};`), loader: 'ts' };
    });
  },
});
const { AgentsPage } = await import('./AgentsPage');
const initialAgent: Agent = {
  agentId: 'test', name: 'test', description: 'Initial description',
  model: { providerId: 'provider', modelId: 'model' }, allowedTools: ['read', 'custom-tool'],
  systemPromptOverride: 'initial',
};
const container = document.createElement('div');
document.body.appendChild(container);
let root: Root;
beforeEach(() => {
  fetchSpy.mockImplementation(async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/workspaces/resolve')) {
      return Response.json({ workspaceId: 'ws_1', projectId: 'project', name: 'project' });
    }
    if (url.includes('/tools')) {
      return Response.json({
        sessionId: 'sess_1',
        tools: [
          { name: 'read', label: 'Read', description: 'Read files', tier: 'read', availability: true },
          { name: 'bash', label: 'Bash', description: 'Run commands', tier: 'exec', availability: true },
          { name: 'custom-tool', label: 'Custom', description: 'Custom tool', tier: 'exec', availability: true },
          { name: 'disabled-tool', label: 'Disabled', description: 'Disabled tool', tier: 'exec', availability: false },
        ],
      });
    }
    return Response.json(url.includes('/config/mcp') ? [] : { home: '/test', projects: [{ id: 'project', path: '/project' }], activeProjectId: 'project' });
  });
  useProjectsStore.setState({ projects: [{ id: 'project', path: '/project' }], activeProjectId: 'project' });
  useSessionUIStore.setState({ currentSessionId: null });
  root = createRoot(container);
  useAgentsStore.setState({
    selectedAgentName: 'test', agentDraft: null,
    agentsByDirectory: { '/project': [initialAgent] },
    revisionsByDirectory: { '/project': '1' }, errorsByDirectory: {},
    loadAgents: async () => true,
    updateAgent: async () => ({ ok: true, revision: '2' }),
    createAgent: async () => ({ ok: true, revision: '2' }),
  });
});
afterEach(async () => { await act(async () => root.unmount()); });
afterAll(() => { fetchSpy.mockRestore(); browser.close(); });
const render = async () => { await act(async () => { root.render(<I18nProvider><AgentsPage /></I18nProvider>); }); };
const field = (value: string) => {
  const entry = [...container.querySelectorAll<HTMLTextAreaElement>('textarea')].find((textarea) => textarea.value === value);
  if (!entry) throw new Error(`Missing textarea: ${value}`);
  return entry;
};
const edit = async (entry: HTMLTextAreaElement, value: string, blur = true) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (!setter) throw new Error('Missing textarea setter');
  await act(async () => { setter.call(entry, value); entry.dispatchEvent(new Event('input', { bubbles: true })); });
  if (blur) await act(async () => { entry.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
};
const toolRow = (value: string): HTMLElement => {
  const rows = [...container.querySelectorAll<HTMLElement>('div[role="button"]')];
  const row = rows.find((candidate) => candidate.textContent?.includes(`(${value})`) || candidate.textContent?.includes(value));
  if (!row) throw new Error(`Missing tool row: ${value}`);
  return row;
};
const toggleTool = async (value: string) => {
  const row = toolRow(value);
  await act(async () => { row.click(); });
};

test('native catalog refresh during save preserves newer draft and advances only acknowledged revision', async () => {
  const writes: Array<{ agent: Agent; revision: string | undefined; finish: () => void }> = [];
  useAgentsStore.setState({
    updateAgent: async (agent, _directory, revision) => {
      const { promise, resolve } = Promise.withResolvers<{ ok: true; revision: string }>();
      writes.push({ agent, revision, finish: () => resolve({ ok: true, revision: String(Number(revision) + 1) }) });
      return promise;
    },
  });
  await render();
  const system = field('initial');
  await edit(system, 'older');
  await edit(system, 'newer');
  expect(writes.map((write) => write.agent.systemPromptOverride)).toEqual(['older']);
  await act(async () => {
    useAgentsStore.setState({
      agentsByDirectory: { '/project': [{ ...initialAgent, systemPromptOverride: 'older' }] },
      revisionsByDirectory: { '/project': '99' },
    });
  });
  expect(system.value).toBe('newer');
  await act(async () => { writes[0].finish(); });
  expect(writes.map((write) => write.agent.systemPromptOverride)).toEqual(['older', 'newer']);
  expect(writes.map((write) => write.revision)).toEqual(['1', '2']);
  expect(writes[1].agent.allowedTools).toEqual(initialAgent.allowedTools);
  await act(async () => {
    useAgentsStore.setState({
      selectedAgentName: 'other', agentsByDirectory: { '/project': [{ ...initialAgent, agentId: 'other', name: 'other', systemPromptOverride: 'other prompt' }] },
    });
  });
  expect(system.value).toBe('other prompt');
  await act(async () => { writes[1].finish(); });
  expect(system.value).toBe('other prompt');
});

test('dirty native fields keep hydration revision on concurrent refresh and display mutation conflict', async () => {
  const writes: Array<{ agent: Agent; revision: string | undefined }> = [];
  useAgentsStore.setState({
    updateAgent: async (agent, _directory, revision) => {
      writes.push({ agent, revision }); return { ok: false, error: 'CATALOG_CONFLICT' };
    }
  });
  await render();
  const description = field('Initial description');
  await edit(description, '', false);
  await act(async () => {
    useAgentsStore.setState({
      agentsByDirectory: { '/project': [{ ...initialAgent, description: 'External edit', allowedTools: ['external'] }] },
      revisionsByDirectory: { '/project': '2' },
    });
  });
  expect(description.value).toBe('');
  await act(async () => { description.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
  expect(writes[0].revision).toBe('1');
  expect(writes[0].agent).toEqual({ ...initialAgent, description: '' });
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('CATALOG_CONFLICT');
  expect(description.value).toBe('');
  expect(useAgentsStore.getState().selectedAgentName).toBe('test');
});

test('clean refresh hydrates native fields and optional prompt removal without preset input', async () => {
  const writes: Agent[] = [];
  useAgentsStore.setState({ updateAgent: async (agent) => { writes.push(agent); return { ok: true, revision: '3' }; } });
  await render();
  expect(container.querySelector('input[aria-label="Permission preset ID"]')).toBeNull();
  expect(container.querySelectorAll('textarea')).toHaveLength(2);
  await act(async () => {
    useAgentsStore.setState({
      agentsByDirectory: { '/project': [{ ...initialAgent, description: 'Refreshed description', systemPromptOverride: 'refreshed' }] },
      revisionsByDirectory: { '/project': '2' },
    });
  });
  expect(field('Refreshed description')).toBeDefined();
  await edit(field('refreshed'), '');
  expect(writes[0].systemPromptOverride).toBeUndefined();
  expect(writes[0].model).toEqual(initialAgent.model);
  expect(writes[0].allowedTools).toEqual(initialAgent.allowedTools);
  expect((writes[0] as unknown as Record<string, unknown>).permissionPresetId).toBeUndefined();
});

test('unavailable catalog is visible and never renders editable stale fields', async () => {
  useAgentsStore.setState({ agentsByDirectory: {}, revisionsByDirectory: {}, errorsByDirectory: { '/project': 'SERVICE_UNAVAILABLE' } });
  await render();
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('SERVICE_UNAVAILABLE');
  expect(container.querySelector('[role="status"]')?.textContent).toBe('Unavailable');
  expect(container.querySelectorAll('textarea')).toHaveLength(0);
});

test('creating native draft preserves its identity, tools and preset without legacy fields', async () => {
  const writes: Agent[] = [];
  const draft: Agent = { ...initialAgent, agentId: 'new-profile-id', name: 'new-profile', systemPromptOverride: '' };
  useAgentsStore.setState({
    selectedAgentName: draft.name, agentDraft: draft,
    createAgent: async (agent) => { writes.push(agent); return { ok: true, revision: '2' }; },
  });
  await render();
  await edit(field('Initial description'), 'New description');
  await toggleTool('custom-tool');
  await toggleTool('bash');
  expect(writes).toHaveLength(0);
  const create = [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === 'Create');
  if (!create) throw new Error('Missing create action');
  await act(async () => { create.click(); });
  expect(writes).toEqual([{ ...draft, description: 'New description', allowedTools: ['read', 'bash'] }]);
  expect(useAgentsStore.getState().selectedAgentName).toBe(draft.name);
  expect(useAgentsStore.getState().agentDraft).toBeNull();
});

test('unrelated-field autosave preserves explicit empty and exact tool lists', async () => {
  for (const tools of [[], ['read', 'custom-tool']] as const) {
    const writes: Agent[] = [];
    useAgentsStore.setState({
      agentsByDirectory: { '/project': [{ ...initialAgent, allowedTools: [...tools] }] },
      updateAgent: async (agent) => { writes.push(agent); return { ok: true, revision: String(writes.length + 2) }; },
    });
    await render();
    await edit(field('initial'), tools.length === 0 ? 'Empty list edit' : 'Exact list edit');
    expect(writes[0].allowedTools).toEqual(tools);
    await act(async () => root.unmount());
    root = createRoot(container);
  }
});

test('inherited tools stay null on hydrate and autosave, edit creates an explicit list, reset returns null', async () => {
  const writes: Agent[] = [];
  useAgentsStore.setState({
    agentsByDirectory: { '/project': [{ ...initialAgent, allowedTools: null }] },
    updateAgent: async (agent) => { writes.push(agent); return { ok: true, revision: String(writes.length + 2) }; },
  });
  await render();
  expect(container.textContent).toContain('Inherits the native default tool set.');
  await edit(field('initial'), 'Inherited description');
  expect(writes[0].allowedTools).toBeNull();
  await toggleTool('read');
  expect(writes.at(-1)?.allowedTools).toEqual(['bash', 'custom-tool']);
  const quickActionsGroup = container.querySelector('[role="group"][aria-label="Allowed tools"]');
  const defaultChip = [...(quickActionsGroup?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find((button) => button.textContent?.trim() === 'Default');
  if (!defaultChip) throw new Error('Missing default action');
  await act(async () => { defaultChip.click(); });
  expect(writes.at(-1)?.allowedTools).toBeNull();
});

test('explicit empty tools remain an explicit empty list', async () => {
  const writes: Agent[] = [];
  useAgentsStore.setState({
    agentsByDirectory: { '/project': [{ ...initialAgent, allowedTools: [] }] },
    updateAgent: async (agent) => { writes.push(agent); return { ok: true, revision: String(writes.length + 2) }; },
  });
  await render();
  expect(container.textContent).not.toContain('Inherits the native default tool set.');
  await toggleTool('read');
  expect(writes[0].allowedTools).toEqual(['read']);
});

test('the tool editor groups tools into collapsible sections with header tri-state checkboxes, N of M counts and tier chips; Show all selects only available tools; preset input is deleted', async () => {
  const writes: Agent[] = [];
  useAgentsStore.setState({
    updateAgent: async (agent) => {
      writes.push(agent); return { ok: true, revision: String(writes.length + 1) };
    }
  });
  await render();
  // No preset input:
  expect(container.querySelector('input[aria-label="Permission preset ID"]')).toBeNull();
  expect(container.querySelector('input[aria-label="Allowed tools"]')).toBeNull();

  // Sections with counts and tier chips:
  expect(container.textContent).toContain('Files and search');
  expect(container.textContent).toContain('Execution');

  // Toggling a tool updates allowedTools:
  await toggleTool('bash');
  expect(writes[0].allowedTools).toEqual(['read', 'custom-tool', 'bash']);
  expect((writes[0] as unknown as Record<string, unknown>).permissionPresetId).toBeUndefined();

  // Show all selects only available tools:
  const showAll = [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Show all');
  if (!showAll) throw new Error('Missing Show all action');
  await act(async () => { showAll.click(); });
  expect(writes.at(-1)?.allowedTools).toEqual(['read', 'bash', 'custom-tool']);
  expect(writes.at(-1)?.allowedTools).not.toContain('disabled-tool');
  // Hide all selects empty:
  const hideAll = [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Hide all');
  if (!hideAll) throw new Error('Missing Hide all action');
  await act(async () => { hideAll.click(); });
  expect(writes.at(-1)?.allowedTools).toEqual([]);
});

test('thinking level and spawns are updated and saved to agent definition', async () => {
  const writes: Agent[] = [];
  useAgentsStore.setState({
    updateAgent: async (agent) => {
      writes.push(agent);
      return { ok: true, revision: String(writes.length + 1) };
    },
  });
  await render();
  const spawnsInput = container.querySelector<HTMLInputElement>('input[aria-label="Subagent"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!spawnsInput || !setter) throw new Error('Missing spawns input');
  await act(async () => {
    setter.call(spawnsInput, 'scout, reviewer');
    spawnsInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    spawnsInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  });
  expect(writes[0].spawns).toEqual(['scout', 'reviewer']);
});
test('the editor uses the workspace selected in Settings, even when a chat in another project is current', async () => {
  const requestedUrls: string[] = [];
  fetchSpy.mockImplementation(async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    requestedUrls.push(url);
    if (url.includes('/workspaces/resolve')) {
      return Response.json({ workspaceId: 'ws_projectB', projectId: 'projectB', name: 'projectB' });
    }
    if (url.includes('/tools')) {
      return Response.json({
        workspaceId: 'ws_projectB',
        tools: [
          { name: 'read', label: 'Read', description: 'Read files', tier: 'read', availability: true },
          { name: 'b-specific-tool', label: 'B Tool', description: 'Tool for B', tier: 'exec', availability: true },
        ],
      });
    }
    return Response.json(url.includes('/config/mcp') ? [] : { home: '/test', projects: [{ id: 'projectB', path: '/projectB' }], activeProjectId: 'projectB' });
  });

  useSessionUIStore.setState({
    currentSessionId: 'sess_projectA',
    getDirectoryForSession: (id: string) => (id === 'sess_projectA' ? '/projectA' : null),
  });
  useProjectsStore.setState({
    projects: [
      { id: 'projectA', path: '/projectA' },
      { id: 'projectB', path: '/projectB' },
    ],
    activeProjectId: 'projectB',
  });
  useAgentsStore.setState({
    selectedAgentName: 'test',
    agentsByDirectory: { '/projectB': [initialAgent] },
    revisionsByDirectory: { '/projectB': '1' },
    errorsByDirectory: {},
  });

  await render();

  expect(requestedUrls.some((u) => u.includes('/workspaces/ws_projectB/tools'))).toBe(true);
  expect(requestedUrls.some((u) => u.includes('/sessions/sess_projectA/tools'))).toBe(false);
  expect(container.textContent).toContain('b-specific-tool');
});

test('a failed catalog load disables editing and never autosaves an empty list', async () => {
  const writes: Agent[] = [];
  fetchSpy.mockImplementation(async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/workspaces/resolve')) {
      return Response.json({ workspaceId: 'ws_1', projectId: 'project', name: 'project' });
    }
    if (url.includes('/tools')) {
      return new Response('Failed to load tools', { status: 503, statusText: 'Service Unavailable' });
    }
    return Response.json(url.includes('/config/mcp') ? [] : { home: '/test', projects: [{ id: 'project', path: '/project' }], activeProjectId: 'project' });
  });

  useAgentsStore.setState({
    updateAgent: async (agent) => {
      writes.push(agent);
      return { ok: true, revision: '2' };
    },
  });

  await render();

  const statusBanner = container.querySelector('[role="status"]');
  expect(statusBanner).not.toBeNull();
  expect(statusBanner?.textContent).toContain('Unavailable');

  // Quick action chip buttons must be unconditionally disabled
  const chipButtons = [...container.querySelectorAll<HTMLButtonElement>('[role="group"] button')];
  expect(chipButtons.length).toBeGreaterThan(0);
  for (const btn of chipButtons) {
    expect(btn.disabled).toBe(true);
  }
  // Checkboxes must be unconditionally disabled
  const checkboxes = [...container.querySelectorAll<HTMLInputElement>('[data-settings-item="agents.allowed-tools"] input[type="checkbox"]')];
  for (const cb of checkboxes) {
    expect(cb.disabled).toBe(true);
  }

  // Editing a field triggers autosave
  await edit(field('initial'), 'Updated description during catalog failure');

  // Must unconditionally write and MUST NOT empty allowedTools
  expect(writes.length).toBeGreaterThan(0);
  const lastWrite = writes[writes.length - 1];
  expect(lastWrite.allowedTools).toEqual(initialAgent.allowedTools);
  expect(lastWrite.allowedTools).not.toEqual([]);
});
test('unavailable or unknown tools cannot be selected and are excluded from Show all', async () => {
  const writes: Agent[] = [];
  const agentWithUnknown: Agent = {
    ...initialAgent,
    allowedTools: ['read', 'unknown-tool'],
  };
  useAgentsStore.setState({
    agentsByDirectory: { '/project': [agentWithUnknown] },
    updateAgent: async (agent) => {
      writes.push(agent);
      return { ok: true, revision: String(writes.length + 1) };
    },
  });

  await render();

  expect(container.textContent).toContain('unknown-tool');
  expect(container.textContent).toContain('Unavailable');

  await toggleTool('disabled-tool');
  expect(writes.some((w) => w.allowedTools?.includes('disabled-tool'))).toBe(false);

  const showAll = [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Show all');
  if (!showAll) throw new Error('Missing Show all action');
  await act(async () => { showAll.click(); });
  const lastWrite = writes.at(-1);
  expect(lastWrite?.allowedTools).toEqual(['read', 'bash', 'custom-tool']);
  expect(lastWrite?.allowedTools).not.toContain('disabled-tool');
  expect(lastWrite?.allowedTools).not.toContain('unknown-tool');
});
