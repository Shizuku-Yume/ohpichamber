import { describe, expect, test } from 'bun:test';
import type { JsonObject } from '@openchamber/agent-contract';
import { resolveDeclaredTier } from './tool-tier.ts';

type RegistryTool = { approval?: unknown };
type RegistrySession = { getToolByName(name: string): RegistryTool | undefined };

function sessionWith(tools: Record<string, RegistryTool>): RegistrySession {
  return { getToolByName: name => tools[name] };
}

describe('resolveDeclaredTier reads the live tool declaration', () => {
  test('a bare tier string is the declared tier', () => {
    expect(resolveDeclaredTier(sessionWith({ read: { approval: 'read' } }), 'read', {})).toBe('read');
    expect(resolveDeclaredTier(sessionWith({ edit: { approval: 'write' } }), 'edit', {})).toBe('write');
  });

  test('the object form contributes its tier', () => {
    expect(resolveDeclaredTier(sessionWith({ bash: { approval: { tier: 'exec', reason: 'runs code' } } }), 'bash', {})).toBe('exec');
  });

  test('a per-args function sees the arguments it will execute with', () => {
    const tools = {
      write: {
        approval: (args: JsonObject) => (args.path === 'local://notes.md' ? 'write' : 'read'),
      },
    };
    expect(resolveDeclaredTier(sessionWith(tools), 'write', { path: 'local://notes.md' })).toBe('write');
    expect(resolveDeclaredTier(sessionWith(tools), 'write', { path: 'src/a.ts' })).toBe('read');
  });

  test('an unknown tool, absent declaration or throwing function fails closed to exec', () => {
    expect(resolveDeclaredTier(sessionWith({}), 'vibe_spawn', {})).toBe('exec');
    expect(resolveDeclaredTier(undefined, 'vibe_spawn', {})).toBe('exec');
    expect(resolveDeclaredTier(sessionWith({ vibe_spawn: {} }), 'vibe_spawn', {})).toBe('exec');
    expect(resolveDeclaredTier(sessionWith({ vibe_spawn: { approval: 'admin' } }), 'vibe_spawn', {})).toBe('exec');
    expect(resolveDeclaredTier(sessionWith({ vibe_spawn: { approval: { tier: 'root' } } }), 'vibe_spawn', {})).toBe('exec');
    expect(resolveDeclaredTier(sessionWith({
      vibe_spawn: { approval: () => { throw new Error('declaration failed'); } },
    }), 'vibe_spawn', {})).toBe('exec');
    expect(resolveDeclaredTier(sessionWith({
      vibe_spawn: { approval: () => { throw 'non-error'; } },
    }), 'vibe_spawn', {})).toBe('exec');
  });
});
