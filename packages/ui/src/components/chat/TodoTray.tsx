import React from 'react';
import { useSessionMessageLoadState, useSessionMessageLoader, useSessionMessages, useDirectorySync } from '@/sync/sync-context';
import { TodoCard } from './message/parts/TodoCard';
import { latestTodoPhases } from './todoHistory';
import { hasOpenTodo, hasTodoTasks } from './todoProgress';

/**
 * The composer's todo row. It shows the plan's current task and progress in
 * one folded line and expands to every phase; the checklist itself lives in
 * `TodoCard`, which the todo tool's result body also uses. The row appears only
 * while a task is open — a plan with no tasks, or one whose tasks are all
 * completed or abandoned, leaves no tray behind.
 */
export const TodoTray: React.FC<{ sessionId: string | null; directory?: string | null }> = React.memo(({ sessionId, directory }) => {
  const activeDirectory = directory ?? undefined;
  const messages = useSessionMessages(sessionId ?? '', activeDirectory);
  const load = useSessionMessageLoadState(sessionId ?? '', activeDirectory);
  const loader = useSessionMessageLoader();
  const branchKey = useDirectorySync(React.useCallback((state) => {
    const branch = state.snapshot[sessionId ?? '']?.branch;
    return branch ? `${branch.branchId}:${branch.branchVersion}` : '';
  }, [sessionId]), activeDirectory);
  const phases = React.useMemo(() => sessionId ? latestTodoPhases(messages) : null, [messages, sessionId]);
  const loadKey = `${activeDirectory ?? ''}\u0000${sessionId ?? ''}\u0000${branchKey}`;
  const requestedHistory = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!sessionId || !activeDirectory || !branchKey || phases !== null || load.complete || load.status === 'error' || requestedHistory.current === loadKey) return;
    requestedHistory.current = loadKey;
    void loader.loadComplete({ directory: activeDirectory, sessionId }).catch(() => undefined);
  }, [activeDirectory, branchKey, load.complete, load.status, loadKey, loader, phases, sessionId]);
  return phases && hasTodoTasks(phases) && hasOpenTodo(phases) ? <div className="border-b border-border/60 px-3 py-2" data-testid="todo-tray"><TodoCard phases={phases} /></div> : null;
});
TodoTray.displayName = 'TodoTray';
