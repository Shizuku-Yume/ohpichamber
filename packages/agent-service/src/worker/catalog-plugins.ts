import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { getAgentDir, getConfigRootDir, getPluginsDir, getPluginsLockfile, getPluginsPackageJson, getPluginsNodeModules, getProjectPluginOverridesPath, normalizePathForComparison } from '@oh-my-pi/pi-utils';
import { PluginManager, validateSetting } from '@oh-my-pi/pi-coding-agent/extensibility/plugins/manager';
import type { InstalledPlugin } from '@oh-my-pi/pi-coding-agent/extensibility/plugins/types';
import type { MarketplacePluginEntry } from '@oh-my-pi/pi-coding-agent/extensibility/plugins/marketplace';
import {
  MarketplaceManager, buildPluginId, parsePluginId, getInstalledPluginsRegistryPath, getMarketplacesRegistryPath,
  getMarketplacesCacheDir, getPluginsCacheDir
} from '@oh-my-pi/pi-coding-agent/extensibility/plugins/marketplace';
import { clearPluginRootsAndCaches, resolveOrDefaultProjectRegistryPath } from '@oh-my-pi/pi-coding-agent/discovery/helpers';
import {
  MarketplacePluginDetailsSchema, JsonObjectSchema, type JsonObject, type InstalledPluginEntry, type PluginTarget, type PluginSettingDefinition,
  type CatalogWorkerIdentity, type PluginCatalogState, type MarketplaceEntry, type MarketplaceSource,
  type PluginUpdateCheckEntry, type PluginUpgradePreviewEntry, type MarketplacePluginDetails
} from '@openchamber/agent-contract';
import type { NativePluginOperation, NativePluginResult } from '../catalogs/plugins.ts';
import { ProjectionError } from '../projection/journal.ts';
import { PluginLocalSource } from './plugin-local-source.ts';
import { removeTemporaryFile } from './temporary-file.ts';

export interface NativePluginsContext {
  cwd: string;
  worker: CatalogWorkerIdentity;
}
const NativePluginConfigSchema = z.object({
  plugins: z.record(z.string(), z.object({ version: z.string(), enabledFeatures: z.array(z.string()).nullable(), enabled: z.boolean() })).optional(),
  settings: z.record(z.string(), JsonObjectSchema).optional(),
});
const NativePluginPackageSchema = z.object({ dependencies: z.record(z.string(), z.string()).optional() });
const NativePluginOverridesSchema = z.object({
  disabled: z.array(z.string()).optional(),
  features: z.record(z.string(), z.array(z.string())).optional(), settings: z.record(z.string(), JsonObjectSchema).optional()
});

/** Catalog entries also carry install sources; only manifest metadata becomes public detail. */
function marketplaceDetails(entry: MarketplacePluginEntry): { details?: MarketplacePluginDetails } {
  const details: MarketplacePluginDetails = {};
  if (entry.author !== undefined) details.author = entry.author;
  if (entry.homepage !== undefined) details.homepage = entry.homepage;
  if (entry.repository !== undefined) details.repository = entry.repository;
  if (entry.license !== undefined) details.license = entry.license;
  if (entry.keywords !== undefined) details.keywords = entry.keywords;
  if (entry.category !== undefined) details.category = entry.category;
  if (entry.tags !== undefined) details.tags = entry.tags;
  if (entry.commands !== undefined) details.commands = entry.commands;
  if (entry.agents !== undefined) details.agents = entry.agents;
  // Manifest maps are native `Record<string, unknown>`; the contract admits JSON only.
  for (const key of ['hooks', 'mcpServers', 'lspServers', 'dapAdapters'] as const) {
    const value = entry[key];
    if (value !== undefined) Object.assign(details, { [key]: jsonCapability(value) });
  }
  if (Object.keys(details).length === 0) return {};
  return { details: MarketplacePluginDetailsSchema.parse(details) };
}

function jsonCapability(value: string | string[] | Record<string, unknown>): string | string[] | JsonObject {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(item => String(item));
  return JsonObjectSchema.parse(value);
}

function pluginId(target: PluginTarget): string {
  return `plugin-${createHash('sha256').update(JSON.stringify(target)).digest('hex')}`;
}
async function readNativePluginFile<T>(path: string, schema: z.ZodType<T>): Promise<T | null> {
  try { return schema.parse(JSON.parse(await readFile(path, 'utf8'))); }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Native plugin state could not be read');
  }
}

/** Native package and marketplace state are instantiated per operation: their SDK managers cache mutable files. */
export class NativePlugins {
  readonly local: PluginLocalSource;
  constructor(private readonly context: NativePluginsContext) { this.local = new PluginLocalSource(context.cwd); }

  private async managers() {
    // Native SDK fallback-to-empty is not authoritative success for corrupt configuration.
    const runtime = await readNativePluginFile(getPluginsLockfile(), NativePluginConfigSchema) ?? NativePluginConfigSchema.parse({});
    const overrides = await readNativePluginFile(getProjectPluginOverridesPath(this.context.cwd), NativePluginOverridesSchema) ?? NativePluginOverridesSchema.parse({});
    await readNativePluginFile(getPluginsPackageJson(), NativePluginPackageSchema);
    const projectRegistry = await resolveOrDefaultProjectRegistryPath(this.context.cwd);
    const projectRuntime = projectRegistry === undefined ? null : await readNativePluginFile(join(dirname(projectRegistry), 'omp-plugins.lock.json'), NativePluginConfigSchema);
    return {
      runtime, overrides, projectRuntime,
      packages: new PluginManager(this.context.cwd),
      marketplace: new MarketplaceManager({
        marketplacesRegistryPath: getMarketplacesRegistryPath(),
        installedRegistryPath: getInstalledPluginsRegistryPath(),
        projectInstalledRegistryPath: projectRegistry,
        marketplacesCacheDir: getMarketplacesCacheDir(), pluginsCacheDir: getPluginsCacheDir(),
        clearPluginRootsCache: clearPluginRootsAndCaches
      }),
    };
  }

  private async publicPlugin(native: InstalledPlugin, target: PluginTarget, manager: PluginManager,
    globalConfigured: JsonObject, projectConfigured: JsonObject): Promise<InstalledPluginEntry> {
    const configured = JsonObjectSchema.parse(await manager.getPluginSettings(native.name));
    const settings: JsonObject = {};
    const globalSettings: JsonObject = {};
    const settingDefinitions: PluginSettingDefinition[] = [];
    for (const [key, schema] of Object.entries(native.manifest.settings ?? {})) {
      const base = {
        key, description: schema.description ?? '', secret: schema.secret === true, configured: Object.hasOwn(configured, key),
        globalConfigured: Object.hasOwn(globalConfigured, key), overridden: Object.hasOwn(projectConfigured, key)
      };
      switch (schema.type) {
        case 'string': case 'boolean': settingDefinitions.push({ ...base, type: schema.type }); break;
        case 'enum': settingDefinitions.push({ ...base, type: 'enum', values: schema.values }); break;
        case 'number': settingDefinitions.push(Object.assign({ ...base, type: 'number' as const },
          schema.min === undefined ? {} : { min: schema.min }, schema.max === undefined ? {} : { max: schema.max },
          schema.step === undefined ? {} : { step: schema.step })); break;
      }
    }
    for (const definition of settingDefinitions) {
      const value = configured[definition.key];
      if (!definition.secret && value !== undefined) Object.defineProperty(settings, definition.key, { value, enumerable: true, writable: true, configurable: true });
      const globalValue = globalConfigured[definition.key];
      if (!definition.secret && globalValue !== undefined) Object.defineProperty(globalSettings, definition.key, { value: globalValue, enumerable: true, writable: true, configurable: true });
    }
    return {
      id: pluginId(target), target, name: target.name, version: native.version,
      description: native.manifest.description ?? '', scope: target.kind === 'package' || target.scope === 'user' ? 'global' : 'workspace',
      enabled: native.enabled, enabledFeatures: native.enabledFeatures, settingsScope: 'global', globalSettings, settings, settingDefinitions
    };
  }

  async read(revision: string): Promise<PluginCatalogState> {
    const { packages, marketplace, runtime, overrides, projectRuntime } = await this.managers();
    const plugins: InstalledPluginEntry[] = [];
    for (const native of await packages.list()) plugins.push(await this.publicPlugin(native, { kind: 'package', name: native.name }, packages,
      runtime.settings?.[native.name] ?? {}, overrides.settings?.[native.name] ?? {}));
    for (const summary of await marketplace.listInstalledPlugins()) {
      const parsed = parsePluginId(summary.id);
      if (!parsed) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Native marketplace plugin identity is invalid');
      const entry = summary.entries[0];
      if (!entry) continue;
      const native = await packages.getPlugin(parsed.name, { path: entry.installPath });
      if (!native) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Installed marketplace plugin metadata is unavailable');
      const target = { kind: 'marketplace' as const, ...parsed, scope: summary.scope };
      const plugin = await this.publicPlugin(native, target, packages, runtime.settings?.[native.name] ?? {}, overrides.settings?.[native.name] ?? {});
      if (summary.scope === 'project') {
        const state = projectRuntime?.plugins?.[native.name];
        plugin.enabled = entry.enabled !== false && state?.enabled !== false && !overrides.disabled?.includes(native.name);
        plugin.enabledFeatures = overrides.features?.[native.name] ?? state?.enabledFeatures ?? null;
      } else plugin.enabled = entry.enabled !== false && native.enabled;
      plugins.push(plugin);
    }
    const sources = await this.marketplaceSources(marketplace);
    return {
      workspaceId: this.context.worker.workspaceId, revision, plugins, marketplace: await this.marketplaceEntries(marketplace),
      marketplaceSources: sources, availableUpdates: await this.availableUpdates(marketplace),
      localExtensions: (await this.local.list()).map(extensionId => ({ extensionId, relativePath: `.omp/extensions/${extensionId}` })), workers: []
    };
  }

  async operation(operation: NativePluginOperation, revision: string): Promise<NativePluginResult> {
    const workspaceId = this.context.worker.workspaceId;
    if (operation.type === 'plugins.owner') {
      const project = await resolveOrDefaultProjectRegistryPath(this.context.cwd);
      return {
        type: 'plugins.owner', rootPath: normalizePathForComparison(getPluginsDir()),
        localSourcePath: normalizePathForComparison(join(this.context.cwd, '.omp', 'extensions')),
        projectRegistryPath: project === undefined ? null : normalizePathForComparison(project)
      };
    }
    if (operation.type === 'plugins.read') return { type: 'plugins.catalog', catalog: await this.read(revision) };
    if (operation.type === 'plugins.local.read') return {
      type: 'plugins.local', result: {
        workspaceId, revision,
        extension: { extensionId: operation.extensionId, relativePath: `.omp/extensions/${operation.extensionId}` }, content: await this.local.read(operation.extensionId)
      }
    };
    if (operation.type === 'plugins.local.write') {
      await this.read(revision);
      await this.local.write(operation.request.extensionId, operation.request.content);
      return { type: 'plugins.catalog', catalog: await this.read(revision) };
    }
    if (operation.type === 'plugins.local.delete') {
      await this.read(revision);
      await this.local.delete(operation.request.extensionId);
      return { type: 'plugins.catalog', catalog: await this.read(revision) };
    }
    if (operation.type === 'plugins.apply') return {
      type: 'plugins.applied', result: {
        worker: this.context.worker,
        outcome: 'failed', appliedRevision: null, error: {
          code: 'RELOAD_REQUIRED',
          detail: 'The native SDK cannot reload extension modules in an active session. Open a new session to load committed plugins.', retryable: false
        }
      }
    };
    const { packages, marketplace } = await this.managers();
    if (operation.type === 'plugins.doctor') {
      const privateRoots = [getPluginsDir(), getConfigRootDir(), getAgentDir(), this.context.cwd, dirname(getMarketplacesRegistryPath()), getMarketplacesCacheDir(), getPluginsCacheDir()].sort((left, right) => right.length - left.length);
      const checks = (await packages.doctor()).map(check => {
        let message = check.message;
        for (const root of privateRoots) message = message.replaceAll(root, '[native plugin location]');
        return { ...check, message };
      });
      return { type: 'plugins.doctor', result: { workspaceId, revision, checks } };
    }
    if (operation.type === 'plugins.marketplace') return {
      type: 'plugins.marketplace', result: {
        workspaceId, revision, entries: await this.marketplaceEntries(marketplace),
        sources: await this.marketplaceSources(marketplace), updates: await this.availableUpdates(marketplace)
      }
    };
    if (operation.type === 'plugins.marketplace.checkUpdates') return {
      type: 'plugins.updateCheck',
      result: { workspaceId, revision, updates: await this.availableUpdates(marketplace) }
    };
    if (operation.type === 'plugins.marketplace.manage' && operation.request.action === 'list') {
      return { type: 'plugins.marketplaceSources', result: { workspaceId, revision, sources: await this.marketplaceSources(marketplace) } };
    }
    if (operation.type === 'plugins.marketplace.previewUpgrade') {
      return { type: 'plugins.upgradePreview', result: { workspaceId, revision, preview: await this.previewUpgrades(marketplace, operation.request.target) } };
    }
    try {
      switch (operation.type) {
        case 'plugins.marketplace.manage': {
          const request = operation.request;
          // `list` is handled above as a read; the baseline documents why the
          // narrowing exists so a future native action cannot silently fall here.
          if (request.action === 'list') throw new ProjectionError(400, 'INVALID_REQUEST', 'Marketplace listing is a cached read');
          if (request.action === 'add') await marketplace.addMarketplace(request.source);
          else if (request.action === 'remove') {
            if ((await marketplace.listMarketplaces()).some(source => source.name === request.name)) await marketplace.removeMarketplace(request.name);
          } else if (request.name === undefined) await marketplace.updateAllMarketplaces();
          else await marketplace.updateMarketplace(request.name);
          break;
        }
        case 'plugins.marketplace.upgradeAll': await marketplace.upgradeAllPlugins(); break;
      }
    } catch (error) {
      if (error instanceof ProjectionError) throw error;
      throw new ProjectionError(400, 'INVALID_REQUEST', 'Native marketplace operation failed. Check the source, name and network access.');
    }
    if (operation.type === 'plugins.marketplace.manage' || operation.type === 'plugins.marketplace.upgradeAll') {
      clearPluginRootsAndCaches();
      return { type: 'plugins.catalog', catalog: await this.read(revision) };
    }
    try {
      if ('request' in operation && 'target' in operation.request) {
        const target = operation.request.target;
        if (target.kind === 'package' && !/^(?:@[a-zA-Z0-9-~][a-zA-Z0-9-._~]*\/)?[a-zA-Z0-9-~][a-zA-Z0-9-._~]*$/.test(target.name)) {
          throw new ProjectionError(400, 'INVALID_REQUEST', 'Native plugin package name is invalid');
        }
        if (target.kind === 'marketplace') buildPluginId(target.name, target.marketplace);
      }
      switch (operation.type) {
        case 'plugins.install': {
          const source = operation.request.source;
          if (source.kind === 'package') await packages.install(source.spec);
          else await marketplace.installPlugin(source.name, source.marketplace, { scope: source.scope });
          break;
        }
        case 'plugins.uninstall': {
          const target = operation.request.target;
          if (target.kind === 'package') await packages.uninstall(target.name);
          else await marketplace.uninstallPlugin(buildPluginId(target.name, target.marketplace), target.scope);
          break;
        }
        case 'plugins.update': {
          const target = operation.request.target;
          if (target.kind === 'package') await packages.upgrade(target.name);
          else await marketplace.upgradePlugin(buildPluginId(target.name, target.marketplace), target.scope);
          break;
        }
        case 'plugins.configure': {
          const { target, enabled, settings } = operation.request;
          let native: InstalledPlugin | undefined;
          if (target.kind === 'package') native = await packages.getPlugin(target.name, { path: join(getPluginsNodeModules(), target.name) });
          else {
            const summary = (await marketplace.listInstalledPlugins()).find(item => item.id === buildPluginId(target.name, target.marketplace) && item.scope === target.scope);
            const entry = summary?.entries[0];
            if (entry) native = await packages.getPlugin(target.name, { path: entry.installPath });
          }
          if (!native) throw new ProjectionError(404, 'INVALID_REQUEST', 'Plugin is not installed');
          if (settings !== undefined && operation.request.settingsScope !== 'global') throw new ProjectionError(400, 'INVALID_REQUEST', 'Plugin settings writes must explicitly select global scope');
          for (const [key, value] of Object.entries(settings ?? {})) {
            const schema = native.manifest.settings?.[key];
            if (!native.manifest.settings || !Object.hasOwn(native.manifest.settings, key) || !schema || !validateSetting(value, schema).valid) {
              throw new ProjectionError(400, 'INVALID_REQUEST', 'Plugin setting does not match its native definition');
            }
          }
          const projectRegistry = await resolveOrDefaultProjectRegistryPath(this.context.cwd);
          const paths = [getPluginsLockfile(), getProjectPluginOverridesPath(this.context.cwd), getInstalledPluginsRegistryPath(),
          ...(projectRegistry === undefined ? [] : [projectRegistry, join(dirname(projectRegistry), 'omp-plugins.lock.json')])];
          const snapshots = new Map<string, string | null>();
          for (const path of paths) {
            try { snapshots.set(path, await readFile(path, 'utf8')); }
            catch (error) {
              if (error instanceof Error && 'code' in error && error.code === 'ENOENT') snapshots.set(path, null);
              else throw error;
            }
          }
          try {
            if (settings !== undefined) {
              for (const [key, definition] of Object.entries(native.manifest.settings ?? {})) {
                if (definition.secret !== true && !Object.hasOwn(settings, key)) await packages.deletePluginSetting(native.name, key);
              }
              for (const [key, value] of Object.entries(settings)) await packages.setPluginSetting(native.name, key, value);
            }
            if (enabled !== undefined) {
              if (target.kind === 'package') await packages.setEnabled(native.name, enabled);
              else await marketplace.setPluginEnabled(buildPluginId(target.name, target.marketplace), enabled, target.scope);
            }
          } catch (error) {
            let rollbackFailed = false;
            for (const [path, source] of snapshots) {
              try {
                if (source !== null) await this.atomicConfiguration(path, source);
                else try { await unlink(path); } catch (failure) { if (!(failure instanceof Error && 'code' in failure && failure.code === 'ENOENT')) throw failure; }
              } catch { rollbackFailed = true; }
            }
            clearPluginRootsAndCaches();
            if (rollbackFailed) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Native plugin configuration rollback could not restore every prior file');
            throw error;
          }
          break;
        }
      }
    } catch (error) {
      if (error instanceof ProjectionError) throw error;
      throw new ProjectionError(400, 'INVALID_REQUEST', 'Native plugin operation failed. Check the plugin identity, source and diagnostics.');
    }
    clearPluginRootsAndCaches();
    return { type: 'plugins.catalog', catalog: await this.read(revision) };
  }
  private async marketplaceEntries(manager: MarketplaceManager): Promise<MarketplaceEntry[]> {
    const entries: MarketplaceEntry[] = [];
    for (const registry of await manager.listMarketplaces()) {
      for (const entry of await manager.listAvailablePlugins(registry.name)) {
        entries.push({
          marketplace: registry.name, name: entry.name, description: entry.description ?? '', version: entry.version ?? null,
          ...marketplaceDetails(entry),
        });
      }
    }
    return entries;
  }
  /** Registry entries are the configured catalog sources; reading them never fetches. */
  private async marketplaceSources(manager: MarketplaceManager): Promise<MarketplaceSource[]> {
    return (await manager.listMarketplaces()).map(source => ({
      name: source.name, sourceType: source.sourceType, sourceUri: source.sourceUri,
      catalogPath: source.catalogPath, addedAt: source.addedAt, updatedAt: source.updatedAt
    }));
  }
  /** Cached-registry update check; the native manager compares installed versions to catalog versions. */
  private async availableUpdates(manager: MarketplaceManager): Promise<PluginUpdateCheckEntry[]> {
    const updates: PluginUpdateCheckEntry[] = [];
    for (const update of await manager.checkForUpdates()) {
      const parsed = parsePluginId(update.pluginId);
      if (!parsed) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Native marketplace plugin identity is invalid');
      updates.push({
        pluginId: update.pluginId, scope: update.scope === 'user' ? 'global' : 'workspace',
        target: { kind: 'marketplace', name: parsed.name, marketplace: parsed.marketplace, scope: update.scope },
        from: update.from, to: update.to
      });
    }
    return updates;
  }
  /** Native preview validates the real upgrade, so a rejected plugin is a failure, not an empty preview. */
  private async previewUpgrades(manager: MarketplaceManager, target: PluginTarget | undefined): Promise<PluginUpgradePreviewEntry[]> {
    const rows: PluginUpgradePreviewEntry[] = [];
    if (target !== undefined) {
      if (target.kind !== 'marketplace') throw new ProjectionError(400, 'INVALID_REQUEST', 'Native marketplace previews require a marketplace plugin target');
      const pluginId = buildPluginId(target.name, target.marketplace);
      for (const row of await manager.previewUpgradePlugin(pluginId, target.scope)) {
        rows.push({
          pluginId, scope: row.scope === 'user' ? 'global' : 'workspace',
          target: { kind: 'marketplace', name: target.name, marketplace: target.marketplace, scope: row.scope },
          from: row.from ?? null, to: row.to ?? null, change: row.change ?? null
        });
      }
      return rows;
    }
    for (const row of await manager.previewUpgradeAllPlugins()) {
      const parsed = parsePluginId(row.pluginId);
      if (!parsed) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Native marketplace plugin identity is invalid');
      rows.push({
        pluginId: row.pluginId, scope: row.scope === 'user' ? 'global' : 'workspace',
        target: { kind: 'marketplace', name: parsed.name, marketplace: parsed.marketplace, scope: row.scope },
        from: row.from, to: row.to, change: 'upgrade'
      });
    }
    return rows;
  }

  private async atomicConfiguration(path: string, source: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, source, { flag: 'wx', mode: 0o600 });
      await rename(temporary, path);
    } finally { await removeTemporaryFile(temporary); }
  }
}
