import { readFileSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';

function processStat(text) {
  const fields = text.slice(text.lastIndexOf(')') + 2).trim().split(/\s+/);
  if (fields.length < 20 || !/^\d+$/.test(fields[19])) throw new Error('PROCESS_GROUP_INSPECTION_UNAVAILABLE');
  return { state: fields[0], group: Number(fields[2]), session: Number(fields[3]), startTime: fields[19] };
}

export function captureProcessGroup(pid) {
  const group = { pid, startTime: null, isolated: false };
  if (process.platform !== 'linux' || !Number.isInteger(pid) || pid <= 1 || pid === process.pid) return group;
  try {
    const stat = processStat(readFileSync(`/proc/${pid}/stat`, 'utf8'));
    if (stat.group === pid && stat.session === pid) Object.assign(group, { startTime: stat.startTime, isolated: true });
  } catch { /* An already-exited leader is only safe if its whole group is absent. */ }
  return group;
}

async function groupMembers(group) {
  const members = [];
  for (const entry of await readdir('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    let stat;
    try { stat = processStat(await readFile(`/proc/${entry}/stat`, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT' || error.code === 'ESRCH') continue; throw error; }
    if (stat.group === group.pid) members.push({ pid: Number(entry), ...stat });
  }
  return members;
}

function ownedMembers(group, members) {
  return group.isolated && group.startTime !== null && members.every(member =>
    member.session === group.pid && BigInt(member.startTime) >= BigInt(group.startTime) &&
    (member.pid !== group.pid || member.startTime === group.startTime));
}

function liveMembers(members) {
  return members.filter(member => member.state !== 'Z' && member.state !== 'X');
}

export async function cleanupProcessGroup(group, timeoutMs = 2000) {
  const result = { verified: false, remainingProcessesDetected: false, remainingProcessCount: 0, terminationRequested: false, allProcessesExited: false, errors: [] };
  if (process.platform !== 'linux') { result.errors.push('PROCESS_GROUP_INSPECTION_UNAVAILABLE'); return result; }
  if (!group || !Number.isInteger(group.pid) || group.pid <= 1 || group.pid === process.pid) { result.errors.push('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE'); return result; }
  try {
    let members = await groupMembers(group);
    if (members.length && !ownedMembers(group, members)) { result.errors.push('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE'); return result; }
    const live = liveMembers(members);
    result.remainingProcessCount = live.length;
    result.remainingProcessesDetected = live.length > 0;
    if (live.length) {
      try { process.kill(-group.pid, 'SIGKILL'); result.terminationRequested = true; }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
      const deadline = Date.now() + timeoutMs;
      do {
        members = await groupMembers(group);
        if (members.length && !ownedMembers(group, members)) { result.errors.push('PROCESS_GROUP_OWNERSHIP_UNAVAILABLE'); return result; }
        if (liveMembers(members).length === 0) break;
        if (Date.now() >= deadline) { result.errors.push('PROCESS_GROUP_CLEANUP_TIMEOUT'); return result; }
        await new Promise(resolve => setTimeout(resolve, 20));
      } while (true);
    }
    result.verified = true;
    result.allProcessesExited = true;
    if (result.remainingProcessesDetected) result.errors.push('WORKER_DESCENDANTS_REMAINED');
  } catch { result.errors.push('PROCESS_GROUP_INSPECTION_UNAVAILABLE'); }
  return result;
}
