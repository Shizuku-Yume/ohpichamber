import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

// A model reference has one owned grammar: `@openchamber/agent-contract`'s
// `modelSelector.ts` (`parseModelSelector`/`formatModelSelector`). Splitting a
// selector ad hoc loses the `:thinkingLevel` (and `#variant`, `@upstream`)
// suffixes, which is how a stored `provider/model:high` role stopped resolving
// to its model. This rule finds those splits and joins outside that module.

const SELECTOR_MODULE = "packages/agent-contract/src/modelSelector.ts";
/** Test fixtures spell the selector they expect; that is an assertion, not a second parser. */
function isTestFile(filename: string): boolean {
  return /(?:^|[\\/])__tests__(?:[\\/]|$)/.test(filename)
    || /\.(?:test|spec)\.(?:js|jsx|ts|tsx)$/.test(filename);
}

/** Operand names that hold a model reference, not a filesystem path. */
const MODEL_OPERAND =
  /^(?:model|modelId|modelID|modelRef|modelName|modelKey|modelString|modelSelector|modelPart|modelRole(?:s)?|roleSelector|roleOverride|roleValue|selector|provider|providerId|providerID|settingsDefaultModel|defaultModel|answeringModelKey|commitModel(?:Id)?|parsedModel(?:Id)?|selectedModel(?:Id)?|nextModel|nextProvider)$/i;

const SPLIT_TARGETS: Readonly<Record<string, true>> = {
  split: true,
  indexOf: true,
  lastIndexOf: true,
  slice: true,
  substring: true,
  replace: true,
};

/** The member name a call's callee reads, e.g. `x.split` -> split. */
function calleeMemberName(callee: ESTree.Node): string | undefined {
  if (callee.type !== "MemberExpression" || callee.computed) return undefined;
  return callee.property.type === "Identifier" ? callee.property.name : undefined;
}

/** The name of the object whose method is called, e.g. `model.split` -> model. */
function calleeObjectName(callee: ESTree.Node): string | undefined {
  if (callee.type !== "MemberExpression") return undefined;
  const object = callee.object;
  if (object.type === "Identifier") return object.name;
  if (object.type === "MemberExpression" && !object.computed && object.property.type === "Identifier") {
    return object.property.name;
  }
  return undefined;
}

/** Literal text of a call argument, when it is a string literal or a `/regex/`. */
function literalOtherwiseSeparator(argument: ESTree.Node | undefined): string | undefined {
  if (argument === undefined) return undefined;
  if (argument.type === "Literal" && typeof argument.value === "string") return argument.value;
  if (argument.type === "Literal" && "regex" in argument && argument.regex) {
    return argument.regex.pattern;
  }
  return undefined;
}

function isModelOperand(name: string | undefined): boolean {
  return name !== undefined && MODEL_OPERAND.test(name);
}

const PROVIDER_NAME = /^(?:provider|providerId|providerID)$/;
const MODEL_NAME = /^(?:model|modelId|modelID)$/;

/** The operand name an expression reads: `m.modelId` -> modelId, `modelId` -> modelId. */
function readOperandName(node: ESTree.Node): string | undefined {
  if (node.type === "Identifier") return node.name;
  if (node.type !== "MemberExpression" || node.computed) return undefined;
  return node.property.type === "Identifier" ? node.property.name : undefined;
}

/** True for a template that joins a provider operand and a model operand over `/` or `:`. */
function joinsModelRef(quasis: readonly ESTree.TemplateElement[], expressions: readonly ESTree.Node[]): boolean {
  if (expressions.length < 2) return false;
  for (let index = 0; index < expressions.length - 1; index += 1) {
    const separator = quasis[index + 1]?.value.raw ?? "";
    if (separator !== "/" && separator !== ":") continue;
    const left = readOperandName(expressions[index]);
    const right = readOperandName(expressions[index + 1]);
    if (left !== undefined && right !== undefined && PROVIDER_NAME.test(left) && MODEL_NAME.test(right)) {
      return true;
    }
  }
  return false;
}

/** Disallow ad-hoc model-selector splitting and joining outside the selector module. */
export const noModelRefSplittingRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow splitting or joining a model reference by hand; use @openchamber/agent-contract's modelSelector grammar.",
    },
    messages: {
      split:
        "Parse this model reference with `parseModelSelector`/`splitSelectorThinking` from @openchamber/agent-contract; splitting by hand drops the `:thinkingLevel`, `#variant` and `@upstream` suffixes.",
      join:
        "Format this model reference with `formatModelSelector`/`modelRefKey` from @openchamber/agent-contract; a hand-built join loses the suffix grammar.",
    },
  },
  create(context) {
    const filename = (context.filename ?? context.physicalFilename ?? "").split("\\").join("/");
    if (filename.endsWith(SELECTOR_MODULE) || isTestFile(filename)) {
      return {};
    }
    return {
      CallExpression(node) {
        const member = calleeMemberName(node.callee);
        if (member === undefined || SPLIT_TARGETS[member] !== true) return;
        const operand = calleeObjectName(node.callee);
        if (!isModelOperand(operand)) return;
        const separator = literalOtherwiseSeparator(node.arguments[0]);
        if (separator !== "/" && separator !== ":") return;
        context.report({ node, messageId: "split" });
      },
      TemplateLiteral(node) {
        if (joinsModelRef(node.quasis, node.expressions)) context.report({ node, messageId: "join" });
      },
    };
  },
});
