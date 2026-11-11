import { eslintCompatPlugin } from "@oxlint/plugins";

import { noPhysicalSidesRule } from "./rules/no-physical-sides.ts";
import { noCrossSourceTimeCompareRule } from "./rules/no-cross-source-time-compare.ts";

/** OpenChamber's own lint rules, run by `oxlint.config.ts`. */
const openchamberPlugin = eslintCompatPlugin({
  meta: { name: "openchamber" },
  rules: {
    "no-physical-sides": noPhysicalSidesRule,
    "no-cross-source-time-compare": noCrossSourceTimeCompareRule,
  },
});

export default openchamberPlugin;
