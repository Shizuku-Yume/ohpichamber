import React from 'react';
import { cn } from '@/lib/utils';

import type { TodoPhase } from '../../todoData';

export const TodoCard: React.FC<{ phases: TodoPhase[] }> = React.memo(({ phases }) => (
  <div className="my-1 rounded-lg border border-border/60 bg-muted/10 px-3 py-2" data-testid="todo-card">
    {phases.map((phase) => (
      <section key={phase.name} className="mb-2 last:mb-0">
        <h4 className="typography-meta font-medium text-foreground">{phase.name}</h4>
        <ul className="mt-1 space-y-0.5">
          {phase.tasks.map((task) => (
            <li key={`${phase.name}:${task.content}`} data-status={task.status} aria-label={`${task.status}: ${task.content}`} className="flex items-start gap-2 typography-meta text-muted-foreground">
              <span aria-hidden="true" className={cn('mt-1 size-1.5 shrink-0 rounded-full', task.status === 'completed' ? 'bg-status-success' : task.status === 'blocked' ? 'bg-status-error' : 'bg-muted-foreground')} />
              <span className={cn(task.status === 'completed' && 'line-through opacity-70')}>{task.content}</span>
            </li>
          ))}
        </ul>
      </section>
    ))}
  </div>
));
TodoCard.displayName = 'TodoCard';
