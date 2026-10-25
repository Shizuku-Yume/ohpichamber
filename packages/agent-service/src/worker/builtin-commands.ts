import { executeAcpBuiltinSlashCommand } from '@oh-my-pi/pi-coding-agent/slash-commands/acp-builtins';
import { parseSlashCommand } from '@oh-my-pi/pi-coding-agent/slash-commands/helpers/parse';

export const ALLOWED_BUILTIN_COMMANDS = ['compact', 'shake', 'todo', 'jobs', 'usage', 'context', 'tools'] as const;
export const READ_ONLY_BUILTIN_COMMANDS: Partial<Record<typeof ALLOWED_BUILTIN_COMMANDS[number], true>> = {
  todo: true,
  jobs: true,
  usage: true,
  context: true,
  tools: true,
};

export function isAllowedBuiltinCommand(name: string): boolean {
  return (ALLOWED_BUILTIN_COMMANDS as readonly string[]).includes(name);
}

export { executeAcpBuiltinSlashCommand, parseSlashCommand };
export type AllowedBuiltinCommand = typeof ALLOWED_BUILTIN_COMMANDS[number];
