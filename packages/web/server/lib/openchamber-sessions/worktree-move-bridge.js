// The session service starts before Git routes register (they need the
// workspace, network and binding owners). Refuse a move until registration
// supplies the worktree pipeline, the stash operations and the bootstrap.
export const createUnregisteredSessionWorktreeMoveBridge = () => ({
 ready: false,
 createWorktree: null,
 removeWorktree: null,
 hydrateCheckout: null,
 waitForWorktreeReady: null,
 bootstrapStore: null,
 stashPush: null,
 getPathsWithoutChanges: null,
 stashApply: null,
 stashDrop: null,
 listStashes: null,
 getBranches: null,
 resolvePrimaryWorktreeRoot: null,
 resolveWorktreeSetup: null,
});

/**
 * Fills the bridge from the Git route registration so a session move uses the
 * same creation pipeline, bootstrap and stash operations the New worktree
 * dialog and the scheduler already go through; nothing here re-implements Git.
 */
export const fillSessionWorktreeMoveBridge = (bridge, dependencies) => {
 if (!(bridge instanceof Object)) return bridge;
 const {
  createWorktree,
  createWorktreeInstanceDisposer: _createWorktreeInstanceDisposer,
  removeWorktree,
  hydrateCheckout,
  bootstrapStore,
  waitForWorktreeReady,
  stashPush,
  getPathsWithoutChanges,
  stashApply,
  stashDrop,
  listStashes,
  getBranches,
  resolvePrimaryWorktreeRoot,
  resolveWorktreeSetup,
 } = dependencies;
 if (![createWorktree, removeWorktree, hydrateCheckout, waitForWorktreeReady, bootstrapStore,
  stashPush, getPathsWithoutChanges, stashApply, stashDrop, listStashes, getBranches,
  resolvePrimaryWorktreeRoot].every((candidate) => candidate instanceof Function || candidate instanceof Object)) {
  return bridge;
 }
 bridge.ready = true;
 bridge.createWorktree = createWorktree;
 bridge.removeWorktree = removeWorktree;
 bridge.hydrateCheckout = hydrateCheckout;
 bridge.waitForWorktreeReady = waitForWorktreeReady;
 bridge.bootstrapStore = bootstrapStore;
 bridge.stashPush = stashPush;
 bridge.getPathsWithoutChanges = getPathsWithoutChanges;
 bridge.stashApply = stashApply;
 bridge.stashDrop = stashDrop;
 bridge.listStashes = listStashes;
 bridge.getBranches = getBranches;
 bridge.resolvePrimaryWorktreeRoot = resolvePrimaryWorktreeRoot;
 bridge.resolveWorktreeSetup = resolveWorktreeSetup
  ?? (async () => ({ startCommand: '', untrustedSkipped: [] }));
 return bridge;
};
