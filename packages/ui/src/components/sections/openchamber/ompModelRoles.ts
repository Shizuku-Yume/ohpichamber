export interface RoleDefinition {
  id: string;
  tag: string;
  fallbackRole?: string;
}

export const OMP_MODEL_ROLES: readonly RoleDefinition[] = [
  { id: 'default', tag: 'DEFAULT' },
  { id: 'smol', tag: 'SMOL', fallbackRole: 'default' },
  { id: 'slow', tag: 'SLOW', fallbackRole: 'default' },
  { id: 'vision', tag: 'VISION', fallbackRole: 'default' },
  { id: 'plan', tag: 'PLAN', fallbackRole: 'default' },
  { id: 'commit', tag: 'COMMIT', fallbackRole: 'smol' },
  { id: 'tiny', tag: 'TINY', fallbackRole: 'smol' },
  { id: 'memory', tag: 'MEMORY', fallbackRole: 'tiny' },
  { id: 'task', tag: 'TASK', fallbackRole: 'default' },
  { id: 'advisor', tag: 'ADVISOR', fallbackRole: 'slow' },
  { id: 'widget', tag: 'WIDGET', fallbackRole: 'smol' },
  { id: 'image', tag: 'IMAGE' },
  { id: 'web', tag: 'WEB', fallbackRole: 'default' },
  { id: 'speech', tag: 'SPEECH' },
  { id: 'dictation', tag: 'DICTATION' },
  { id: 'judge', tag: 'JUDGE', fallbackRole: 'default' },
] as const;

export interface ParsedRoleSelector {
  model: string;
  effort: string;
}

export function parseRoleSelector(selector: unknown): ParsedRoleSelector {
  if (typeof selector !== 'string') return { model: '', effort: '' };
  const trimmed = selector.trim();
  if (!trimmed) return { model: '', effort: '' };
  const colonIndex = trimmed.lastIndexOf(':');
  if (colonIndex > 0) {
    const base = trimmed.slice(0, colonIndex);
    const suffix = trimmed.slice(colonIndex + 1);
    const knownEfforts = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'auto'];
    if (knownEfforts.includes(suffix.toLowerCase())) {
      return { model: base, effort: suffix };
    }
  }
  return { model: trimmed, effort: '' };
}

export function formatRoleSelector(model: string, effort: string): string {
  const trimmedModel = model.trim();
  if (!trimmedModel) return '';
  const trimmedEffort = effort.trim();
  if (!trimmedEffort || trimmedEffort === 'default' || trimmedEffort === '__default__') return trimmedModel;
  return `${trimmedModel}:${trimmedEffort}`;
}

export function resolveRoleFallback(
  roleId: string,
  modelRoles: Record<string, string> = {}
): { role: string; model?: string } | null {
  const def = OMP_MODEL_ROLES.find(r => r.id === roleId);
  if (!def || !def.fallbackRole) return null;
  let curr: string | undefined = def.fallbackRole;
  const visited = new Set<string>([roleId]);
  while (curr && !visited.has(curr)) {
    visited.add(curr);
    const configured = modelRoles[curr];
    if (typeof configured === 'string' && configured.trim()) {
      return { role: curr, model: configured.trim() };
    }
    const nextDef = OMP_MODEL_ROLES.find(r => r.id === curr);
    curr = nextDef?.fallbackRole;
  }
  return { role: def.fallbackRole };
}
