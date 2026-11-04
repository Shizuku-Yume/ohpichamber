import { describe, expect, test } from 'bun:test';
import { isSingleDevicePath } from './internal-device-path.ts';

describe('a mounted device path', () => {
  test('is one bare device URL', () => {
    expect(isSingleDevicePath('xd://openchamber_knowledge')).toBe(true);
    expect(isSingleDevicePath('xd://memory/docs')).toBe(true);
  });

  test('is never a list that also names a real file', () => {
    // The read tool reads every `;`-separated part inside one call, so the
    // second part would skip Host authorization with a prefix test.
    expect(isSingleDevicePath('xd://memory;/home/me/.ssh/id_rsa')).toBe(false);
    expect(isSingleDevicePath('xd://memory, /home/me/.ssh/id_rsa')).toBe(false);
    expect(isSingleDevicePath('xd://memory /home/me/.ssh/id_rsa')).toBe(false);
  });

  test('is not a lookalike path or a conflict rewrite', () => {
    // read/write recover a `<prefix>:conflict://<n>` path before dispatch, so
    // this shape reaches a real file after the hook exempted it.
    expect(isSingleDevicePath('xd://memory:conflict://1')).toBe(false);
    expect(isSingleDevicePath('xd://memory/docs/../file')).toBe(false);
    expect(isSingleDevicePath('xd:/memory')).toBe(false);
    expect(isSingleDevicePath('/home/me/xd://memory')).toBe(false);
    expect(isSingleDevicePath(undefined)).toBe(false);
  });
});
