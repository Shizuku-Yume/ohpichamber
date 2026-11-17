import React from 'react';
import { useSessionTodos } from '@/sync/sync-context';
import { TodoCard } from './message/parts/TodoCard';

/**
 * The composer's todo row. It shows the plan's current task and progress in
 * one folded line and expands to every phase; the checklist itself lives in
 * `TodoCard`, which the todo tool's result body also uses.
 */
export const TodoTray: React.FC<{ sessionId: string | null; directory?: string | null }> = React.memo(({ sessionId, directory }) => {
  const phases = useSessionTodos(sessionId, directory ?? undefined);
  return phases.length > 0 ? <div className="border-b border-border/60 px-3 py-2" data-testid="todo-tray"><TodoCard phases={phases} /></div> : null;
});
TodoTray.displayName = 'TodoTray';
