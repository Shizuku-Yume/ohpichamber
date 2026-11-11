import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

// `session.updatedAt` is the native transcript file's modification time, stamped
// on the machine running the Agent Service. Comparing it with `Date.now()`, a
// Host-written metadata stamp, or any other clock measured clock skew and
// timezone, not freshness: touching a session file purged suggestions that still
// applied, and a skewed clock purged them for good. The same holds in reverse —
// a client clock compared with a server revision.
//
// Two `updatedAt` values are one clock compared with itself and stay allowed, as
// do two Host stamps. Only a native mtime mixed with another clock is reported.
const UPDATED_AT = /^updatedAt$/;
const HOST_MOMENTS = /^(createdAt|generatedAt|lastIdleAt|endedAt|writtenAt|offeredAt|at|timestamp|now)$/;
const COMPARISON_OPERATORS = new Set(["<", ">", "<=", ">=", "==", "===", "!=", "!=="]);
const CLOCK_METHODS = new Set(["now", "getTime", "valueOf"]);

const isUpdatedAtMember = (node: ESTree.Node): boolean => (
  node.type === "MemberExpression" && !node.computed
  && node.property.type === "Identifier" && UPDATED_AT.test(node.property.name)
);

/** A member holding a Host-written moment, e.g. `assist.generatedAt` or `event.timestamp`. */
const isHostMoment = (node: ESTree.Node): boolean => {
  if (node.type !== "MemberExpression") return false;
  const property = node.property;
  const name = !node.computed && property.type === "Identifier" ? property.name
    : node.computed && property.type === "Literal" && typeof property.value === "string" ? property.value
      : "";
  return HOST_MOMENTS.test(name);
};

const isLocalClock = (node: ESTree.Node): boolean => (
  (node.type === "NewExpression" && node.callee.type === "Identifier" && node.callee.name === "Date")
  || (node.type === "Identifier" && node.name === "now")
  || (node.type === "CallExpression" && (
    (node.callee.type === "Identifier" && node.callee.name === "now")
    || (node.callee.type === "MemberExpression" && !node.callee.computed
      && node.callee.property.type === "Identifier" && CLOCK_METHODS.has(node.callee.property.name))
  ))
);

const children = (node: ESTree.Node): readonly ESTree.Node[] => {
  if (node.type === "BinaryExpression") return [node.left, node.right];
  if (node.type === "UnaryExpression" || node.type === "ParenthesizedExpression") return [node.expression ?? node.argument];
  if (node.type === "CallExpression") return node.arguments.flatMap((argument) => (argument.type === "SpreadElement" ? [] : [argument]));
  return [];
};

const anyNode = (node: ESTree.Node, predicate: (candidate: ESTree.Node) => boolean): boolean => (
  predicate(node) || children(node).some((child) => anyNode(child, predicate))
);

const hasUpdatedAt = (node: ESTree.Node): boolean => anyNode(node, isUpdatedAtMember);
const hasForeignClock = (node: ESTree.Node): boolean => (
  anyNode(node, (candidate) => !isUpdatedAtMember(candidate) && (isHostMoment(candidate) || isLocalClock(candidate)))
);

/** Flag a comparison between the native session mtime and any other clock. */
export const noCrossSourceTimeCompareRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Disallow comparing the native session mtime with a Host or client clock",
    },
    messages: {
      crossSource:
        "session.updatedAt is the native transcript file's mtime; comparing it with another clock reads clock skew, not freshness. "
        + "Compare two values written by the same source (both native mtimes, or both Host stamps), or compare identities.",
    },
  },
  createOnce(context) {
    return {
      BinaryExpression(node) {
        if (!COMPARISON_OPERATORS.has(node.operator)) return;
        // A side holding both the mtime and another clock is the age
        // comparison written as arithmetic, e.g. `now - session.updatedAt > 1000`.
        const leftMixes = hasUpdatedAt(node.left) && hasForeignClock(node.left);
        const rightMixes = hasUpdatedAt(node.right) && hasForeignClock(node.right);
        const crosses = (hasUpdatedAt(node.left) && hasForeignClock(node.right))
          || (hasUpdatedAt(node.right) && hasForeignClock(node.left));
        if (leftMixes || rightMixes || crosses) context.report({ node, messageId: "crossSource" });
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier" || callee.name !== "Math.max" && callee.name !== "Math.min") return;
        const arguments_ = node.arguments.filter((argument) => argument.type !== "SpreadElement");
        if (arguments_.some(hasUpdatedAt) && arguments_.some(hasForeignClock)) {
          context.report({ node, messageId: "crossSource" });
        }
      },
    };
  },
});
