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

  // 2. Stage standalone @openchamber/sdk copy (outside node_modules so package-level node_modules stays clean)
  const sdkSource = path.join(workspaceRoot, 'packages', 'sdk');
  const sdkTarget = path.join(webRoot, 'resources', 'standalone-sdk');
  if (fs.existsSync(path.join(sdkSource, 'dist'))) {
    fs.rmSync(sdkTarget, { recursive: true, force: true });
    fs.mkdirSync(sdkTarget, { recursive: true });
    fs.copyFileSync(path.join(sdkSource, 'package.json'), path.join(sdkTarget, 'package.json'));
    fs.cpSync(path.join(sdkSource, 'dist'), path.join(sdkTarget, 'dist'), { recursive: true });
  }

  // 3. Stage agent runtime unless running lightweight unit-test pack checks under Vitest
  const runtimeManifest = path.join(webRoot, 'resources', 'agent-runtime', 'manifest.json');
  if (!fs.existsSync(runtimeManifest) && process.env.VITEST !== 'true') {
    prepareWebAgentRuntime({ bunPath });
  }

  // 4. Backup package.json once (idempotent if prepack is invoked nested)
  const manifestPath = path.join(webRoot, 'package.json');
  const currentContent = fs.readFileSync(manifestPath, 'utf8');
  const originalContent = fs.existsSync(backupPath)
    ? fs.readFileSync(backupPath, 'utf8')
    : currentContent;
  if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, originalContent, 'utf8');
  }

  // 5. Transform package.json for clean standalone distribution
  const manifest = JSON.parse(originalContent);
  if (manifest.dependencies) {
    delete manifest.dependencies['@openchamber/agent-contract'];
    delete manifest.dependencies['@openchamber/agent-service'];
    delete manifest.dependencies['@openchamber/sdk'];
  }
  delete manifest.bundleDependencies;
  const files = new Set(manifest.files || []);
  files.add('resources/agent-runtime');
  files.add('resources/standalone-sdk');
  files.add('scripts/standalone-loader.mjs');
  manifest.files = Array.from(files);

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log('[web] prepared standalone manifest for packing (stripped workspace:* dependencies)');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runPrepack();
}
