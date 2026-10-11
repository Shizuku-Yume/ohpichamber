export const MAX_CHANNEL_BYTES = 1024 * 1024;

export function readFrames(stream, onMessage, onFailure) {
  let pending = Buffer.alloc(0);
  let receivedBytes = 0;
  let failed = false;
  stream.on('data', chunk => {
    if (failed) return;
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_CHANNEL_BYTES) {
      failed = true; pending = Buffer.alloc(0); onFailure('WORKER_IPC_LIMIT'); return;
    }
    pending = Buffer.concat([pending, chunk]);
    for (;;) {
      const end = pending.indexOf(10);
      if (end === -1) break;
      const frame = pending.subarray(0, end);
      pending = pending.subarray(end + 1);
      try { onMessage(JSON.parse(frame.toString('utf8'))); }
      catch { failed = true; onFailure('WORKER_IPC_INVALID'); return; }
    }
  });
  stream.on('error', () => { if (!failed) { failed = true; onFailure('WORKER_CHANNEL_FAILED'); } });
  stream.on('end', () => {
    if (pending.length && !failed) { failed = true; onFailure('WORKER_IPC_TRUNCATED'); }
  });
}

export function connectWorkerChannel(onMessage, onFailure = () => { process.exitCode = 1; }) {
  readFrames(process.stdin, onMessage, onFailure);
  return {
    output: process.stdout,
    input: process.stdin,
    send(message) { process.stdout.write(`${JSON.stringify(message)}\n`); },
    close() { process.stdin.destroy(); process.stdout.end(); },
  };
}
