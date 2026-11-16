import {
  JsonValueSchema,
  OmpSettingIdSchema,
  OmpSettingSchema,
  OmpSettingsStateSchema,
  type OmpSetting,
  type OmpSettingsState,
  type OmpSettingsUpdateRequest,
} from '@openchamber/agent-contract';
import { orderedSettings } from '@oh-my-pi/pi-coding-agent/config/all-settings';
import { lookup, type AnySetting } from '@oh-my-pi/pi-coding-agent/config/registry';
import './suggestion.ts';
import { ProjectionError } from '../projection/journal.ts';
import { OMP_SETTING_EXPOSED_IDS, OMP_SETTING_PLACEMENTS, presentOmpSetting } from './settings-ui.ts';
import { join } from 'node:path';
import type { Settings } from '@oh-my-pi/pi-coding-agent/config/settings';

const byId = new Map<string, AnySetting>();

/**
 * The settings route is a view over OMP's own registry. It never
 * declares a second schema: ids, types, defaults, enum values and UI metadata
 * come from the pinned package.
 */
function handle(id: string): AnySetting {
  let setting = byId.get(id);
  if (setting === undefined) {
    setting = lookup(id) ?? orderedSettings().find(candidate => candidate.id === id);
    if (setting === undefined) throw new ProjectionError(400, 'INVALID_REQUEST', `Unknown OMP setting ${id}`);
    if (setting.isCredential) throw new ProjectionError(422, 'UNSUPPORTED_CAPABILITY', `OMP setting ${id} is credential-backed`);
    byId.set(id, setting);
  }
  return setting;
}

function descriptor(setting: AnySetting, settings: Settings): OmpSetting {
  const ui = setting.ui;
  const options = ui?.options;
  const list = Array.isArray(options)
    ? options.map(option => ({ value: String(option.value), label: option.label, description: option.description }))
    : undefined;
  const rawValue = setting.layered(settings);
  const rawDefault = setting.definition.default;
  const id = OmpSettingIdSchema.parse(setting.id);
  const presentation = presentOmpSetting(id, ui?.condition, settings);
  const descriptor: OmpSetting = {
    id,
    type: setting.definition.type,
    value: rawValue === undefined ? null : JsonValueSchema.parse(rawValue),
    default: rawDefault === undefined ? null : JsonValueSchema.parse(rawDefault),
    configured: setting.isConfigured(settings),
    placement: presentation.placement,
  };
  if (presentation.condition !== undefined) {
    descriptor.condition = presentation.condition;
    descriptor.conditionActive = presentation.conditionActive ?? true;
  }
  if (setting.enumValues !== undefined) descriptor.enumValues = [...setting.enumValues];
  if (list !== undefined) descriptor.options = list;
  if (ui?.label !== undefined) descriptor.label = ui.label;
  if (ui?.description !== undefined) descriptor.description = ui.description;
  if (ui?.group !== undefined) descriptor.group = ui.group;
  if (ui?.tab !== undefined) descriptor.tab = ui.tab;
  return OmpSettingSchema.parse(descriptor);
}

/** The config file the settings write, shown so the page can offer it. OMP reads it inside the agent directory. */
const OMP_CONFIG_FILENAME = 'config.yml';

/**
 * What the OMP page leaves out, split by reason.
 *
 * The page cannot count these itself: `tui-only` and `boundary` rows are absent
 * from {@link OmpSettingsState} because no control draws them. The placement
 * table is the only authority on where a row went, so `tuiOnly` and `boundary`
 * count every registry row; `elsewhere` counts the rows state actually carries
 * for another Settings page, which is a subset of the `page`/`owned-by` rows
 * (a page with no GUI control stays in config.yml).
 */
function countPlacement(all: readonly AnySetting[], exposed: readonly AnySetting[]): OmpSettingsState['placementCounts'] {
  let tuiOnly = 0;
  let boundary = 0;
  let elsewhere = 0;
  for (const row of all) {
    const placement = OMP_SETTING_PLACEMENTS[row.id];
    if (placement?.type === 'tui-only') tuiOnly += 1;
    else if (placement?.type === 'boundary') boundary += 1;
  }
  for (const row of exposed) {
    const placement = OMP_SETTING_PLACEMENTS[row.id];
    if (placement?.type === 'page' || placement?.type === 'owned-by') elsewhere += 1;
  }
  return { tuiOnly, boundary, elsewhere };
}

export class NativeSettings {
  private readonly configFilePath: string | undefined;

  constructor(private readonly settings: Settings, agentDirectory?: string) {
    this.configFilePath = agentDirectory === undefined ? undefined : join(agentDirectory, OMP_CONFIG_FILENAME);
  }

  private state(workspaceId: string, revision: string): OmpSettingsState {
    const all = orderedSettings();
    const exposed = all.filter(s => !s.isCredential && OMP_SETTING_EXPOSED_IDS.has(s.id));
    return OmpSettingsStateSchema.parse({
      workspaceId,
      revision,
      ...(this.configFilePath === undefined ? {} : { configPath: this.configFilePath }),
      totalCount: all.length,
      placementCounts: countPlacement(all, exposed),
      settings: exposed.map(s => descriptor(s, this.settings)),
    });
  }

  async read(workspaceId: string, revision: string): Promise<OmpSettingsState> {
    await this.settings.reloadFromDisk();
    return this.state(workspaceId, revision);
  }

  async write(workspaceId: string, revision: string, request: OmpSettingsUpdateRequest): Promise<OmpSettingsState> {
    await this.settings.reloadFromDisk();
    // Only the settings a GUI owner draws or writes are exposed: any other id is
    // refused here, so the route cannot reach a setting no surface owns.
    for (const change of request.changes) {
      if (!OMP_SETTING_EXPOSED_IDS.has(change.id)) {
        throw new ProjectionError(400, 'INVALID_REQUEST', `OMP setting ${change.id} is not exposed`);
      }
    }
    // Validate every value against the pinned definition before changing any
    // layer. `assertWritable` runs OMP's own validate/normalize checks, so the
    // route cannot invent a looser schema for numbers, enums, records or arrays.
    for (const change of request.changes) {
      const setting = handle(change.id);
      if (change.value === null) continue;
      try { setting.assertWritable(change.value); }
      catch (error) {
        throw new ProjectionError(400, 'INVALID_REQUEST', error instanceof Error ? error.message : `Invalid value for ${change.id}`);
      }
    }
    try {
      for (const change of request.changes) {
        const setting = handle(change.id);
        if (change.value === null) setting.unset(this.settings);
        else setting.set(this.settings, change.value);
      }
    } catch (error) {
      // `set`/`unset` can still fail after validation if a definition normalizes
      // or stages later. Reload so a partial staged write is retried/read from
      // disk instead of staying invisible to this instance.
      await this.settings.reloadFromDisk().catch(() => undefined);
      if (error instanceof ProjectionError) throw error;
      throw new ProjectionError(400, 'INVALID_REQUEST', error instanceof Error ? error.message : 'OMP settings could not be written');
    }
    try { await this.settings.flush(); }
    catch {
      // OMP keeps failed writes pending and retries them on the next flush;
      // reloading here retries that flush. Report the failure instead of
      // claiming success; the next read reflects whichever state persisted.
      await this.settings.reloadFromDisk().catch(() => undefined);
      throw new ProjectionError(503, 'INTERNAL_ERROR', 'OMP settings could not be persisted');
    }
    await this.settings.reloadFromDisk();
    return this.state(workspaceId, revision);
  }
}
