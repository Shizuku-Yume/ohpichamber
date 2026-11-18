import React from 'react';
import { useSessionTodos } from '@/sync/sync-context';
import { TodoCard } from './message/parts/TodoCard';
import { hasOpenTodo, hasTodoTasks } from './todoProgress';

/**
 * The composer's todo row. It shows the plan's current task and progress in
 * one folded line and expands to every phase; the checklist itself lives in
 * `TodoCard`, which the todo tool's result body also uses. The row appears only
 * while a task is open — a plan with no tasks, or one whose tasks are all
 * completed or abandoned, leaves no tray behind.
 */
export const TodoTray: React.FC<{ sessionId: string | null; directory?: string | null }> = React.memo(({ sessionId, directory }) => {
  const phases = useSessionTodos(sessionId, directory ?? undefined);
  return hasTodoTasks(phases) && hasOpenTodo(phases) ? <div className="border-b border-border/60 px-3 py-2" data-testid="todo-tray"><TodoCard phases={phases} /></div> : null;
});
TodoTray.displayName = 'TodoTray';
