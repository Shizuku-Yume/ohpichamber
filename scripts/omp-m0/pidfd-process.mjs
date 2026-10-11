import { dlopen, read as readNative } from 'bun:ffi';
import { readFileSync } from 'node:fs';

let native;

function failure(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function bindings() {
  if (process.platform !== 'linux') throw failure('PIDFD_UNAVAILABLE');
  if (native) return native.symbols;
  try {
    native = dlopen('libc.so.6', {
      pidfd_open: { args: ['i32', 'u32'], returns: 'i32' },
      pidfd_send_signal: { args: ['i32', 'i32', 'ptr', 'u32'], returns: 'i32' },
      close: { args: ['i32'], returns: 'i32' },
      __errno_location: { args: [], returns: 'ptr' },
    });
    return native.symbols;
  } catch { throw failure('PIDFD_UNAVAILABLE'); }
}

export function terminateIdentity(identity, signal) {
  if (!Number.isSafeInteger(identity.pid) || identity.pid < 1 || !/^[0-9]+$/.test(identity.startTicks)) throw failure('PIDFD_IDENTITY_INVALID');
  const signalNumber = signal === 'SIGKILL' ? 9 : signal === 'SIGTERM' ? 15 : null;
  if (signalNumber === null) throw failure('PIDFD_SIGNAL_INVALID');
  const symbols = bindings();
  const fd = symbols.pidfd_open(identity.pid, 0);
  if (fd < 0) {
    if (readNative.i32(symbols.__errno_location(), 0) === 3) return false;
    throw failure('PIDFD_UNAVAILABLE');
  }
  try {
    // Acquire the immutable kernel process handle first. If the PID was reused
    // before open, the birth check rejects that handle; reuse after this check
    // cannot redirect pidfd_send_signal to a different process.
    let stat;
    try { stat = readFileSync(`/proc/${identity.pid}/stat`, 'utf8'); }
    catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ESRCH') return false;
      throw failure('PIDFD_IDENTITY_UNAVAILABLE');
    }
    const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
    if (fields[19] !== identity.startTicks) return false;
    if (symbols.pidfd_send_signal(fd, signalNumber, null, 0) === 0) return true;
    const errno = readNative.i32(symbols.__errno_location(), 0);
    if (errno === 3) return false;
    if (errno === 38) throw failure('PIDFD_UNAVAILABLE');
    throw failure('PIDFD_SIGNAL_FAILED');
  } finally {
    if (symbols.close(fd) !== 0) throw failure('PIDFD_CLOSE_FAILED');
  }
}
