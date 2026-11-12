import type { TodoItem, TodoPhase } from './todoData';

/** A task that no longer needs work: OMP counts completed and abandoned alike. */
export const isClosedTodo = (task: TodoItem): boolean => task.status === 'completed' || task.status === 'abandoned';

export interface TodoProgress {
    closed: number;
    total: number;
}

export const todoProgress = (phases: readonly TodoPhase[]): TodoProgress => {
    let closed = 0;
    let total = 0;
    for (const phase of phases) {
        for (const task of phase.tasks) {
            total += 1;
            if (isClosedTodo(task)) closed += 1;
        }
    }
    return { closed, total };
};

/**
 * The task the tray names while collapsed: the one being worked on, else the
 * next one waiting, else the last task that closed (so a finished plan still
 * says what it finished).
 */
export const activeTodoTask = (phases: readonly TodoPhase[]): TodoItem | null => {
    let firstPending: TodoItem | null = null;
    let lastClosed: TodoItem | null = null;
    for (const phase of phases) {
        for (const task of phase.tasks) {
            if (task.status === 'in_progress') return task;
            if (!firstPending && task.status === 'pending') firstPending = task;
            if (isClosedTodo(task)) lastClosed = task;
        }
    }
    return firstPending ?? lastClosed;
};
