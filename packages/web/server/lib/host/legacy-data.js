import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// OpenCode v1.2.25 resolves its data directory the same way on every platform:
// packages/opencode/src/global/index.ts joins `xdgData` from `xdg-basedir` with
// "opencode". `xdg-basedir` uses XDG_DATA_HOME verbatim and falls back to ~/.local/share.
export const openCodeDataDirectory = ({ env = process.env, homeDirectory = os.homedir() } = {}) => {
  const dataHome = env.XDG_DATA_HOME || (homeDirectory ? path.join(homeDirectory, '.local', 'share') : null);
  return dataHome ? path.join(dataHome, 'opencode') : null;
};

export const hasLegacyOpenCodeData = ({ existsSync = fs.existsSync, ...options } = {}) => {
  const directory = openCodeDataDirectory(options);
  return directory !== null && existsSync(directory);
};
