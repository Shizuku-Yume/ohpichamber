/**
 * The response-style text a Host prompt carries.
 *
 * AGENTS.md rules are NOT sent from here: OMP discovers and loads the global
 * `<agentDir>/AGENTS.md` and the project `AGENTS.md` itself as context files,
 * so re-adding them to the prompt would duplicate them. The Behavior page
 * writes those two files and nothing else.
 *
 * The response style is an OpenChamber preference OMP has no concept of, so it
 * is the one thing delivered here. It travels as an `instruction` context
 * entry, which the Agent Service renders as a `developer` message and the
 * projection keeps out of the visible transcript.
 *
 * Zero-injection: an unset, `default`, or blank-custom preference resolves to
 * an empty string and contributes exactly 0 bytes and no context entry.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MAX_RESPONSE_STYLE_LENGTH = 50_000;

/** `[]` for every case that must add no prompt bytes; one instruction otherwise. */
export const resolveBehaviorPromptContext = (settings) => {
  if (settings?.responseStyleEnabled !== true) return [];
  const instruction = typeof settings?.responseStyleInstruction === 'string'
    ? settings.responseStyleInstruction.trim()
    : '';
  if (!instruction) return [];
  return [{
    kind: 'instruction',
    text: instruction.length <= MAX_RESPONSE_STYLE_LENGTH
      ? instruction
      : instruction.slice(0, MAX_RESPONSE_STYLE_LENGTH),
  }];
};

/**
 * Reads the merged settings document the Host already owns. A missing or
 * unreadable file resolves to no injection, so a first run sends nothing.
 */
export const createBehaviorPromptSource = ({
  fsModule = fs,
  pathModule = path,
  settingsFilePath = path.join(
    process.env.OPENCHAMBER_DATA_DIR
      ? path.resolve(process.env.OPENCHAMBER_DATA_DIR)
      : path.join(os.homedir(), '.config', 'ohpichamber'),
    'settings.json',
  ),
  readMergedSettings,
} = {}) => {
  if (typeof readMergedSettings !== 'function') {
    throw new TypeError('behavior prompt source requires a merged settings reader');
  }
  return () => resolveBehaviorPromptContext(readMergedSettings({
    fs: fsModule,
    path: pathModule,
    settingsFilePath,
  }));
};
