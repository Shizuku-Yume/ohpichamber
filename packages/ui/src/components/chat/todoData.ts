export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned' | 'blocked';
export interface TodoItem { content: string; status: TodoStatus; blocker?: string }
export interface TodoPhase { name: string; tasks: TodoItem[] }

const STATUSES: Record<TodoStatus, true> = { pending: true, in_progress: true, completed: true, abandoned: true, blocked: true };
const isTodoStatus = (value: string): value is TodoStatus => Object.hasOwn(STATUSES, value);
const readField = (value: object, key: string): unknown => key in value ? Reflect.get(value, key) : undefined;

/** OMP todo details are parsed defensively because transcript data may predate the current result shape. */
export function extractTodoPhases(value: unknown): TodoPhase[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const phases = readField(value, 'phases');
  if (!Array.isArray(phases)) return null;
  const parsed: TodoPhase[] = [];
  for (const phase of phases) {
    if (!phase || typeof phase !== 'object' || Array.isArray(phase)) return null;
    const name = readField(phase, 'name');
    const tasks = readField(phase, 'tasks');
    if (typeof name !== 'string' || !Array.isArray(tasks)) return null;
    const items: TodoItem[] = [];
    for (const task of tasks) {
      if (!task || typeof task !== 'object' || Array.isArray(task)) return null;
      const content = readField(task, 'content');
      const status = readField(task, 'status');
      if (typeof content !== 'string' || typeof status !== 'string' || !isTodoStatus(status)) return null;
      const blocker = readField(task, 'blocker');
      items.push({ content, status, ...(typeof blocker === 'string' ? { blocker } : {}) });
    }
    parsed.push({ name, tasks: items });
  }
  return parsed;
}
