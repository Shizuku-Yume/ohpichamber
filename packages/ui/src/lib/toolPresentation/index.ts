import type { JsonObject, JsonValue } from '@openchamber/agent-contract';
import { z } from 'zod';

import { fallbackPresentation, KNOWN_TOOL_NAMES, TOOL_PRESENTATIONS, type KnownToolName } from './presentations';
import type { ToolGroup, ToolPresentation } from './types';

export { normalizeIntent, intentOf } from './intent';
export type { ToolGroup, ToolPresentation, ToolOutputLanguage } from './types';
export { KNOWN_TOOL_NAMES } from './presentations';
export type { KnownToolName } from './presentations';
export {
    categorizeTool,
    TOOL_PERMISSION_GROUPS,
    GROUP_DESCRIPTIONS,
    getToolOneLineDescription,
    type ToolPermissionGroupKey,
} from './groups';
export { useEvalView, splitEvalOutput, evalResultSummary, normalizeEvalLanguage, isToolCallStatusEvent } from './toolView';
export type { EvalLanguage, EvalTableColumn, EvalView, EvalViewEntry, EvalStatusEvent, EvalCellView, EvalViewData, EvalOutputPart } from './toolView';

/** A runtime row's name may carry a stream index and a `runtime.` prefix. */
export const toolBaseName = (toolName: string | undefined): string => {
    const name = (toolName ?? '').trim().replace(/:\d+$/, '');
    return name.startsWith('runtime.') ? name.slice('runtime.'.length) : name;
};

const isKnownToolName = (name: string): name is KnownToolName => Object.hasOwn(TOOL_PRESENTATIONS, name);

/** The registry entry for a tool name, falling back to its own words. */
export const toolPresentation = (toolName: string | undefined): ToolPresentation => {
    const name = toolBaseName(toolName);
    return isKnownToolName(name) ? TOOL_PRESENTATIONS[name] : fallbackPresentation(name);
};

/** The OMP tool names a native call can claim; extension and MCP names stay opaque. */
export const OMP_TOOL_NAMES: readonly string[] = KNOWN_TOOL_NAMES.filter((name) => !['reasoning', 'image-preview', 'mermaid-preview', 'skill'].includes(name));

/** One line describing the call's target from its arguments. */
export const describeToolCall = (input: JsonObject, toolName: string | undefined): string | null =>
    toolPresentation(toolName).describeCall(input);

/** One line summarizing a result from the SDK's `details`, or null. */
export const describeToolResult = (details: JsonValue | undefined, toolName: string | undefined): string | null =>
    toolPresentation(toolName).describeResult(details);

/** The activity-row grouping class for a tool name. */
export const toolGrouping = (toolName: string | undefined): ToolGroup => toolPresentation(toolName).group;

/** Whether the tool's result body shares the same activity row as its call. */
/** A tool that runs subagent sessions of its own. */
export const isSubagentTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'task';

/** A tool that asks the user a question. */
export const isQuestionTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'ask';

/** A tool that reads files. */
export const isReadTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'read';

/** A tool that writes a file. */
export const isWriteTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'write';

/** A tool that edits a file in place. */
export const isEditTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'edit';

/** The AST rewriter, whose paths live on its ops. */
export const isAstEditTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'ast_edit';

/** The file-find tool, whose output lines carry `path:line`. */
export const isFindTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'find';

/** The pattern grep tool. */
export const isGrepTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'grep';

/** The filename glob tool. */
export const isGlobTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'glob';

/** The web search tool. */
export const isWebSearchTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'web_search';

/** The plan tool every todo snapshot comes from. */
export const isTodoTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'todo';

/** Tools that manage long-term agent memory. */
export const isMemoryTool = (toolName: string | undefined): boolean => {
    const name = toolBaseName(toolName);
    return name === 'retain' || name === 'recall' || name === 'reflect' || name === 'memory_edit' || name === 'learn';
};

export const isRetainTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'retain';
export const isRecallTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'recall';
export const isReflectTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'reflect';
export const isLearnTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'learn';
/** Text-to-image generation and editing tool. */
export const isImageGenerationTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'generate_image';
/** Rows with a direct in-app destination: reads and skills. */
export const isStaticTool = (toolName: string | undefined): boolean => {
    const name = toolBaseName(toolName);
    return toolGrouping(name) === 'read' || name === 'skill';
};

/**
 * The answer pairs OMP reports for an `ask` result. A multi-question call
 * carries `results`; a single one carries the fields at the top level.
 */
export const askAnswers = (details: JsonValue | undefined): Array<{ question: string; answer: string }> => {
    const root = details && typeof details === 'object' && !Array.isArray(details) ? details : undefined;
    if (!root) return [];
    const questions = z.array(z.object({
        question: z.string(),
        selectedOptions: z.array(z.string()).optional(),
        customInput: z.string().optional(),
        note: z.string().optional(),
        timedOut: z.boolean().optional(),
    })).safeParse(root.results).data;
    const answerOf = (item: { selectedOptions?: string[]; customInput?: string; note?: string; timedOut?: boolean }): string =>
        item.selectedOptions?.join(', ') ?? item.customInput ?? (item.timedOut ? '' : item.note) ?? '';
    if (questions?.length) {
        return questions.flatMap((item) => {
            const answer = answerOf(item);
            return answer ? [{ question: item.question, answer }] : [];
        });
    }
    const single = z.object({
        question: z.string(),
        selectedOptions: z.array(z.string()).optional(),
        customInput: z.string().optional(),
        note: z.string().optional(),
        timedOut: z.boolean().optional(),
    }).safeParse(root).data;
    if (!single) return [];
    const answer = answerOf(single);
    return answer ? [{ question: single.question, answer }] : [];
};

/** A tool that mutates project files. */
export const isFileChangeTool = (toolName: string | undefined): boolean => {
    const name = toolBaseName(toolName);
    return name === 'edit' || name === 'write' || name === 'ast_edit' || name === 'apply_patch';
};

/** A tool that runs a command or program. */
export const isShellTool = (toolName: string | undefined): boolean => {
    const name = toolBaseName(toolName);
    return name === 'bash';
};

/** A tool that evaluates code interactively. */
export const isEvalTool = (toolName: string | undefined): boolean => toolBaseName(toolName) === 'eval';

/** A tool whose result is reading or searching the workspace. */
export const isExplorationTool = (toolName: string | undefined): boolean => toolGrouping(toolName) === 'read' || toolGrouping(toolName) === 'search';

/** A tool that reaches the network or the browser. */
export const isWebTool = (toolName: string | undefined): boolean => {
    const name = toolBaseName(toolName);
    return name === 'web_search' || name === 'web';
};
