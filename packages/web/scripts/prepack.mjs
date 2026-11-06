import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareWebAgentRuntime, resolveBunExecutable } from './prepare-agent-runtime.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(webRoot, '../..');
const backupPath = path.join(os.tmpdir(), 'openchamber-web-package-json-backup.json');

export function runPrepack() {
  const bunPath = resolveBunExecutable();

  // 1. Build built-in extensions
  const extensionsScript = path.join(workspaceRoot, 'scripts', 'build-builtin-extensions.mjs');
  if (fs.existsSync(extensionsScript)) {
    const extResult = spawnSync(bunPath, [extensionsScript], { cwd: webRoot, stdio: 'inherit', windowsHide: true });
    if (extResult.status !== 0) throw extResult.error ?? new Error('Building extensions failed');
  }

  // 2. Stage agent runtime if missing or requested
  const runtimeManifest = path.join(webRoot, 'resources', 'agent-runtime', 'manifest.json');
  if (!fs.existsSync(runtimeManifest)) {
    prepareWebAgentRuntime({ bunPath });
  }

  // 3. Backup package.json
  const manifestPath = path.join(webRoot, 'package.json');
  const originalContent = fs.readFileSync(manifestPath, 'utf8');
  fs.writeFileSync(backupPath, originalContent, 'utf8');

  // 4. Transform package.json for clean standalone distribution
  const manifest = JSON.parse(originalContent);
  const sdkManifestPath = path.join(workspaceRoot, 'packages', 'sdk', 'package.json');
  const sdkVersion = JSON.parse(fs.readFileSync(sdkManifestPath, 'utf8')).version || '3.0.0';

  if (manifest.dependencies) {
    delete manifest.dependencies['@openchamber/agent-contract'];
    delete manifest.dependencies['@openchamber/agent-service'];
    manifest.dependencies['@openchamber/sdk'] = `^${sdkVersion}`;
  }
  manifest.bundleDependencies = ['@openchamber/sdk'];

  const files = new Set(manifest.files || []);
  files.add('resources/agent-runtime');
  files.add('scripts/standalone-loader.mjs');
  manifest.files = Array.from(files);

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log('[web] prepared standalone manifest for packing (stripped agent-* and workspace:*)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runPrepack();
}
