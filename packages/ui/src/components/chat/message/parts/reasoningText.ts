import { isInvisibleText } from '@/lib/invisibleText';

// gpt-5.x reasoning summaries pad every part with an empty HTML comment
// (`**Headline**\n\n<!-- -->`), streamed as a `<!--` delta followed by
// ` -->`. Comments with actual content are left untouched. Same rule as OMP's
// thinking display.
const EMPTY_COMMENT_RE = /^<!--\s*-->$/;
const OPEN_COMMENT_RE = /^<!--\s*$/;
const INLINE_COMMENT_RE = /<!--\s*-->/g;
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})\s*$/;

/** An empty HTML comment, or its still-unterminated `<!--` prefix on the last line while streaming. */
const isCommentNoise = (line: string, isLastLine: boolean): boolean => {
    const trimmed = line.trim();
    return EMPTY_COMMENT_RE.test(trimmed) || (isLastLine && OPEN_COMMENT_RE.test(trimmed));
};

type Fence = {
    char: string;
    length: number;
};

/**
 * Normalizes reasoning text for display without destroying its structure.
 *
 * Paragraph breaks are meaningful: OMP folds provider summary parts with
 * `\n\n`, and blank-line suppression turned a multi-paragraph thought into one
 * running paragraph. Genuinely empty lines survive; invisible-only lines
 * (zero-width space and friends) become empty lines instead of being deleted,
 * keeping the anti-blank-line intent of #5215 without joining paragraphs; runs
 * of blank lines collapse to one. `<!-- -->` sentinel lines are removed
 * outside fenced code, and a leading `> ` blockquote marker is stripped.
 * Fenced code stays verbatim.
 */
export const cleanReasoningText = (text: string): string => {
    if (isInvisibleText(text)) {
        return '';
    }

    const lines = text.split('\n');
    const out: string[] = [];
    let pendingBlank = false;
    let fence: Fence | null = null;

    const pushBlank = () => {
        if (pendingBlank) return;
        pendingBlank = true;
        out.push('');
    };

    const pushLine = (line: string) => {
        pendingBlank = false;
        out.push(line);
    };

    for (let index = 0; index < lines.length; index += 1) {
        const raw = lines[index];
        const unquoted = raw.replace(/^>\s?/, '');

        if (fence) {
            out.push(raw);
            const close = FENCE_CLOSE_RE.exec(raw.trimEnd());
            if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
                fence = null;
            }
            continue;
        }

        const line = unquoted.trimEnd();
        const open = FENCE_OPEN_RE.exec(line);
        if (open) {
            pushLine(line);
            fence = { char: open[1][0], length: open[1].length };
            continue;
        }

        if (isCommentNoise(line, index === lines.length - 1)) {
            continue;
        }

        const withoutSentinel = line.replace(INLINE_COMMENT_RE, '').trimEnd();
        if (isInvisibleText(withoutSentinel)) {
            pushBlank();
            continue;
        }

        pushLine(withoutSentinel);
    }

    return out.join('\n').trim();
};
