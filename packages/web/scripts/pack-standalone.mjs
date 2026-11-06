import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runPrepack } from './prepack.mjs';
import { runPostpack } from './postpack.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function packStandalone() {
  const bunPath = process.env.OHPICHAMBER_BUN || 'bun';
  runPrepack();
  try {
    const packResult = spawnSync(bunPath, ['pm', 'pack'], {
      cwd: webRoot,
      stdio: 'inherit',
      windowsHide: true,
    });
    if (packResult.status !== 0) {
      throw packResult.error ?? new Error(`bun pm pack failed with exit code ${packResult.status}`);
    }
  } finally {
    // Postpack will restore original package.json and verify the tarball
    return runPostpack();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  packStandalone();
}
