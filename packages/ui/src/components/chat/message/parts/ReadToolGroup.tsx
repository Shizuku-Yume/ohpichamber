import React from 'react';
import type { ToolCallPart, ToolResultPart } from '@openchamber/agent-contract';
import { toAbsoluteFilePath, getRelativeFilePath } from '@/lib/path-utils';
import { useUIStore } from '@/stores/useUIStore';
import { Icon } from '@/components/icon/Icon';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { RuntimeAPIContext } from '@/contexts/runtimeAPIContext';

export interface ReadToolGroupItem {
  part: ToolCallPart | ToolResultPart;
  pairedCall?: ToolCallPart;
  path: string;
  line?: number;
  isError: boolean;
  isRunning: boolean;
  errorMessage?: string;
}

interface ReadToolGroupProps {
  items: ReadToolGroupItem[];
  directory: string;
  className?: string;
  initialExpanded?: boolean;
}

export function ReadToolGroup({ items, directory, className, initialExpanded = false }: ReadToolGroupProps) {
  const [isExpanded, setIsExpanded] = React.useState(initialExpanded);
  const runtime = React.useContext(RuntimeAPIContext);
  const { t } = useI18n();

  if (items.length === 0) return null;

  const openFileAtLine = (filePath: string, line: number | undefined, event: React.MouseEvent) => {
    event.stopPropagation();
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(filePath)) return;
    const absolutePath = toAbsoluteFilePath(directory, filePath);
    if (runtime?.editor) {
      void runtime.editor.openFile(absolutePath, line);
      return;
    }
    const uiStore = useUIStore.getState();
    if (line !== undefined && Number.isFinite(line)) {
      uiStore.openContextFileAtLine(directory, absolutePath, Math.max(1, Math.trunc(line)), 1);
    } else {
      uiStore.openContextFile(directory, absolutePath);
    }
  };

  const hasErrors = items.some((item) => item.isError);
  const isAnyRunning = items.some((item) => item.isRunning);

  return (
    <div
      data-read-tool-group=""
      className={cn(
        'group/read-group my-1 rounded-xl border border-border/40 bg-card/40 transition-colors',
        className
      )}
    >
      {/* Header bar */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-interactive-hover/40 rounded-xl"
      >
        <span
          className={cn(
            'flex items-center justify-center transition-transform duration-150',
            isExpanded ? 'rotate-90' : 'rotate-0'
          )}
          style={{ color: 'var(--tools-icon)' }}
        >
          <Icon name="arrow-right-s" className="size-3.5" />
        </span>

        <span
          className="flex items-center justify-center shrink-0"
          style={{ color: hasErrors ? 'var(--status-error)' : 'var(--tools-icon)' }}
        >
          <Icon name="file-text" className="size-3.5" />
        </span>

        <span className="typography-meta font-medium flex-shrink-0" style={{ color: 'var(--tools-title)' }}>
          {t('chat.readGroup.title', { count: items.length })}
        </span>

        {/* Inline preview when collapsed */}
        {!isExpanded && (
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden text-xs text-muted-foreground">
            <span className="truncate">
              {items
                .map((i) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(i.path) ? i.path : getRelativeFilePath(i.path, directory)))
                .join(', ')}
            </span>
          </div>
        )}

        {/* Status badges */}
        <div className="ms-auto flex items-center gap-1 shrink-0 text-xs">
          {isAnyRunning && (
            <span className="text-muted-foreground text-[11px]">
              {t('chat.readGroup.running')}
            </span>
          )}
          {hasErrors && (
            <span className="text-status-error text-[11px] font-medium">
              {t('chat.readGroup.failed')}
            </span>
          )}
        </div>
      </div>

      {/* Expanded tree */}
      {isExpanded && (
        <div className="border-t border-border/20 px-3 py-1.5 space-y-1 font-mono text-xs">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            const branch = isLast ? '└── ' : '├── ';
            const displayPath = /^[a-z][a-z0-9+.-]*:\/\//i.test(item.path) ? item.path : getRelativeFilePath(item.path, directory);

            return (
              <div
                key={item.part.partId || item.path}
                className="flex items-center gap-1.5 py-0.5 hover:bg-interactive-hover/30 rounded px-1 group/item"
              >
                <span className="text-muted-foreground/50 select-none">{branch}</span>
                <span
                  className="shrink-0"
                  style={{
                    color: item.isError
                      ? 'var(--status-error)'
                      : item.isRunning
                        ? 'var(--tools-icon)'
                        : 'var(--status-success)',
                  }}
                >
                  <Icon
                    name={item.isError ? 'error-warning' : item.isRunning ? 'loader' : 'check'}
                    className={cn('size-3', item.isRunning && 'animate-spin')}
                  />
                </span>
                <div className="flex flex-col min-w-0">
                  {/^[a-z][a-z0-9+.-]*:\/\//i.test(item.path) ? (
                    <span
                      className="text-start font-mono truncate text-muted-foreground select-text"
                      title={displayPath}
                    >
                      {displayPath}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => openFileAtLine(item.path, item.line, e)}
                      className="text-start font-mono truncate text-foreground/90 hover:text-primary hover:underline cursor-pointer"
                      title={`${displayPath}${item.line ? `:${item.line}` : ''}`}
                    >
                      {displayPath}
                      {item.line !== undefined && (
                        <span className="text-muted-foreground/80">:{item.line}</span>
                      )}
                    </button>
                  )}
                  {item.isError && item.errorMessage && (
                    <span className="text-[11px] text-status-error truncate">
                      {item.errorMessage}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
