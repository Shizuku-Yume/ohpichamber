import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { verifyAgentPayload } from '../../electron/scripts/verify-agent-runtime.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(webRoot, '../..');
const backupPath = path.join(os.tmpdir(), 'openchamber-web-package-json-backup.json');

export function runPostpack() {
  // 1. Always restore original package.json first to leave the worktree clean
  const manifestPath = path.join(webRoot, 'package.json');
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, manifestPath);
    fs.rmSync(backupPath, { force: true });
    console.log('[web] restored original package.json workspace dependencies');
  }

  // 2. Locate generated tarball
  const candidates = [
    path.join(webRoot, 'openchamber-web-3.0.0.tgz'),
    path.join(workspaceRoot, 'openchamber-web-3.0.0.tgz'),
  ];
  const tarballPath = candidates.find((file) => fs.existsSync(file));
  if (!tarballPath) {
    console.warn('[web] no openchamber-web-3.0.0.tgz found to postpack; skipping tarball verification');
    return null;
  }

  // 3. Ensure tarball contains the full symlink closure for agent-runtime
  const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openchamber-web-postpack-'));
  try {
    execSync(`tar -xzf "${tarballPath}" -C "${stagingDir}"`);
    const unpackedPackage = path.join(stagingDir, 'package');
    const targetRuntime = path.join(unpackedPackage, 'resources', 'agent-runtime');
    const sourceRuntime = path.join(webRoot, 'resources', 'agent-runtime');

    if (fs.existsSync(sourceRuntime)) {
      fs.rmSync(targetRuntime, { recursive: true, force: true });
      execSync(`cp -a "${sourceRuntime}" "${targetRuntime}"`);
    }

    // Re-tar package directory with tar preserving symlinks and permissions
    execSync(`tar -czf "${tarballPath}" package`, { cwd: stagingDir });

    // 4. Validate package.json inside the tarball
    const packedManifest = JSON.parse(fs.readFileSync(path.join(unpackedPackage, 'package.json'), 'utf8'));
    const dependencies = { ...packedManifest.dependencies, ...packedManifest.devDependencies };
    for (const [name, version] of Object.entries(dependencies)) {
      if (typeof version === 'string' && version.includes('workspace:')) {
        throw new Error(`Tarball manifest contains invalid workspace dependency: ${name} -> ${version}`);
      }
      if (name.startsWith('@openchamber/agent-')) {
        throw new Error(`Tarball manifest contains private agent package dependency: ${name}`);
      }
    }

    // Verify private workspace packages remain private: true
    const agentServiceManifest = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'packages', 'agent-service', 'package.json'), 'utf8'));
    const agentContractManifest = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'packages', 'agent-contract', 'package.json'), 'utf8'));
    if (!agentServiceManifest.private || !agentContractManifest.private) {
      throw new Error('Private agent packages must remain private: true');
    }

    // 5. Verify payload integrity
    const verification = verifyAgentPayload(targetRuntime);
    const tarballBytes = fs.readFileSync(tarballPath);
    const sha256 = createHash('sha256').update(tarballBytes).digest('hex');

    console.log(`[web] standalone tarball ready: ${tarballPath} (${(tarballBytes.length / (1024 * 1024)).toFixed(2)} MB, sha256: ${sha256})`);
    console.log(`[web] verified bundled Agent runtime (bun ${verification.bunVersion}, ${verification.packageCount} packages)`);

    return { tarballPath, sha256, size: tarballBytes.length, verification };
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runPostpack();
}
