import { defineRule } from "@oxlint/plugins";

import type { ESTree } from "@oxlint/plugins";

/**
 * Compliant cases allowed to keep a static description on SettingsCheckboxRow /
 * SettingsFieldRow (matching upstream release behavior or documented exceptions,
 * per PATTERNS.md description policy).
 */
const ALLOWLIST_KEYS: Record<string, true> = {
  // Destructive threshold: lowering the limit drops prompt history, so explanation stays visible (ChatSettings.tsx).
  "settings.openchamber.visual.field.inputHistoryLimitDescription": true,
  // Orientation hint: explains display mode differences across window environments (OpenChamberVisualSettings.tsx).
  "settings.openchamber.visual.field.installOrientationHint": true,
};

/**
 * Disallow static prose description={t(...)} on SettingsCheckboxRow and SettingsFieldRow.
 * Explanatory prose belongs behind the info icon (info=). Visible descriptions
 * are reserved for conditional status, warnings, errors, or approved exceptions.
 */
export const noStaticRowDescriptionRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow static prose description={t(...)} on SettingsCheckboxRow and SettingsFieldRow; move explanatory prose behind info=.",
    },
    messages: {
      staticDescription:
        "Static prose on {{component}} belongs behind the info icon (info=). A visible description is reserved for conditional status, warnings, errors, or approved exceptions (see PATTERNS.md).",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier") return;
        const tagName = node.name.name;
        if (tagName !== "SettingsCheckboxRow" && tagName !== "SettingsFieldRow") return;

        const descAttr = node.attributes.find(
          (attr): attr is ESTree.JSXAttribute =>
            attr.type === "JSXAttribute" &&
            attr.name.type === "JSXIdentifier" &&
            attr.name.name === "description",
        );
        if (!descAttr || !descAttr.value) return;

        // Check if value is static prose: string literal or static t(...) call
        if (descAttr.value.type === "Literal" && typeof descAttr.value.value === "string") {
          context.report({
            node: descAttr,
            messageId: "staticDescription",
            data: { component: tagName },
          });
          return;
        }

        if (descAttr.value.type === "JSXExpressionContainer") {
          const expr = descAttr.value.expression;
          if (
            expr.type === "CallExpression" &&
            expr.callee.type === "Identifier" &&
            expr.callee.name === "t"
          ) {
            const firstArg = expr.arguments[0];
            if (
              firstArg &&
              firstArg.type === "Literal" &&
              typeof firstArg.value === "string" &&
              ALLOWLIST_KEYS[firstArg.value]
            ) {
              return;
            }
            context.report({
              node: descAttr,
              messageId: "staticDescription",
              data: { component: tagName },
            });
          }
        }
      },
    };
  },
});
