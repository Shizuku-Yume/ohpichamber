import { expect, test } from 'bun:test';
import type { ClientBridgePermissionOption, ClientBridgePermissionToolCall } from '@oh-my-pi/pi-coding-agent/session/client-bridge';
import { NativePermissionBridge } from './native-permission-bridge.ts';
import type { NativePermissionChoice } from './interaction.ts';

const options: ClientBridgePermissionOption[] = [
  { optionId: 'once', name: 'Allow once', kind: 'allow_once' },
  { optionId: 'always', name: 'Always allow', kind: 'allow_always' },
  { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
];
const toolCall: ClientBridgePermissionToolCall = {
  toolCallId: 'call-1', toolName: 'bash', title: 'bash', rawInput: { command: 'printf native' },
};

test('native bash policies allow or deny without a Host card', async () => {
  let requested = false;
  const bridge = new NativePermissionBridge(async () => { requested = true; return 'reject'; }, () => 'allow');
  const allowed = await bridge.clientBridge.requestPermission!(toolCall, options);
  expect(allowed).toEqual({ outcome: 'selected', optionId: 'once', kind: 'allow_once' });

  const deniedBridge = new NativePermissionBridge(async () => { requested = true; return 'allow'; }, () => 'deny');
  const denied = await deniedBridge.clientBridge.requestPermission!(toolCall, options);
  expect(denied).toEqual({ outcome: 'selected', optionId: 'reject', kind: 'reject_once' });
  expect(requested).toBe(false);
  expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-1')).toBe(false);
});

test('non-bash gated tools get a one-shot Host card and never a session allowance', async () => {
  const requestedKeys: (string | undefined)[] = [];
  const choices: NativePermissionChoice[] = ['once', 'always', 'reject'];
  const bridge = new NativePermissionBridge(async (_toolCall, _options, key) => {
    requestedKeys.push(key);
    return choices.shift();
  });
  const editCall = { ...toolCall, toolName: 'edit', toolCallId: 'call-edit', rawInput: { path: 'a.ts', edits: [] } };
  const outcomes = [];
  for (let index = 0; index < 3; index++) {
    outcomes.push(await bridge.clientBridge.requestPermission!({ ...editCall, toolCallId: `call-edit-${index}` }, options));
  }
  expect(outcomes).toEqual([
    { outcome: 'selected', optionId: 'once', kind: 'allow_once' },
    { outcome: 'selected', optionId: 'once', kind: 'allow_once' },
    { outcome: 'selected', optionId: 'reject', kind: 'reject_once' },
  ]);
  expect(requestedKeys).toEqual([undefined, undefined, undefined]);
  expect(bridge.isNativeAuthorized('edit', { path: 'a.ts' }, 'call-edit-2')).toBe(false);
});

test('allow_always caches OMP key for this bridge instance only', async () => {
  let requestedKey: string | undefined;
  const bridge = new NativePermissionBridge(async (_toolCall, _options, key) => {
    requestedKey = key;
    return 'always' satisfies NativePermissionChoice;
  });
  const outcome = await bridge.clientBridge.requestPermission!(toolCall, options);
  expect(requestedKey).toBe('bash');
  expect(outcome).toEqual({ outcome: 'selected', optionId: 'always', kind: 'allow_always' });
  expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-2')).toBe(true);

  const replacement = new NativePermissionBridge(async () => undefined);
  expect(replacement.isNativeAuthorized('bash', { command: 'printf native' }, 'call-2')).toBe(false);
});

test('reset and stop clear every native decision', async () => {
  const bridge = new NativePermissionBridge(async () => 'always');
  await bridge.clientBridge.requestPermission!(toolCall, options);
  expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-2')).toBe(true);
  bridge.reset();
  expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-2')).toBe(false);
  await bridge.clientBridge.requestPermission!(toolCall, options);
  bridge.stop();
  expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-2')).toBe(false);
});

test('a reprompt invalidates an earlier allow_always decision', async () => {
  const choices: (NativePermissionChoice | undefined)[] = ['always', 'reject'];
  const bridge = new NativePermissionBridge(async () => choices.shift());
  await bridge.clientBridge.requestPermission!(toolCall, options);
  expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-2')).toBe(true);
  await bridge.clientBridge.requestPermission!({ ...toolCall, toolCallId: 'call-3' }, options);
  expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-3')).toBe(false);
});

test('allow_once authorizes exactly one native call', async () => {
  const bridge = new NativePermissionBridge(async () => 'once');
  const outcome = await bridge.clientBridge.requestPermission!(toolCall, options);
  expect(outcome).toEqual({ outcome: 'selected', optionId: 'once', kind: 'allow_once' });
  expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-1')).toBe(true);
  expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-1')).toBe(false);
});

test('allow_once cannot authorize a different input under the same tool call id', async () => {
  const bridge = new NativePermissionBridge(async () => 'once');
  await bridge.clientBridge.requestPermission!(toolCall, options);
  expect(bridge.isNativeAuthorized('bash', { command: 'printf different' }, 'call-1')).toBe(false);
  expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-1')).toBe(false);
});

test('reject and cancellation never authorize', async () => {
  for (const choice of ['reject', undefined] as const) {
    const bridge = new NativePermissionBridge(async () => choice);
    const outcome = await bridge.clientBridge.requestPermission!(toolCall, options);
    if (choice === undefined) expect(outcome).toEqual({ outcome: 'cancelled' });
    else expect(outcome).toEqual({ outcome: 'selected', optionId: 'reject', kind: 'reject_once' });
    expect(bridge.isNativeAuthorized('bash', { command: 'printf native' }, 'call-1')).toBe(false);
  }
});
