// Stage the release notes beside the server. Settings → About reads
// `changelog/index.json` from the package, never from the network, so the
// generated file has to travel with the Host. `build` runs this, and prepack
// calls it too so a tarball packed without a fresh build still carries notes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(webRoot, '../..');

/** Copy `changelog/index.json` to `resources/changelog/index.json`. */
export function stageChangelog({ root = webRoot, repoRoot = workspaceRoot } = {}) {
  const source = path.join(repoRoot, 'changelog', 'index.json');
  const target = path.join(root, 'resources', 'changelog', 'index.json');
  if (!fs.existsSync(source)) {
    throw new Error(`Missing ${path.relative(repoRoot, source)}; run "bun run changelog:build" first`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return target;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(`[web] staged release notes at ${path.relative(webRoot, stageChangelog())}`);
  } catch (error) {
    console.error(`[web] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
