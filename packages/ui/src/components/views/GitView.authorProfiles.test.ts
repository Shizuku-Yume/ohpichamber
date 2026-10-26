import { describe, expect, test } from 'bun:test';
import type { GitIdentityProfile } from '@/lib/api/types';
import { activeRepositoryIdentity, repositoryIdentityChoices } from './git/authorSelection';

const globalIdentity: GitIdentityProfile = { id: 'global', name: 'Global', userName: 'Global Author', userEmail: 'global@example.com' };
const account = { provider: 'github', instance: 'github.com', accountId: 'occred:v1:github:one:r1' } as const;
const work: GitIdentityProfile = { id: 'work', name: 'Work', userName: 'Work Author', userEmail: 'work@example.com', account, transport: 'account' };
const signed: GitIdentityProfile = {
  id: 'signed', name: 'Signed author', userName: 'Signed Author', userEmail: 'signed@example.com',
  account, transport: 'account', signCommits: true, signingKey: '/public/signing.pub',
};
const plain: GitIdentityProfile = { id: 'plain', name: 'Author', userName: 'Plain Author', userEmail: 'plain@example.com', account, transport: 'account' };
const incomplete: GitIdentityProfile = { id: 'legacy', name: 'Legacy', userName: 'Legacy Author', userEmail: 'legacy@example.com' };
// An instance whose accounts have not been read answers null, which keeps its identities offered.
const unreadAccounts = () => null;
const profiles = [work, signed, plain];

// The clone screen no longer chooses an author on its own: it proposes one
// identity, which carries the author with it, and `proposeIdentityForHost`
// owns that rule and its tests.
describe('Git view authors', () => {
  test('offers every author for unrelated HTTPS, SSH, and absent remotes', () => {
    expect(repositoryIdentityChoices(profiles, globalIdentity, unreadAccounts)).toEqual([globalIdentity, ...profiles]);
  });

  test('retains ID deduplication, ordering, and stored signing data', () => {
    expect(repositoryIdentityChoices([signed, work, signed], globalIdentity, unreadAccounts)).toEqual([globalIdentity, signed, work]);
    expect(repositoryIdentityChoices([signed], null, unreadAccounts)[0]).toBe(signed);
    // An identity from an earlier release pushes with the machine's own Git, and is offered.
    expect(repositoryIdentityChoices([incomplete, work], null, unreadAccounts)).toEqual([incomplete, work]);
  });

  test('prefers a matching stored author over a matching global author and preserves signing', () => {
    expect(activeRepositoryIdentity(profiles, { ...globalIdentity, userName: signed.userName, userEmail: signed.userEmail }, {
      userName: signed.userName, userEmail: signed.userEmail,
    })).toBe(signed);
  });

  test('uses the matching global author when no stored author matches', () => {
    expect(activeRepositoryIdentity(profiles, globalIdentity, {
      userName: globalIdentity.userName, userEmail: globalIdentity.userEmail,
    })).toBe(globalIdentity);
  });

  test('derives a local author from name and email without transport fields', () => {
    expect(activeRepositoryIdentity(profiles, globalIdentity, {
      userName: 'Local Author', userEmail: 'local@example.com',
    })).toEqual({
      id: 'local-config', name: 'Local Author', userName: 'Local Author', userEmail: 'local@example.com', color: 'info', icon: 'user',
    });
  });

  test('preserves the global fallback when current author data is absent or incomplete', () => {
    for (const currentIdentity of [null, { userName: 'Incomplete', userEmail: null }]) {
      expect(activeRepositoryIdentity(profiles, globalIdentity, currentIdentity)).toBe(globalIdentity);
    }
    expect(activeRepositoryIdentity([], null, null)).toBeNull();
  });
});
