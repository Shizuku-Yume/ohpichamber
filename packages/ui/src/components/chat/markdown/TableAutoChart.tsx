import React from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface TableAutoChartProps {
  headers: string[];
  rows: string[][];
  className?: string;
}

const NUMBER_RE = /^([~≈<>≤≥])?\s*([+\-−])?\s*[$€£¥]?\s*(\d+(?:,\d{3})*(?:\.\d+)?|\.\d+)\s*(%|[a-zA-Zµμ]+(?:\/[a-zA-Z]+)?)?$/;

function parseNumericValue(text: string): { value: number; figure: string } | null {
  const clean = text.replace(/[*_`]/g, '').trim();
  const match = NUMBER_RE.exec(clean);
  if (!match) return null;
  const numPart = match[3]!.replace(/,/g, '');
  const rawNum = parseFloat(numPart);
  if (!Number.isFinite(rawNum)) return null;
  const sign = match[2] === '-' || match[2] === '−' ? -1 : 1;
  return { value: rawNum * sign, figure: clean };
}

function extractColumnUnit(header: string | undefined, sampleCells: string[]): string {
  if (header) {
    const parenMatch = /\(([^)]+)\)/.exec(header);
    if (parenMatch) return parenMatch[1]!.trim().toLowerCase();
    const bracketMatch = /\[([^\]]+)\]/.exec(header);
    if (bracketMatch) return bracketMatch[1]!.trim().toLowerCase();
  }
  for (const cell of sampleCells) {
    if (!cell) continue;
    const clean = cell.replace(/[*_`]/g, '').trim();
    const match = NUMBER_RE.exec(clean);
    if (match?.[4]) return match[4].trim().toLowerCase();
    if (clean.includes('%')) return '%';
    if (clean.includes('$')) return '$';
    if (clean.includes('€')) return '€';
    if (clean.includes('£')) return '£';
    if (clean.includes('¥')) return '¥';
  }
  return '';
}

const SERIES_COLORS = [
  'var(--primary)',
  'var(--status-success)',
  'var(--status-warning)',
  'var(--tools-icon)',
  'var(--status-error)',
  'var(--accent)',
];

export function TableAutoChart({ headers, rows, className }: TableAutoChartProps) {
  const { t } = useI18n();
  const chartData = React.useMemo(() => {
    if (rows.length < 2 || headers.length < 2) return null;

    // Detect which columns are numeric
    const colCount = Math.max(headers.length, ...rows.map((r) => r.length));
    const numericCols: number[] = [];
    for (let c = 0; c < colCount; c++) {
      let numericCount = 0;
      for (const row of rows) {
        if (row[c] && parseNumericValue(row[c]) !== null) {
          numericCount++;
        }
      }
      // If at least half the cells in this column are numbers, treat as measure column
      if (numericCount >= Math.ceil(rows.length * 0.5)) {
        numericCols.push(c);
      }
    }
    if (numericCols.length === 0) return null;

    // Filter for compatible units so incomparable measurements (e.g. ms vs %) are not mixed on one axis
    const colUnits = numericCols.map((c) => extractColumnUnit(headers[c], rows.map((r) => r[c] ?? '')));
    const unitCounts = new Map<string, number>();
    for (const u of colUnits) {
      unitCounts.set(u, (unitCounts.get(u) ?? 0) + 1);
    }
    let primaryUnit = colUnits[0] ?? '';
    let maxCount = 0;
    for (const [u, count] of unitCounts) {
      if (u !== '%' && count > maxCount) {
        primaryUnit = u;
        maxCount = count;
      }
    }
    if (maxCount === 0 && unitCounts.has('%')) {
      primaryUnit = '%';
    }
    const activeCols = numericCols.filter((_, idx) => colUnits[idx] === primaryUnit);
    if (activeCols.length === 0) return null;

    // First non-numeric column is the label column (default to col 0 if none)
    const labelCol = Array.from({ length: colCount }, (_, i) => i).find((i) => !numericCols.includes(i)) ?? 0;

    // Build data items
    let minVal = 0;
    let maxVal = 0;
    const items = rows.map((row) => {
      const label = (row[labelCol] ?? '').replace(/[*_`]/g, '').trim() || '—';
      const values = activeCols.map((c) => {
        const parsed = row[c] ? parseNumericValue(row[c]) : null;
        const val = parsed?.value ?? 0;
        if (val > maxVal) maxVal = val;
        if (val < minVal) minVal = val;
        return { val, figure: parsed?.figure ?? '' };
      });
      return { label, values };
    });

    const min = minVal < 0 ? minVal : 0;
    const max = Math.max(1, maxVal);
    const range = Math.max(1, max - min);
    return {
      labelCol,
      numericCols: activeCols,
      seriesNames: activeCols.map((c) => (headers[c] ?? `Col ${c + 1}`).replace(/[*_`]/g, '').trim()),
      items,
      minVal: min,
      maxVal: max,
      range,
    };
  }, [headers, rows]);

  if (!chartData) return null;

  const { seriesNames, items } = chartData;
  const rowHeight = Math.max(28, seriesNames.length * 18 + 12);
  const chartHeight = 36 + items.length * rowHeight;
  const labelWidth = 120;
  const chartWidth = 600;
  const barAreaWidth = chartWidth - labelWidth - 80;

  return (
    <figure
      data-oc-table-chart=""
      className={cn(
        'group/table-chart my-2 w-full max-w-full overflow-x-auto rounded-lg border border-border/40 bg-card/60 p-3 flex flex-col gap-2',
        className
      )}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
        <span>{t('markdownRenderer.table.chartTitle') || 'Table Chart'}</span>
        {seriesNames.length > 1 && (
          <div className="flex items-center gap-3">
            {seriesNames.map((name, sIdx) => (
              <div key={sIdx} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: SERIES_COLORS[sIdx % SERIES_COLORS.length] }}
                />
                <span className="truncate max-w-[120px]">{name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto min-w-[480px] font-sans text-xs"
          role="img"
          aria-label={t('markdownRenderer.table.chartTitle') || 'Table numeric chart visualization'}
        >
          {/* Background grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const x = labelWidth + pct * barAreaWidth;
            const tickVal = Math.round(chartData.minVal + pct * chartData.range);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={24}
                  x2={x}
                  y2={chartHeight - 8}
                  stroke="currentColor"
                  strokeOpacity={0.08}
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={18}
                  textAnchor="middle"
                  fill="currentColor"
                  fillOpacity={0.5}
                  fontSize={10}
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Rows and bars */}
          {items.map((item, rowIdx) => {
            const y = 30 + rowIdx * rowHeight;
            const singleBarHeight = Math.min(14, Math.floor((rowHeight - 10) / seriesNames.length));

            return (
              <g key={rowIdx} className="group/row">
                {/* Category label */}
                <text
                  x={labelWidth - 8}
                  y={y + rowHeight / 2 - 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill="currentColor"
                  className="font-medium"
                  fontSize={11}
                >
                  {item.label.length > 18 ? `${item.label.slice(0, 17)}…` : item.label}
                </text>

                {/* Bars for each series */}
                {item.values.map((v, sIdx) => {
                  const barY = y + 4 + sIdx * (singleBarHeight + 3);
                  const zeroX = labelWidth + ((0 - chartData.minVal) / chartData.range) * barAreaWidth;
                  const barW = Math.max(2, (Math.abs(v.val) / chartData.range) * barAreaWidth);
                  const barX = v.val >= 0 ? zeroX : zeroX - barW;
                  const color = SERIES_COLORS[sIdx % SERIES_COLORS.length];

                  return (
                    <g key={sIdx}>
                      <rect
                        x={barX}
                        y={barY}
                        width={barW}
                        height={singleBarHeight}
                        rx={2}
                        fill={color}
                        fillOpacity={0.85}
                      />
                      <text
                        x={v.val >= 0 ? barX + barW + 6 : barX - 6}
                        y={barY + singleBarHeight / 2}
                        textAnchor={v.val >= 0 ? 'start' : 'end'}
                        dominantBaseline="central"
                        fill="currentColor"
                        fillOpacity={0.75}
                        fontSize={10}
                      >
                        {v.figure || v.val}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
