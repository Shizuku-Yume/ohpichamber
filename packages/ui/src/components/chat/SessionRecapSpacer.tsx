import React from 'react';
import { useSessionAssistState } from '@/hooks/useSessionAssist';
import { useI18n } from '@/lib/i18n';
import { Icon } from '@/components/icon/Icon';
import { SimpleMarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { cn } from '@/lib/utils';
interface SessionRecapNoteProps {
  sessionId: string;
  directory?: string;
  isMobile: boolean;
}

// Quiet one-paragraph recap of the agent's last reply. A hint about the
// current state rather than part of the transcript: it floats over the
// reserved band above the composer (the same anchor as the working status
// row, which it never overlaps with — one needs an idle session, the other
// a working one), fades with that anchor when the reader scrolls away from
// the end, and simply vanishes in place once a new message makes it stale.
// Appears only after the 1-minute quiet window.
export const SessionRecapNote: React.FC<SessionRecapNoteProps> = React.memo(({ sessionId, directory, isMobile }) => {
  const { visibleRecap } = useSessionAssistState(sessionId, directory);
  const { t } = useI18n();

  if (!visibleRecap) {
    return null;
  }

  return (
    <div aria-label={t('chat.recap.aria')} className="px-1">
      <span className={`typography-meta text-muted-foreground/70 ${isMobile ? 'line-clamp-3' : 'line-clamp-2'}`}>
        <span className="italic text-muted-foreground/50">{t('chat.recap.label')} </span>
        {visibleRecap}
      </span>
    </div>
  );
});

SessionRecapNote.displayName = 'SessionRecapNote';

export interface CompactionDividerProps {
  method?: string;
  tokensBefore: number;
  tokensAfter?: number;
  summary?: string;
  warning?: string;
  className?: string;
}

const NORMALIZE_METHOD_MAP: Record<string, string> = {
  soft: 'soft-compacted',
  'context-full': 'soft-compacted',
  remote: 'remote-compacted',
  shake: 'shaken',
  snapcompact: 'snap-compacted',
  handoff: 'handed-off',
};

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(tokens);
}

export const CompactionDivider: React.FC<CompactionDividerProps> = React.memo(({
  method,
  tokensBefore,
  tokensAfter,
  summary,
  warning,
  className,
}) => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const raw = (method ?? 'compacted').toLowerCase().trim();
  const normalizedKey = NORMALIZE_METHOD_MAP[raw] ?? (raw.endsWith('-compacted') || raw === 'shaken' || raw === 'handed-off' ? raw : 'compacted');
  const methodKey = `chat.compaction.method.${normalizedKey}` as unknown as Parameters<typeof t>[0];
  const methodLabel = t(methodKey) || normalizedKey;

  const hasReduction = tokensAfter !== undefined && tokensBefore > 0;
  const badgeText = hasReduction
    ? `${formatTokens(tokensBefore)} → ${formatTokens(tokensAfter)} tokens`
    : tokensBefore > 0
      ? `${formatTokens(tokensBefore)} tokens`
      : undefined;

  const hasSummary = Boolean(summary);

  return (
    <div
      data-compaction-divider=""
      data-compaction-method={normalizedKey}
      className={cn('group/compaction my-4 select-none', className)}
    >
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border/40" />

        <button
          type="button"
          onClick={hasSummary ? () => setIsExpanded(prev => !prev) : undefined}
          disabled={!hasSummary}
          aria-expanded={hasSummary ? isExpanded : undefined}
          aria-label={isExpanded ? (t('chat.compaction.collapseSummary') || 'Collapse compaction summary') : (t('chat.compaction.expandSummary') || 'Expand compaction summary')}
          className={cn(
            'flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur-sm transition-colors',
            hasSummary && 'hover:bg-muted/30 cursor-pointer'
          )}
        >
          <Icon name="archive" className="size-3.5 text-muted-foreground" />
          <span className="font-semibold text-foreground/80">{methodLabel}</span>
          {badgeText && (
            <span className="font-mono text-[11px] text-muted-foreground">
              · {badgeText}
            </span>
          )}
          {warning && (
            <Icon name="alert" className="size-3.5 text-status-warning" />
          )}
          {hasSummary && (
            <Icon
              name="arrow-down-s"
              className={cn('size-3.5 transition-transform duration-200 text-muted-foreground', isExpanded && 'rotate-180')}
            />
          )}
        </button>

        <div className="h-px flex-1 bg-border/40" />
      </div>

      {isExpanded && summary && (
        <div className="mt-2.5 mx-auto max-w-2xl rounded-xl border border-border/40 bg-card/60 p-4 text-xs shadow-xs space-y-2 animate-in fade-in-50 duration-150">
          <div className="text-[11px] font-medium text-muted-foreground">
            {hasReduction
              ? (t('chat.compaction.reducedTokens', { before: tokensBefore.toLocaleString(), after: tokensAfter.toLocaleString() }) || `Compacted from ${tokensBefore.toLocaleString()} to ${tokensAfter.toLocaleString()} tokens`)
              : (t('chat.compaction.tokensCount', { tokens: tokensBefore.toLocaleString() }) || `Compacted from ${tokensBefore.toLocaleString()} tokens`)}
          </div>

          {warning && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg border border-status-warning/20 bg-status-warning/5 text-status-warning text-xs">
              <Icon name="alert" className="size-3.5 shrink-0" />
              <span>{t('chat.compaction.warning', { warning }) || `Warning: ${warning}`}</span>
            </div>
          )}

          <div className="text-foreground/90 leading-relaxed">
            <SimpleMarkdownRenderer content={summary} variant="assistant" />
          </div>
        </div>
      )}
    </div>
  );
});

CompactionDivider.displayName = 'CompactionDivider';
