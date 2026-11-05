import { describe, expect, test } from 'bun:test';
import type { ToolCallPart, ToolResultPart } from '@openchamber/agent-contract';
import { getToolFileChanges, getPrimaryToolPath } from './toolDiffUtils';
import { isReplyWrite, toolDescription } from '@/lib/toolHelpers';

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

  test('isReplyWrite recognizes out:// target paths and rejects regular file paths', () => {
    expect(isReplyWrite('write', { path: 'out://', content: 'mid-turn progress' })).toBe(true);
    expect(isReplyWrite('write', { path: 'out://subpath', content: 'mid-turn answer' })).toBe(true);
    expect(isReplyWrite('write', { file_path: 'out://', content: 'answer' })).toBe(true);
    expect(isReplyWrite('write', { path: 'src/file.ts', content: 'code' })).toBe(false);
    expect(isReplyWrite('read', { path: 'out://' })).toBe(false);
    expect(isReplyWrite('write', {})).toBe(false);
  });

  test('toolDescription renders rich card summaries for new tool kinds', () => {
    const astEditCall: ToolCallPart = {
      type: 'tool_call',
      partId: 'p1',
      toolCallId: 'c1',
      toolName: 'ast_edit',
      input: { ops: [{ pat: 'foo()', out: 'bar()' }], paths: ['src/app.ts'] },
      status: 'running',
    };
    expect(toolDescription(astEditCall)).toEqual({ kind: 'text', value: 'foo() → bar()' });

    const astGrepCall: ToolCallPart = {
      type: 'tool_call',
      partId: 'p2',
      toolCallId: 'c2',
      toolName: 'ast_grep',
      input: { pat: 'class $NAME', path: 'src/' },
      status: 'running',
    };
    expect(toolDescription(astGrepCall)).toEqual({ kind: 'text', value: 'class $NAME' });

    const evalCall: ToolCallPart = {
      type: 'tool_call',
      partId: 'p3',
      toolCallId: 'c3',
      toolName: 'eval',
      input: { language: 'py', title: 'Calculate checksums', code: 'print(42)' },
      status: 'running',
    };
    expect(toolDescription(evalCall)).toEqual({ kind: 'text', value: 'Calculate checksums' });

    const lspCall: ToolCallPart = {
      type: 'tool_call',
      partId: 'p4',
      toolCallId: 'c4',
      toolName: 'lsp',
      input: { action: 'hover', file: 'src/main.ts', line: 42 },
      status: 'running',
    };
    expect(toolDescription(lspCall)).toEqual({ kind: 'text', value: 'hover src/main.ts' });

    const checkpointCall: ToolCallPart = {
      type: 'tool_call',
      partId: 'p5',
      toolCallId: 'c5',
      toolName: 'checkpoint',
      input: { goal: 'Investigate leak' },
      status: 'running',
    };
    expect(toolDescription(checkpointCall)).toEqual({ kind: 'text', value: 'checkpoint: Investigate leak' });

    const rewindCall: ToolCallPart = {
      type: 'tool_call',
      partId: 'p6',
      toolCallId: 'c6',
      toolName: 'rewind',
      input: { report: 'No leak in worker' },
      status: 'running',
    };
    expect(toolDescription(rewindCall)).toEqual({ kind: 'text', value: 'rewind: No leak in worker' });

    const findCall: ToolCallPart = {
      type: 'tool_call',
      partId: 'p7',
      toolCallId: 'c7',
      toolName: 'find',
      input: { query: 'where is token rate calculated' },
      status: 'running',
    };
    expect(toolDescription(findCall)).toEqual({ kind: 'text', value: 'where is token rate calculated' });
  });
});
