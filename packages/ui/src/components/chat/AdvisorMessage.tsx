import React from 'react';
import { Icon } from '@/components/icon/Icon';
import type { AdvisorNote } from '@openchamber/agent-contract';

export interface AdvisorMessageProps {
  notes: AdvisorNote[];
  className?: string;
}

export const AdvisorMessage: React.FC<AdvisorMessageProps> = ({ notes, className = '' }) => {
  if (!notes || notes.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-border/80 bg-card p-3 my-2 text-xs shadow-sm ${className}`}
      data-testid="advisor-message-card"
    >
      <div className="flex items-center gap-2 mb-2 font-medium text-foreground">
        <Icon name="ai-agent" className="size-4 text-primary" />
        <span>Advisor Watchdog</span>
        <span className="text-muted-foreground text-[11px]">({notes.length} advisory note{notes.length === 1 ? '' : 's'})</span>
      </div>

      <div className="flex flex-col gap-2">
        {notes.map((note) => {
          const isBlocker = note.severity === 'blocker';
          const isConcern = note.severity === 'concern';
          const severityClass = isBlocker
            ? 'bg-destructive/15 text-destructive border-destructive/30'
            : isConcern
              ? 'bg-warning/15 text-warning border-warning/30'
              : 'bg-muted text-muted-foreground border-border/50';

          return (
            <div
              key={note.noteId}
              className={`border-l-2 pl-2.5 py-1 ${
                isBlocker
                  ? 'border-l-destructive'
                  : isConcern
                    ? 'border-l-warning'
                    : 'border-l-muted-foreground'
              }`}
              data-testid={`advisor-note-${note.noteId}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${severityClass}`}
                >
                  {note.severity}
                </span>
                {note.advisorName && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    @{note.advisorName}
                  </span>
                )}
              </div>
              <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {note.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
