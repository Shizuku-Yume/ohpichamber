import type { JsonObject, JsonValue } from '@openchamber/agent-contract';

import type { IconName } from '@/components/icon/icons';

/**
 * How calls share activity rows. `read` collects consecutive reads into one
 * row of files; `search` shows the patterns side by side; every other tool is
 * its own expandable row.
 */
export type ToolGroup = 'read' | 'search' | 'call';

type ToolOutputLanguage = 'diff' | 'auto' | 'text';

/** Everything the chat knows about one OMP tool, keyed by its native name. */
export interface ToolPresentation {
    /** The name the row shows; OMP's own title where it has one. */
    label: string;
    icon: IconName;
    group: ToolGroup;
    /** Code language for the result body, resolved from the path when `auto`. */
    outputLanguage: ToolOutputLanguage;
    /** One line describing the call from its arguments, or null. */
    describeCall: (input: JsonObject) => string | null;
    /** One line summarizing the result from the SDK's `details`, or null. */
    describeResult: (details: JsonValue | undefined) => string | null;
}
