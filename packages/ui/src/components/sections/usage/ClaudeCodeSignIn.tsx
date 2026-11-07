import React from 'react';
import type { ProviderOAuthMethods as Methods } from '@openchamber/agent-contract';
import { canonicalClient } from '@/api/canonicalClient';
import { useSettingsDirectory } from '@/hooks/useSettingsDirectory';
import { useEnterpriseMode } from '@/stores/useEnterprisePolicyStore';
import { ProviderOAuthMethods } from '@/components/sections/providers/ProviderOAuthMethods';
import { oauthMethodsForProvider } from '@/components/sections/providers/providerAuth';
import { useI18n } from '@/lib/i18n';

/**
 * Claude usage reads the credential OMP stores for the native `anthropic`
 * provider, so a missing login is fixed by signing that provider in — the same
 * native OAuth flow Providers shows. The quota product id (`claude`) and the
 * native provider it reads are different identities (see
 * `QUOTA_PROVIDER_RELATIONS` on the Host), which is why the methods are matched
 * on `storeCredentialsAs`.
 *
 * Enterprise mode keeps provider entry on the administrator's side, so the
 * flow is never offered there; the caller states the refusal in words instead.
 */
const CLAUDE_NATIVE_PROVIDER_ID = 'anthropic';

type Lookup =
  | { state: 'loading' }
  | { state: 'ready'; workspaceId: string; revision: string; methods: Methods['methods'] };

interface ClaudeCodeSignInProps {
  /** Runs once Claude holds a login again, so the caller can re-read usage. */
  onSignedIn: () => void | Promise<void>;
}

export const ClaudeCodeSignIn: React.FC<ClaudeCodeSignInProps> = ({ onSignedIn }) => {
  const { t } = useI18n();
  const directory = useSettingsDirectory();
  const enterprise = useEnterpriseMode();
  const [lookup, setLookup] = React.useState<Lookup>({ state: 'loading' });

  React.useEffect(() => {
    if (enterprise || !directory) {
      setLookup({ state: 'loading' });
      return;
    }
    const abort = new AbortController();
    let active = true;
    void (async () => {
      try {
        const workspace = await canonicalClient.resolveWorkspace(directory, { signal: abort.signal });
        const [catalog, providers] = await Promise.all([
          canonicalClient.providerOAuthMethods(workspace.workspaceId),
          canonicalClient.getProviders(workspace.workspaceId),
        ]);
        if (!active || abort.signal.aborted) return;
        setLookup({
          state: 'ready',
          workspaceId: workspace.workspaceId,
          revision: providers.revision,
          methods: oauthMethodsForProvider(catalog.methods, CLAUDE_NATIVE_PROVIDER_ID),
        });
      } catch (error) {
        if (!active || abort.signal.aborted) return;
        console.error('Failed to load the Claude sign-in:', error);
        setLookup({ state: 'ready', workspaceId: '', revision: '0', methods: [] });
      }
    })();
    return () => {
      active = false;
      abort.abort();
    };
  }, [directory, enterprise]);

  if (enterprise) return null;
  if (lookup.state === 'loading') return null;

  // Without a native OAuth method the terminal command is still the fix that
  // works, and it is the only instruction a reader needs here.
  if (lookup.methods.length === 0) {
    return (
      <div className="mt-1 space-y-1.5">
        <p className="typography-meta text-[var(--status-warning)]/80">{t('settings.usage.page.state.claudeSignInCommand')}</p>
        <code className="typography-code block whitespace-pre-wrap break-all rounded bg-muted/50 px-2 py-1.5 text-xs text-foreground">
          {'claude auth login'}
        </code>
      </div>
    );
  }

  return (
    <ProviderOAuthMethods
      key={`${lookup.workspaceId}:${lookup.methods.map((method) => method.methodId).join(',')}`}
      workspaceId={lookup.workspaceId}
      revision={lookup.revision}
      methods={lookup.methods}
      onConnected={onSignedIn}
      className="mt-3"
    />
  );
};
