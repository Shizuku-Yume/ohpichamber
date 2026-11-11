import { eslintCompatPlugin } from "@oxlint/plugins";

import { noModelRefSplittingRule } from "./rules/no-model-ref-splitting.ts";
import { noPhysicalSidesRule } from "./rules/no-physical-sides.ts";
import { noToolNameLiteralRule } from "./rules/no-tool-name-literal.ts";

/** OpenChamber's own lint rules, run by `oxlint.config.ts`. */
const openchamberPlugin = eslintCompatPlugin({
  meta: { name: "openchamber" },
  rules: {
    "no-model-ref-splitting": noModelRefSplittingRule,
    "no-physical-sides": noPhysicalSidesRule,
    "no-tool-name-literal": noToolNameLiteralRule,
  },
});

export default openchamberPlugin;
