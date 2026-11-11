import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

// One registry owns what each OMP tool is called, how it is drawn, grouped and
// described: `packages/ui/src/lib/toolPresentation/`. A `toolName === 'read'`
// comparison anywhere else forks that knowledge, and the fork drifts the moment
// OMP renames or adds a tool. This rule finds those comparisons outside the
// registry and sends the caller to a registry selector (`isReadTool`,
// `toolGrouping`, `toolPresentation`, …).

const REGISTRY_DIR = "packages/ui/src/lib/toolPresentation/";

/** Test fixtures spell the tool name they exercise; that is an assertion, not a second registry. */
function isTestFile(filename: string): boolean {
  return /(?:^|[\\/])__tests__(?:[\\/]|$)/.test(filename)
    || /\.(?:test|spec)\.(?:js|jsx|ts|tsx)$/.test(filename);
}

/**
 * Operands that hold a tool name. Deliberately narrow: `name` alone is a
 * syntax node, a command, a skill or a DOM attribute far more often than a
 * tool, so only the tool-specific spellings are checked.
 */
const TOOL_OPERAND = /^(?:tool|toolName|toolId|popupToolName|activeToolName|nextToolName|previousToolName)$/;

/** Comparisons that read a tool name off a part rather than a local string. */
const isToolOperand = (node: ESTree.Node): boolean => {
  if (node.type === "Identifier") return TOOL_OPERAND.test(node.name);
  if (node.type !== "MemberExpression" || node.computed) return false;
  return node.property.type === "Identifier" && node.property.name === "toolName";
};

/** The literal text of a comparison operand, when it is a plain string. */
function literalText(node: ESTree.Node | undefined): string | undefined {
  if (node?.type !== "Literal" || typeof node.value !== "string") return undefined;
  return node.value;
}

/** Disallow tool-name literal comparisons outside the presentation registry. */
export const noToolNameLiteralRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow comparing a tool name against a literal outside the tool presentation registry; use a registry selector or `toolPresentation`.",
    },
    messages: {
      literal:
        "Compare tool names through the registry (`packages/ui/src/lib/toolPresentation`): use a selector such as `isReadTool`/`isEditTool`/`toolGrouping`, or `toolPresentation(name)` for its label, icon and descriptions.",
    },
  },
  create(context) {
    const filename = (context.filename ?? context.physicalFilename ?? "").split("\\").join("/");
    if (filename.includes(REGISTRY_DIR) || isTestFile(filename)) {
      return {};
    }
    return {
      BinaryExpression(node) {
        if (node.operator !== "===" && node.operator !== "!==" && node.operator !== "==" && node.operator !== "!=") return;
        const literal = literalText(node.right) ?? literalText(node.left);
        if (literal === undefined) return;
        const operand = literalText(node.right) === undefined ? node.right : node.left;
        if (!isToolOperand(operand)) return;
        context.report({ node, messageId: "literal" });
      },
      SwitchStatement(node) {
        if (!isToolOperand(node.discriminant)) return;
        for (const switchCase of node.cases) {
          if (switchCase.test && literalText(switchCase.test) !== undefined) {
            context.report({ node: switchCase, messageId: "literal" });
          }
        }
      },
    };
  },
});
