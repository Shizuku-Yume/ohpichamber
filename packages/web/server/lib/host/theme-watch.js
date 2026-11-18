import { watch } from 'node:fs';

const SAFETY_POLL_MS = 30_000;
const POLL_MS = 1000;

/** Signals only request a fingerprint check; two equal checks settle a change. */
const createFolderChangeWatch = ({
 root,
 fingerprint,
 onChange,
 pollMs = POLL_MS,
 recursive = false,
 fsWatch = watch,
 timers = globalThis,
 logger = console,
}) => {
 let watcher = null;
 let pending = null;
 let running = null;
 let stopped = false;
 let reported = null;
 let seen = null;

 const schedule = () => {
  if (stopped || pending !== null) return;
  pending = timers.setTimeout(() => {
   pending = null;
   return check();
  }, pollMs);
  pending.unref?.();
 };

 const check = () => {
  if (stopped) return Promise.resolve();
  if (running) {
   schedule();
   return running;
  }
  running = (async () => {
   try {
    const current = await fingerprint();
    if (stopped) return;
    if (reported === null) {
     reported = seen = current;
     return;
    }
    const settled = current === seen;
    seen = current;
    if (!settled) schedule();
    else if (current !== reported) {
     reported = current;
     onChange();
    }
   } catch (error) {
    logger.warn('Failed to check a watched folder:', error?.message ?? error);
   } finally {
    running = null;
    if (!watcher) schedule();
   }
  })();
  return running;
 };

 const closeWatcher = () => {
  const previous = watcher;
  watcher = null;
  previous?.close();
 };

 const arm = () => {
  closeWatcher();
  if (stopped) return;
  try {
   const next = fsWatch(root, { recursive, persistent: false }, schedule);
   watcher = next;
   next.on('error', () => {
    if (watcher !== next) return;
    closeWatcher();
    schedule();
   });
   next.on('close', () => {
    if (watcher !== next) return;
    watcher = null;
    schedule();
   });
  } catch {
   // An unsupported watch or missing root keeps the previous fast cadence.
   schedule();
  }
 };

 // Reopening also replaces a silently stale Linux/Windows inode watch.
 arm();
 const ready = check();
 const safety = timers.setInterval(() => {
  arm();
  return check();
 }, SAFETY_POLL_MS);
 safety.unref?.();

 return {
  ready,
  check,
  stop: () => {
   stopped = true;
   closeWatcher();
   timers.clearTimeout(pending);
   pending = null;
   timers.clearInterval(safety);
  },
 };
};

/**
 * Watches the custom themes folder and calls `onChange()` when its theme files
 * were added, removed or rewritten and then held still for one check, so a file
 * caught mid-write is never announced.
 *
 * Folder signals trigger checks. A slow safety poll reopens the watcher after
 * folder recreation; unavailable watchers retain the fast polling cadence.
 *
 * The first look is taken at once, before any client reads the themes, so a
 * change right after start is compared against it and announced. `ready`
 * settles when that look is done.
 */
export const createThemeFolderWatch = ({
 fsPromises,
 path,
 themesDir,
 onChange,
 pollMs = POLL_MS,
 logger = console,
 fsWatch,
 timers,
}) => {
 const fingerprint = async () => {
  const names = await fsPromises.readdir(themesDir).catch(() => []);
  const themes = names.filter((name) => name.toLowerCase().endsWith('.json')).sort();
  const stamps = await Promise.all(themes.map((name) => fsPromises.stat(path.join(themesDir, name)).then(
   (stat) => `${stat.mtimeMs}:${stat.size}`,
   () => 'missing',
  )));
  return themes.map((name, index) => `${name}=${stamps[index]}`).join('\n');
 };

 return createFolderChangeWatch({ root: themesDir, fingerprint, onChange, pollMs, logger, fsWatch, timers });
};
