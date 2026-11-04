import { isCompleteIdentity } from '@/lib/api/git-identity';
import type { GitIdentityProfile, SourceControlIdentity } from '@/lib/api/types';
import { activeIdentityFor, identityAccountConnected, selectableIdentities } from '@/lib/source-control/identity';

/**
 * The identities a repository may be given: the machine's own, plus every
 * stored identity that is complete and still answers for a connected account.
 * An instance whose accounts have not been read yet answers `null`, which
 * keeps its identities offered instead of treating "not loaded" as gone.
 */
export const repositoryIdentityChoices = (
  profiles: GitIdentityProfile[],
  systemIdentity: GitIdentityProfile | null | undefined,
  connectedAccountIds: (account: SourceControlIdentity) => string[] | null,
): GitIdentityProfile[] => selectableIdentities(profiles, systemIdentity,
  (profile) => isCompleteIdentity(profile) && identityAccountConnected(profile, connectedAccountIds));

/**
 * The identity the repository acts as. When the repository's author matches no
 * stored identity it is shown as a local identity of its own, because that is
 * what the next commit will sign with.
 */
export const activeRepositoryIdentity = (
  profiles: GitIdentityProfile[],
  systemIdentity: GitIdentityProfile | null | undefined,
  author: { userName?: string | null; userEmail?: string | null } | null | undefined,
  boundAccountId?: string | null,
): GitIdentityProfile | null => activeIdentityFor(profiles, systemIdentity, author, (current) => ({
  id: 'local-config', name: current.userName, ...current, color: 'info', icon: 'user',
}), boundAccountId);
