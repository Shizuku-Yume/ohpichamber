import { createHash } from 'node:crypto';
import { lstat, open, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';

export class ProbeError extends Error {
  constructor(code, status = 'failed') {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function probeResult(id, capability, status, observations = {}, errors = []) {
  return { id, capability, status, observations, errors, artifacts: [], redactions: ['message bodies', 'tool arguments', 'paths', 'environment', 'raw exceptions'] };
}

export function safeError(error, fallback = 'PROBE_FAILED') {
  return error instanceof ProbeError ? error.code : fallback;
}

export function finishEnvelope(run, probes, cleanup, exitCode) {
  const summary = { passed: 0, partial: 0, failed: 0, unsupported: 0, unavailable: 0, unknown: 0 };
  for (const probe of probes) {
    if (!Object.hasOwn(summary, probe.status)) throw new ProbeError('INVALID_STATUS');
    summary[probe.status]++;
  }
  return { schemaVersion: 2, run: { ...run, exitCode }, probes, summary, cleanup };
}

// Only explicit projections enter reports. This final check also rejects unsafe
// strings accidentally added by a future suite, rather than attempting to guess secrets.
export function serializeEnvelope(envelope) {
  const text = JSON.stringify(envelope, (key, value) => {
    if (/^(apiKey|authorization|password|secret|token|prompt|response|content|delta|stack)$/i.test(key)) throw new ProbeError('UNSAFE_REPORT_FIELD');
    if (/(?:[a-z]+:\/\/|bearer\s|(?:^|[\s"'=(])[A-Za-z]:[\\/]|(?:^|[\s"'=(])\/[\w.])/i.test(value)) throw new ProbeError('UNSAFE_REPORT_VALUE');
    return value;
  }, 2);
  return `${text}\n`;
}

export async function identifySource(sourceDir, expected, signal) {
  if (!sourceDir) throw new ProbeError('SOURCE_NOT_SELECTED', 'unavailable');
  let files;
  try {
    async function sourceBytes(relative) {
      signal?.throwIfAborted();
      const handle = await open(join(sourceDir, relative), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      try {
        if (!(await handle.stat()).isFile()) throw new ProbeError('SOURCE_NOT_REGULAR_FILE', 'unavailable');
        return await handle.readFile({ signal });
      } finally { await handle.close(); }
    }
    const packages = join(sourceDir, 'packages');
    files = ['package.json', 'bun.lock'];
    const generatedPaths = new Set(expected.generatedArtifactPaths ?? []);
    const generatedArtifacts = [];
    async function visit(relative) {
      signal?.throwIfAborted();
      if (!(await lstat(join(sourceDir, relative))).isDirectory()) throw new ProbeError('SOURCE_NOT_DIRECTORY', 'unavailable');
      for (const entry of await readdir(join(sourceDir, relative), { withFileTypes: true })) {
        if (entry.isSymbolicLink()) throw new ProbeError('SOURCE_SYMLINK', 'unavailable');
        const child = `${relative}/${entry.name}`;
        if (entry.isDirectory()) await visit(child);
        else if (entry.isFile()) {
          if (generatedPaths.has(child)) generatedArtifacts.push({ path: child, sha256: createHash('sha256').update(await sourceBytes(child)).digest('hex') });
          else files.push(child);
        }
        if (files.length > expected.fingerprintFileCount) throw new ProbeError('SOURCE_IDENTITY_MISMATCH', 'unavailable');
      }
    }
    for (const entry of await readdir(packages, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      files.push(`packages/${entry.name}/package.json`);
      try { await visit(`packages/${entry.name}/src`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const hash = createHash('sha256');
    for (const file of files.sort()) {
      hash.update(file).update('\0').update(createHash('sha256').update(await sourceBytes(file)).digest());
    }
    const pkg = JSON.parse((await sourceBytes('packages/coding-agent/package.json')).toString('utf8'));
    if (pkg.name !== expected.packageName || pkg.version !== expected.packageVersion || hash.digest('hex') !== expected.sourceFingerprint || files.length !== expected.fingerprintFileCount) throw new ProbeError('SOURCE_IDENTITY_MISMATCH', 'unavailable');
    return { sourceRevision: expected.sourceRevision, packageVersion: pkg.version, packageName: pkg.name, sourceFingerprint: expected.sourceFingerprint, sourceFingerprintScope: expected.fingerprintScope, fingerprintFileCount: files.length, identityMethod: 'pinned authored-source fingerprint; generated artifacts hashed separately; snapshot without Git history', acquisitionArchiveSha256: expected.acquisitionArchiveSha256, archiveVerification: 'unavailable; original acquisition archive not retained', generatedArtifacts };
  } catch (error) {
    if (error instanceof ProbeError) throw error;
    throw new ProbeError('SOURCE_IDENTITY_UNAVAILABLE', 'unavailable');
  }
}
