import { describe, expect, test } from 'bun:test';
import type { ToolCallPart, ToolResultPart } from '@openchamber/agent-contract';
import { getToolFileChanges, getPrimaryToolPath } from './toolDiffUtils';
import { describeToolCall } from '@/lib/toolPresentation';

describe('ast_edit multi-file diffs and tool cards parity', () => {
  test('getToolFileChanges parses ast_edit multi-file changes and diff +/- counts', () => {
    const call: ToolCallPart = {
      type: 'tool_call',
      partId: 'part-1',
      toolCallId: 'call-ast-edit-1',
      toolName: 'ast_edit',
      input: {
        ops: [{ pat: 'oldApi($$$ARGS)', out: 'newApi($$$ARGS)' }],
        paths: ['src/a.ts', 'src/b.ts'],
      },
      status: 'completed',
    };

    const displayContent = [
      '# src/',
      '## a.ts (1 replacement)',
      '- 10│oldApi(x)',
      '+ 10│newApi(x)',
      '',
      '## b.ts (2 replacements)',
      '- 25│oldApi(y)',
      '+ 25│newApi(y)',
      '- 30│oldApi(z)',
      '+ 30│newApi(z)',
    ].join('\n');

    const result: ToolResultPart = {
      type: 'tool_result',
      partId: 'part-2',
      toolCallId: 'call-ast-edit-1',
      toolName: 'ast_edit',
      isError: false,
      output: {
        content: [{ type: 'text', text: displayContent }],
        details: {
          displayContent,
          totalReplacements: 3,
          filesTouched: 2,
        },
      },
    };

    const changes = getToolFileChanges(result, call);
    expect(changes.length).toBe(2);

    expect(changes[0]!.path).toBe('src/a.ts');
    expect(changes[0]!.additions).toBe(1);
    expect(changes[0]!.deletions).toBe(1);
    expect(changes[0]!.diff).toContain('--- a/src/a.ts');
    expect(changes[0]!.diff).toContain('+newApi(x)');

    expect(changes[1]!.path).toBe('src/b.ts');
    expect(changes[1]!.additions).toBe(2);
    expect(changes[1]!.deletions).toBe(2);
    expect(changes[1]!.diff).toContain('--- a/src/b.ts');
    expect(changes[1]!.diff).toContain('+newApi(z)');

    const primaryPath = getPrimaryToolPath(call);
    expect(primaryPath).toBe('src/a.ts');
  });

  test('the registry describes each call the way the row reads', () => {
    const describe = (toolName: string, input: ToolCallPart['input']): string | null =>
      describeToolCall(input, toolName);

    expect(describe('ast_edit', { ops: [{ pat: 'foo()', out: 'bar()' }], paths: ['src/app.ts'] })).toBe('foo() → bar()');
    expect(describe('ast_grep', { pat: 'class $NAME', path: 'src/' })).toBe('class $NAME');
    expect(describe('eval', { language: 'py', title: 'Calculate checksums', code: 'print(42)' })).toBe('Calculate checksums');
    expect(describe('lsp', { action: 'hover', file: 'src/main.ts', line: 42 })).toBe('hover src/main.ts');
    expect(describe('checkpoint', { goal: 'Investigate leak' })).toBe('Investigate leak');
    expect(describe('rewind', { report: 'No leak in worker' })).toBe('No leak in worker');
    expect(describe('find', { query: 'where is token rate calculated' })).toBe('where is token rate calculated');
  });
});
