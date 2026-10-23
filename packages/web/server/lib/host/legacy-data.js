import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const openCodeDataDirectory = ({ platform = process.platform, env = process.env, homeDirectory = os.homedir() } = {}) => {
  if (platform === 'win32') {
    const appData = env.APPDATA?.trim();
    return appData ? path.join(appData, 'opencode') : null;
  }
  if (!homeDirectory) return null;
  if (platform === 'darwin') return path.join(homeDirectory, 'Library', 'Application Support', 'opencode');
  const dataHome = env.XDG_DATA_HOME?.trim() || path.join(homeDirectory, '.local', 'share');
  return path.join(dataHome, 'opencode');
};

export const hasLegacyOpenCodeData = ({ existsSync = fs.existsSync, ...options } = {}) => {
  const directory = openCodeDataDirectory(options);
  return directory !== null && existsSync(directory);
};
