import { readFile, readdir } from 'node:fs/promises';
export { terminateIdentity } from './pidfd-process.mjs';

export async function sampleResources(pid) {
  if (process.platform !== 'linux') {
    return { status: 'unavailable', method: 'linux-procfs', reason: 'This sampler requires Linux procfs.' };
  }
  try {
    const [status, stat] = await Promise.all([
      readFile(`/proc/${pid}/status`, 'utf8'),
      readFile(`/proc/${pid}/stat`, 'utf8'),
    ]);
    const rss = /^VmRSS:\s+(\d+)\s+kB$/m.exec(status);
    const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
    if (!rss || fields.length < 20) throw new Error('Incomplete resource sample.');
    return {
      status: 'passed', method: 'linux-procfs', sampledAt: new Date().toISOString(),
      rssBytes: Number(rss[1]) * 1024,
      userCpuTicks: Number(fields[11]), systemCpuTicks: Number(fields[12]),
      threads: Number(fields[17]),
    };
  } catch {
    return { status: 'unavailable', method: 'linux-procfs', reason: 'The process disappeared or procfs could not be read.' };
  }
}

export async function inspectProcessTree(rootPid, tracked = []) {
  if (process.platform !== 'linux') {
    return { status: 'unavailable', reason: 'Descendant identity inspection requires Linux procfs.' };
  }
  let entries;
  try { entries = await readdir('/proc'); }
  catch { return { status: 'unavailable', reason: 'procfs process listing is unavailable.' }; }
  const rows = [];
  for (const entry of entries) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const stat = await readFile(`/proc/${entry}/stat`, 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
      rows.push({ pid: Number(entry), parentPid: Number(fields[1]), state: fields[0], startTicks: fields[19] });
    } catch { /* A process may exit between listing and sampling. */ }
  }
  const members = rows.filter(row => row.pid === rootPid || tracked.some(identity => identity.pid === row.pid && identity.startTicks === row.startTicks));
  for (let index = 0; index < members.length; index++) {
    for (const row of rows) {
      if (row.parentPid === members[index].pid && !members.some(member => member.pid === row.pid)) members.push(row);
    }
  }
  return { status: 'passed', members };
}


export const RESOURCE_LIMITATIONS = [
  'RSS is a point-in-time Linux procfs observation, not a heap measurement or a cross-platform guarantee.',
  'CPU values are cumulative scheduler ticks; no sampling-frequency or CPU percentage claim is made.',
  'Two fixture workers and one deterministic tool turn per worker do not represent production provider or long-lived workloads.',
  'The probe imposes a time and IPC size bound, not an OS memory, CPU, network or filesystem sandbox.',
  'Per-worker cleanup checks tracked descendant identities; the runner separately sweeps the complete suite process group, including reparented descendants. Deliberate setsid escape is not OS sandbox containment.',
];
