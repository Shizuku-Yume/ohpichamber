import { formatModelString } from '@oh-my-pi/pi-coding-agent/config/model-resolver';
import { cfgModelRoles } from '@oh-my-pi/pi-coding-agent/config/model-settings';
import { cfgRetryModelFallback } from '@oh-my-pi/pi-coding-agent/session/settings';
import type { AgentSession } from '@oh-my-pi/pi-coding-agent/session/agent-session';
import type { Settings } from '@oh-my-pi/pi-coding-agent/config/settings';

type AutoTitleSession = Pick<AgentSession, 'model' | 'generateTitle'>;

/**
 * Run OMP's title generator with one candidate: the session's selected model.
 *
 * OMP's default title candidates include the `tiny`, `commit` and `smol` roles
 * plus their fallback chains, which may point at another connected provider.
 * The Host authorizes provider use per credential release; a title must never
 * leave the selected provider, so this scopes those roles to the selected model
 * and disables model fallback for the request. The caller authorizes that model
 * before this function releases any credential.
 */
export async function generateSelectedModelTitle(input: {
  session: AutoTitleSession;
  settings: Settings;
  firstMessage: string;
  authorize: (model: NonNullable<AutoTitleSession['model']>) => Promise<void>;
  signal?: AbortSignal;
}): Promise<string | null> {
  const model = input.session.model;
  if (!model) return null;
  const selector = formatModelString(model);
  const previousRoles = { ...cfgModelRoles.get(input.settings) };
  const previousFallback = cfgRetryModelFallback.get(input.settings);
  const fallbackProvenance = input.settings.getProvenance(cfgRetryModelFallback);
  cfgModelRoles.override(input.settings, {
    ...previousRoles,
    tiny: selector,
    commit: selector,
    smol: selector,
  });
  cfgRetryModelFallback.override(input.settings, false);
  try {
    await input.authorize(model);
    const title = await input.session.generateTitle(input.firstMessage, undefined, input.signal);
    return title?.trim() || null;
  } finally {
    cfgModelRoles.override(input.settings, previousRoles);
    if (fallbackProvenance === 'runtime') cfgRetryModelFallback.override(input.settings, previousFallback);
    else cfgRetryModelFallback.clearOverride(input.settings);
  }
}
