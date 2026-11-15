import { isInvisibleText } from '@/lib/invisibleText';

// gpt-5.x reasoning summaries pad every part with an empty HTML comment
// (`**Headline**\n\n<!-- -->`), streamed as a `<!--` delta followed by
// ` -->`. Comments with actual content are left untouched. Same rule as OMP's
// thinking display.
const EMPTY_COMMENT_RE = /^<!--\s*-->$/;
const OPEN_COMMENT_RE = /^<!--\s*$/;
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})\s*$/;

/** An empty HTML comment, or its still-unterminated `<!--` prefix on the last line while streaming. */
const isCommentNoise = (line: string, isLastLine: boolean): boolean => {
    const trimmed = line.trim();
    return EMPTY_COMMENT_RE.test(trimmed) || (isLastLine && OPEN_COMMENT_RE.test(trimmed));
};

type Fence = {
    char: string;
    length: number;
    /** Opened on a de-quoted blockquote line, so its body is de-quoted too. */
    quoted: boolean;
};

/**
 * A CommonMark fence opener: three or more backticks or tildes, at most three
 * leading spaces, and — for backticks — an info string without a backtick.
 */
const fenceOpener = (line: string): { char: string; length: number } | null => {
    const match = FENCE_OPEN_RE.exec(line);
    if (!match) {
        return null;
    }
    const marker = match[1];
    if (marker[0] === '`' && match[2].includes('`')) {
        return null;
    }
    return { char: marker[0], length: marker.length };
};

/**
 * Normalizes reasoning text for display without destroying its structure.
 *
 * Paragraph breaks are meaningful: OMP folds provider summary parts with
 * `\n\n`, and blank-line suppression turned a multi-paragraph thought into one
 * running paragraph. Genuinely empty lines survive; invisible-only lines
 * (zero-width space and friends) become empty lines instead of being deleted,
 * keeping the anti-blank-line intent of #5215 without joining paragraphs; runs
 * of blank lines collapse to one. A whole line holding nothing but an empty
 * HTML comment is removed outside fenced code, and a leading `> ` blockquote
 * marker is stripped. Fenced code stays verbatim (de-quoted when the fence
 * itself sits in a blockquote); indented code blocks are not special-cased.
 */
export const cleanReasoningText = (text: string): string => {
    if (isInvisibleText(text)) {
        return '';
    }

    const lines = text.replace(/\r\n?/g, '\n').split('\n');
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
            const body = fence.quoted ? unquoted : raw;
            out.push(body);
            const close = FENCE_CLOSE_RE.exec(body.trimEnd());
            if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
                fence = null;
            }
            continue;
        }

        const line = unquoted.trimEnd();
        const open = fenceOpener(line);
        if (open) {
            pushLine(line);
            fence = { ...open, quoted: raw !== unquoted };
            continue;
        }

        if (isCommentNoise(line, index === lines.length - 1)) {
            continue;
        }

        if (isInvisibleText(line)) {
            pushBlank();
            continue;
        }

        pushLine(line);
    }

    return out.join('\n').trim();
};
