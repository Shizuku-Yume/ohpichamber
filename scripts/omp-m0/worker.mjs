import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { probeResult, safeError, serializeEnvelope } from './envelope.mjs';

const inputFile = process.argv[2];
let context;
let probes;
try {
  const input = JSON.parse(await readFile(inputFile, 'utf8'));
  context = { ...input, workspace: join(input.sandbox, 'workspace'), agentDir: join(input.sandbox, 'agent'), home: join(input.sandbox, 'home') };
  const suite = await import(`./${input.suite}.mjs`);
  probes = await suite.runSuite(context);
  if (!Array.isArray(probes) || probes.length === 0) throw new Error('EMPTY_SUITE');
} catch (error) {
  probes = [probeResult('sdk-import', 'SDK or suite availability', 'unavailable', {}, [safeError(error, 'SDK_DEPENDENCY_OR_SUITE_UNAVAILABLE')])];
}
try {
  await writeFile(join(context.sandbox, 'result.json'), serializeEnvelope({ probes }));
} catch {
  if (context) await writeFile(join(context.sandbox, 'result.json'), JSON.stringify({ probes: [probeResult('serialization', 'safe serialization', 'failed', {}, ['SERIALIZATION_FAILED'])] }));
  process.exitCode = 1;
}
if (probes.some(probe => ['failed', 'partial', 'unavailable', 'unknown'].includes(probe.status))) process.exitCode = 1;
// SDK module-level timers are not owned session resources. The disposable
// worker exits explicitly after the suite has recorded its resource cleanup.
process.exit(process.exitCode ?? 0);
