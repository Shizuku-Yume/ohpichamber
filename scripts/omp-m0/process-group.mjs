import { dlopen, ptr } from 'bun:ffi';
import { readFileSync, readdirSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { terminateIdentity } from './pidfd-process.mjs';

let subreaper;

// Native shells can setsid(), so neither the worker's group nor its POSIX
// session owns all children. The disposable runner has one worker and no
// other subprocesses: adoption keeps detached orphans attributable after a
// worker SIGKILL without racing a background process-table poll.
export function enableWorkerSubreaper() {
  if (process.platform !== 'linux') throw new Error('PROCESS_GROUP_INSPECTION_UNAVAILABLE');
  if (subreaper) throw new Error('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE');
  // This executable must own only the worker. Refuse to adopt or signal a
  // pre-existing unrelated child; do not reuse this in a shared host process.
  for (const entry of readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      if (processStat(readFileSync(`/proc/${entry}/stat`, 'utf8')).parent === process.pid) throw new Error('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE');
    } catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ESRCH') throw error; }
  }
  const library = dlopen('libc.so.6', { prctl: { args: ['i32', 'u64', 'u64', 'u64', 'u64'], returns: 'i32' } });
  const previous = new Int32Array(1);
  try {
    if (library.symbols.prctl(37, ptr(previous), 0, 0, 0) !== 0 || library.symbols.prctl(36, 1, 0, 0, 0) !== 0) throw new Error('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE');
    subreaper = { library, previous: previous[0] };
  } catch (error) { library.close(); throw error; }
}

export function restoreWorkerSubreaper() {
  if (!subreaper) return;
  const { library, previous } = subreaper;
  try {
    if (library.symbols.prctl(36, previous, 0, 0, 0) !== 0) throw new Error('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE');
  } finally { subreaper = undefined; library.close(); }
}

function processStat(text) {
  const fields = text.slice(text.lastIndexOf(')') + 2).trim().split(/\s+/);
  if (fields.length < 20 || !/^\d+$/.test(fields[19])) throw new Error('PROCESS_GROUP_INSPECTION_UNAVAILABLE');
  return { state: fields[0], parent: Number(fields[1]), group: Number(fields[2]), session: Number(fields[3]), startTime: fields[19] };
}

export function captureProcessGroup(pid) {
  const group = { pid, startTime: null, isolated: false, ownerPid: process.pid, ownerStartTime: null, adoptsOrphans: subreaper !== undefined };
  if (process.platform !== 'linux' || !Number.isInteger(pid) || pid <= 1 || pid === process.pid) return group;
  try {
    const owner = processStat(readFileSync(`/proc/${process.pid}/stat`, 'utf8'));
    const stat = processStat(readFileSync(`/proc/${pid}/stat`, 'utf8'));
    if (stat.parent === process.pid && stat.group === pid && stat.session === pid) Object.assign(group, { startTime: stat.startTime, isolated: true, ownerStartTime: owner.startTime });
  } catch { /* Missing birth identity never authorizes descendant signaling. */ }
  return group;
}

async function ownedMembers(group) {
  const rows = new Map();
  for (const entry of await readdir('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    let stat;
    try { stat = processStat(await readFile(`/proc/${entry}/stat`, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT' || error.code === 'ESRCH') continue; throw error; }
    rows.set(Number(entry), { pid: Number(entry), ...stat });
  }
  const owner = rows.get(group.ownerPid);
  const leader = rows.get(group.pid);
  if (!owner || owner.startTime !== group.ownerStartTime || (leader && (leader.startTime !== group.startTime || leader.session !== group.pid || leader.parent !== group.ownerPid))) throw new Error('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE');
  const members = new Map();
  for (const row of rows.values()) {
    if (row.pid === group.ownerPid) continue;
    const inSession = row.session === group.pid || row.group === group.pid;
    const adopted = group.adoptsOrphans && row.parent === group.ownerPid;
    if (!inSession && !adopted) continue;
    if (BigInt(row.startTime) < BigInt(group.startTime) || (row.pid === group.pid && row.startTime !== group.startTime)) throw new Error('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE');
    members.set(row.pid, row);
  }
  // Also follow live ancestry before the worker dies. Every descendant is
  // checked against its parent's birth time, and each signal pins the exact
  // child identity with pidfd, never a name or a reused process-group number.
  let added;
  do {
    added = false;
    for (const row of rows.values()) {
      if (members.has(row.pid) || row.pid === group.ownerPid) continue;
      const parent = members.get(row.parent);
      if (!parent) continue;
      if (BigInt(row.startTime) < BigInt(parent.startTime)) throw new Error('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE');
      members.set(row.pid, row);
      added = true;
    }
  } while (added);
  return Array.from(members.values());
}

function liveMembers(members) {
  return members.filter(member => member.state !== 'Z' && member.state !== 'X');
}

export async function cleanupProcessGroup(group, timeoutMs = 2000) {
  const result = { verified: false, remainingProcessesDetected: false, remainingProcessCount: 0, terminationRequested: false, allProcessesExited: false, errors: [] };
  if (process.platform !== 'linux') { result.errors.push('PROCESS_GROUP_INSPECTION_UNAVAILABLE'); return result; }
  if (!group || !Number.isInteger(group.pid) || group.pid <= 1 || group.pid === process.pid || !group.isolated || group.startTime === null || group.ownerPid !== process.pid || group.ownerStartTime === null) { result.errors.push('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE'); return result; }
  try {
    let members = await ownedMembers(group);
    const live = liveMembers(members);
    result.remainingProcessCount = live.length;
    result.remainingProcessesDetected = live.length > 0;
    const deadline = Date.now() + timeoutMs;
    while (liveMembers(members).length) {
      for (const member of liveMembers(members)) {
        if (terminateIdentity({ pid: member.pid, startTicks: member.startTime }, 'SIGKILL')) result.terminationRequested = true;
      }
      await new Promise(resolve => setTimeout(resolve, 20));
      members = await ownedMembers(group);
      if (liveMembers(members).length && Date.now() >= deadline) { result.errors.push('PROCESS_GROUP_CLEANUP_TIMEOUT'); return result; }
    }
    result.verified = true;
    result.allProcessesExited = true;
    if (result.remainingProcessesDetected) result.errors.push('WORKER_DESCENDANTS_REMAINED');
  } catch (error) { result.errors.push(error.message === 'PROCESS_GROUP_OWNERSHIP_UNAVAILABLE' ? error.message : 'PROCESS_GROUP_INSPECTION_UNAVAILABLE'); }
  return result;
}
