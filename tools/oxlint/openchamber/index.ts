import { eslintCompatPlugin } from "@oxlint/plugins";

import { noCrossSourceTimeCompareRule } from "./rules/no-cross-source-time-compare.ts";
import { noModelRefSplittingRule } from "./rules/no-model-ref-splitting.ts";
import { noPhysicalSidesRule } from "./rules/no-physical-sides.ts";
import { noToolNameLiteralRule } from "./rules/no-tool-name-literal.ts";
import { noStaticRowDescriptionRule } from "./rules/no-static-row-description.ts";

/** OpenChamber's own lint rules, run by `oxlint.config.ts`. */
const openchamberPlugin = eslintCompatPlugin({
  meta: { name: "openchamber" },
  rules: {
    "no-cross-source-time-compare": noCrossSourceTimeCompareRule,
    "no-model-ref-splitting": noModelRefSplittingRule,
    "no-physical-sides": noPhysicalSidesRule,
    "no-tool-name-literal": noToolNameLiteralRule,
    "no-static-row-description": noStaticRowDescriptionRule,
  },
});

export default openchamberPlugin;
