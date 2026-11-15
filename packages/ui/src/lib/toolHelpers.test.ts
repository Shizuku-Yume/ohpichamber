import { describe, expect, test } from 'bun:test';
import { ToolCallPartSchema } from '@openchamber/agent-contract';
import {
  detectToolOutputLanguage, formatToolInput,
  isEvalTool,
  isFileChangeTool, isQuestionTool, isShellTool, isSubagentTool, normalizeToolName,
  parseNativeReadPath, toolBaseName, toolInputPath, toolInputPaths,
} from './toolHelpers';
import { describeToolCall } from './toolPresentation';

const call = ToolCallPartSchema.parse({
  type: 'tool_call', partId: 'call-part', toolCallId: 'call-1', toolName: 'bash',
  input: { command: 'git status\necho done' }, status: 'completed',
});

describe('native tool helpers', () => {
  test('recognizes actual native identities without legacy aliases or namespace collisions', () => {
    expect(isShellTool('bash')).toBe(true);
    expect(isShellTool('shell')).toBe(false);
    expect(isShellTool('mcp.bash')).toBe(false);
    expect(isShellTool('eval')).toBe(false);
    expect(isEvalTool('eval')).toBe(true);
    expect(isEvalTool('runtime.eval:1')).toBe(true);
    expect(isEvalTool('bash')).toBe(false);
    expect(isSubagentTool('task')).toBe(true);
    expect(isSubagentTool('subagent')).toBe(false);
    expect(isQuestionTool('ask')).toBe(true);
    expect(isFileChangeTool('patch')).toBe(false);
    expect(normalizeToolName('mcp.bash:2')).toBe('mcp.bash:2');
    expect(toolBaseName('runtime.read:2')).toBe('read');
    expect(normalizeToolName(' runtime.read:2 ')).toBe('runtime.read:2');
  });

  test('describes a call from its own input, never a neighbouring result', () => {
    expect(describeToolCall(call.input, call.toolName)).toBe('git status');
    expect(describeToolCall({}, 'mcp__server_custom')).toBeNull();
  });

  test('keeps native structured input and uses only native paths', () => {
    const edit = ToolCallPartSchema.parse({ ...call, toolName: 'edit', input: { path: 'src/main.ts', edits: [{ op: 'update', diff: '@@\n-a\n+b' }] } });
    expect(toolInputPaths(edit)).toEqual(['src/main.ts']);
    expect(toolInputPath({ filePath: 'legacy.ts' })).toBeNull();
    expect(JSON.parse(formatToolInput(edit.input, edit.toolName))).toEqual(edit.input);
    expect(formatToolInput(call.input, 'bash')).toBe('git status\necho done');
    expect(formatToolInput({ path: 'new.ts', content: 'hello' }, 'write')).toBe('hello');
    expect(formatToolInput({ code: 'console.log(1)' }, 'eval')).toBe('console.log(1)');
    expect(detectToolOutputLanguage('read', '', { path: 'src/main.ts' })).toBe('typescript');
    const rename = ToolCallPartSchema.parse({ ...edit, input: { path: 'old.ts', edits: [{ op: 'update', rename: 'new.ts' }] } });
    expect(toolInputPaths(rename)).toEqual(['old.ts', 'new.ts']);
    expect(toolInputPaths({ ...edit, input: { input: '[src/main.ts#A123]\nPUT 1.=1:\n+updated' } })).toEqual([]);
    expect(describeToolCall({ query: 'session deletion', grep_keywords: ['delete'] }, 'find')).toBe('session deletion');
    expect(describeToolCall({ agent: 'child', name: 'inspect', task: 'Inspect files' }, 'task')).toBe('inspect');
    expect(describeToolCall({ questions: [{ id: 'q1', question: 'Proceed?', options: [{ label: 'Yes' }] }] }, 'ask')).toBe('Proceed?');
    expect(describeToolCall({ query: 'canonical contracts' }, 'web_search')).toBe('canonical contracts');
  });

  test('opens native inline read selectors without changing filesystem identity', () => {
    expect(parseNativeReadPath('src/main.ts:50-100')).toEqual({ path: 'src/main.ts', line: 50 });
    expect(parseNativeReadPath('src/main.ts:raw:50+10')).toEqual({ path: 'src/main.ts', line: 50 });
    expect(parseNativeReadPath('C:/repo/main.ts:5,10-20')).toEqual({ path: 'C:/repo/main.ts', line: 5 });
    expect(parseNativeReadPath('C:/repo/main.ts')).toEqual({ path: 'C:/repo/main.ts' });
    expect(parseNativeReadPath('src/main.ts:-60')).toEqual({ path: 'src/main.ts' });
    expect(parseNativeReadPath('https://example.test:3127/src/main.ts')).toEqual({ path: 'https://example.test:3127/src/main.ts' });
    expect(detectToolOutputLanguage('read', '', { path: 'src/main.ts:50-100' })).toBe('typescript');
  });
});
