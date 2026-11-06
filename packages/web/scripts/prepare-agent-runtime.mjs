import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareAgentRuntime } from '../../electron/scripts/prepare-agent-runtime.mjs';
import { verifyAgentPayload } from '../../electron/scripts/verify-agent-runtime.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(webRoot, '../..');

export function resolveBunExecutable(specified) {
  if (specified && path.isAbsolute(specified) && fs.existsSync(specified)) return specified;
  if (process.env.OHPICHAMBER_BUN && fs.existsSync(process.env.OHPICHAMBER_BUN)) return process.env.OHPICHAMBER_BUN;
  if (typeof globalThis.Bun !== 'undefined') return process.execPath;
  try {
    const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['bun'], { encoding: 'utf8', windowsHide: true });
    if (which.status === 0 && which.stdout.trim()) {
      const line = which.stdout.trim().split(/\r?\n/)[0];
      if (fs.existsSync(line)) return line;
    }
  } catch { }
  return 'bun';
}

export function prepareWebAgentRuntime({
  bunPath = resolveBunExecutable(),
  output = path.join(webRoot, 'resources', 'agent-runtime'),
} = {}) {
  const resolvedBun = resolveBunExecutable(bunPath);
  // Ensure the guest SDK dist is fresh before staging so the web surface matches.
  const sdkDir = path.join(workspaceRoot, 'packages', 'sdk');
  const sdkBuild = spawnSync(resolvedBun, ['run', 'build'], { cwd: sdkDir, stdio: 'inherit', windowsHide: true });
  if (sdkBuild.status !== 0) {
    throw sdkBuild.error ?? new Error('Building @openchamber/sdk failed');
  }

  const staged = prepareAgentRuntime({ bunPath: resolvedBun, output });
  const verification = verifyAgentPayload(staged);
  console.log(`[web] verified Agent runtime payload (bun ${verification.bunVersion}, ${verification.packageCount} packages)`);
  return staged;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const staged = prepareWebAgentRuntime();
  console.log(`[web] staged Agent runtime: ${staged}`);
}
