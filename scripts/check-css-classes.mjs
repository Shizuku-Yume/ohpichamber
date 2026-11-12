#!/usr/bin/env node
// Every class name the UI puts on an element must do something.
//
// Tailwind generates a rule for a utility it recognises; the app's own classes
// live in the stylesheets under `packages/ui/src`. A token that neither
// resolves to a rule nor names a documented marker (a hook another module
// queries, a test selector, an `[&_.x]:` target) is a typo or a leftover: the
// element renders unstyled and nothing fails. This check finds those.
//
// Usage: node scripts/check-css-classes.mjs [--verbose]
//
// Exit 0 when every class token resolves; exit 1 with one line per unresolved
// token, naming the file and line that introduced it.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UI_SRC = path.join(REPO_ROOT, 'packages/ui/src');
const CSS_ENTRY = path.join(UI_SRC, 'index.css');
const SOURCE_FILE = /\.(ts|tsx)$/;
const TEST_FILE = /\.(test|spec)\.[jt]sx?$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build']);

// Class tokens that carry no styling rule but are load-bearing: another module
// queries them, a test selects them, or a Tailwind arbitrary variant targets
// them. Each entry says who relies on it, so a future reader can move the
// dependency instead of deleting the name.
const MARKER_CLASSES = new Map([
  ['oc-folder', 'sidebar folder row marker read by the section drag code'],
  ['oc-group', 'sidebar group marker read by the section drag code'],
  ['oc-group-body', 'sidebar group body marker read by the section drag code'],
  ['oc-sidebar-scroller', 'scroll container the sidebar hooks measure'],
  ['oc-composer-riders', 'anchor for the composer rider stack (data-composer-riders)'],
  ['overlay-scrollbar-container', 'ScrollableOverlay marker read by the overlay scrollbar CSS'],
  ['overlay-scrollbar-target', 'ScrollableOverlay marker read by the overlay scrollbar CSS'],
  ['session-tab', 'session tab marker queried by the tab strip and its tests'],
  ['session-tab-slot', 'session tab slot marker queried by the tab strip'],
  ['walkthrough-header', 'walkthrough header marker queried by WalkthroughView'],
  ['workflows-header', 'workflows header marker queried by WorkflowsPanel'],
  ['workflows-header__label', 'workflows header label hook'],
  ['workflows-header__action-label', 'workflows header action label hook'],
  ['workflows-header__run-name', 'workflows header run name hook'],
  ['git-identity-label', 'target of the mobile `[&_.git-identity-label]:hidden` variant'],
  ['model-controls__effort-trigger', 'ModelControls test selector'],
  ['model-controls__effort-label', 'ModelControls test selector'],
  ['model-controls__model-trigger', 'ModelControls test selector'],
  ['model-controls__model-label', 'ModelControls test selector'],
  ['model-controls__variant-trigger', 'ModelControls test selector'],
  ['model-controls__variant-label', 'ModelControls test selector'],
  ['model-controls__agent-trigger', 'ModelControls test selector'],
  ['model-controls__agent-label', 'ModelControls test selector'],
  ['model-favorite-drag-handle', 'model picker drag handle marker queried by the picker'],
  ['safe-area-bottom', 'TextSelectionMenu marker read by the safe-area rules'],
  ['external-link', 'markdown link marker read by the prose link rules'],
  ['toaster', 'sonner container marker read by the toast rules'],
]);

const isGroupOrPeer = (token) => /^(group|peer)(\/[\w./-]+)?$/.test(token);

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** Resolve a bare CSS `@import` id to a file on disk, the way the bundler does. */
const resolveStylesheet = (id, base) => {
  if (id.startsWith('.') || id.startsWith('/')) {
    const resolved = path.resolve(base, id);
    return { path: resolved, base: path.dirname(resolved), content: readFileSync(resolved, 'utf8') };
  }
  const packageRoot = path.join(REPO_ROOT, 'node_modules', id);
  const manifest = readJson(path.join(packageRoot, 'package.json'));
  const exportsField = manifest.exports?.['.'];
  const exportStyle = typeof exportsField === 'object' && exportsField !== null && typeof exportsField.style === 'string'
    ? exportsField.style
    : undefined;
  const entry = typeof manifest.style === 'string' ? manifest.style : (exportStyle ?? 'index.css');
  const resolved = path.join(packageRoot, entry);
  return { path: resolved, base: path.dirname(resolved), content: readFileSync(resolved, 'utf8') };
};

const listFiles = (dir, match, out = []) => {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) listFiles(full, match, out);
    else if (match.test(entry)) out.push(full);
  }
  return out;
};

// --- tokenizer --------------------------------------------------------------
//
// Just enough of a JavaScript tokenizer to tell code from text: identifiers,
// punctuation, string literals and template literals. Comments are dropped.
// Everything else (numbers, regexes, operators) becomes an `other` token, which
// the parser only uses to keep its bracket stack honest.

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[\w$]/;
// A `/` after one of these starts a regex literal, not a division.
const KEYWORDS_BEFORE_REGEX = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

const tokenize = (source) => {
  const tokens = [];
  const lineStarts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') lineStarts.push(index + 1);
  }
  const lineAt = (index) => {
    let low = 0;
    let high = lineStarts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (lineStarts[middle] <= index) low = middle;
      else high = middle - 1;
    }
    return low + 1;
  };

  /** Index after the string or template literal starting at `start`. */
  const skipQuoted = (start) => {
    const quote = source[start];
    let cursor = start + 1;
    while (cursor < source.length) {
      const char = source[cursor];
      if (char === '\\') { cursor += 2; continue; }
      if (char === quote) return cursor + 1;
      if (quote === '`' && char === '$' && source[cursor + 1] === '{') {
        cursor = skipTemplateExpression(cursor + 2);
        continue;
      }
      cursor += 1;
    }
    return cursor;
  };

  const skipTemplateExpression = (start) => {
    let depth = 1;
    let cursor = start;
    while (cursor < source.length) {
      const char = source[cursor];
      if (char === '"' || char === "'" || char === '`') { cursor = skipQuoted(cursor); continue; }
      if (char === '/' && source[cursor + 1] === '/') { cursor = skipLineComment(cursor); continue; }
      if (char === '/' && source[cursor + 1] === '*') { cursor = skipBlockComment(cursor); continue; }
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) return cursor + 1;
      }
      cursor += 1;
    }
    return cursor;
  };

  const skipLineComment = (start) => {
    const end = source.indexOf('\n', start);
    return end === -1 ? source.length : end;
  };
  const skipBlockComment = (start) => {
    const end = source.indexOf('*/', start + 2);
    return end === -1 ? source.length : end + 2;
  };

  let index = 0;
  let previousSignificant = null;
  while (index < source.length) {
    const char = source[index];

    if (char === '/' && source[index + 1] === '/') { index = skipLineComment(index); continue; }
    if (char === '/' && source[index + 1] === '*') { index = skipBlockComment(index); continue; }

    // A regex literal is text, not brackets: `/^https?:\\/\\//i` must not push
    // a paren frame. A `/` after a value is division; otherwise it opens one.
    if (char === '/') {
      const afterValue = previousSignificant !== null && (
        previousSignificant.type === 'string'
        || previousSignificant.type === 'template'
        || (previousSignificant.type === 'ident' && !KEYWORDS_BEFORE_REGEX.has(previousSignificant.value))
        || (previousSignificant.type === 'punct' && [')', ']', '}'].includes(previousSignificant.value))
      );
      if (!afterValue) {
        let cursor = index + 1;
        let inClass = false;
        while (cursor < source.length) {
          const inner = source[cursor];
          if (inner === '\\') { cursor += 2; continue; }
          if (inner === '\n') break;
          if (inner === '[') inClass = true;
          else if (inner === ']') inClass = false;
          else if (inner === '/' && !inClass) { cursor += 1; break; }
          cursor += 1;
        }
        while (cursor < source.length && /[a-z]/.test(source[cursor])) cursor += 1;
        index = cursor;
        previousSignificant = { type: 'other' };
        continue;
      }
    }

    if (char === '"' || char === "'") {
      const end = skipQuoted(index);
      previousSignificant = { type: 'string' };
      tokens.push({ type: 'string', value: source.slice(index + 1, end - 1), line: lineAt(index) });
      index = end;
      continue;
    }

    if (char === '`') {
      const quasis = [];
      let cursor = index + 1;
      let quasiStart = cursor;
      while (cursor < source.length) {
        const inner = source[cursor];
        if (inner === '\\') { cursor += 2; continue; }
        if (inner === '`') break;
        if (inner === '$' && source[cursor + 1] === '{') {
          quasis.push(source.slice(quasiStart, cursor));
          cursor = skipTemplateExpression(cursor + 2);
          quasiStart = cursor;
          continue;
        }
        cursor += 1;
      }
      quasis.push(source.slice(quasiStart, cursor));
      previousSignificant = { type: 'template' };
      tokens.push({ type: 'template', quasis, line: lineAt(index) });
      index = cursor + 1;
      continue;
    }

    if (IDENT_START.test(char)) {
      let end = index;
      while (end < source.length && IDENT_PART.test(source[end])) end += 1;
      previousSignificant = { type: 'ident', value: source.slice(index, end) };
      tokens.push({ type: 'ident', value: source.slice(index, end), line: lineAt(index) });
      index = end;
      continue;
    }

    if ('()[]{}.,:;=<>!&|+-*/%?'.includes(char)) {
      previousSignificant = { type: 'punct', value: char };
      tokens.push({ type: 'punct', value: char, line: lineAt(index) });
      index += 1;
      continue;
    }

    previousSignificant = { type: 'other' };
    tokens.push({ type: 'other', value: char, line: lineAt(index) });
    index += 1;
  }
  return tokens;
};

// --- class-position parser --------------------------------------------------
//
// A class list is a string in a `className` attribute, in a `cn`/`clsx`/
// `classNames`/`cx`/`cva` call, or in a `const NAME = …` whose NAME the class
// position reads. The parser keeps a context stack over the token stream:
// 'class' (a className expression), 'array', 'paren', 'object', 'skip' (cva's
// `defaultVariants`, whose strings are variant names) and `call:<name>`.
//
// A string is a class token when every context between it and a class root is
// an array, a paren or a class-helper call. That keeps `t('key')`,
// `format(x, 'y')` and object values out, without a heuristic on the text.

const CLASS_HELPERS = new Set(['cn', 'clsx', 'classNames', 'cx', 'cva']);
// Only operators that cannot also be JSX syntax. A bare `>` after a string is
// a tag close (`className="a b"` … `>`), and a bare `<` opens one; a
// greater-than never separates a mode literal from a class list here.
const COMPARISON = new Set(['===', '!==', '==', '!=', '<=', '>=']);

/** The operator a run of punctuation tokens spells, e.g. `===` from `= = =`. */
const operatorAt = (tokens, index, direction) => {
  let operator = '';
  for (let cursor = index; cursor >= 0 && cursor < tokens.length; cursor += direction) {
    const token = tokens[cursor];
    if (token.type === 'other' && token.value.trim() === '') continue;
    if (token.type !== 'punct' || !'=!<>'.includes(token.value)) break;
    operator = direction > 0 ? operator + token.value : token.value + operator;
  }
  return operator;
};

/** The nearest token before `index` that is not whitespace. */
const previousSignificant = (tokens, index) => {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor];
    if (token.type === 'other' && token.value.trim() === '') continue;
    return token;
  }
  return undefined;
};

/** The nearest token after `index` that is not whitespace. */
const nextSignificant = (tokens, index) => {
  for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor];
    if (token.type === 'other' && token.value.trim() === '') continue;
    return token;
  }
  return undefined;
};

/**
 * A string in a comparison or a `case` label names a mode, not a class:
 * `jsonViewMode === 'raw'` inside a `cn` argument is not a token to style.
 */
const isValueLiteral = (tokens, index) => {
  const previous = previousSignificant(tokens, index);
  const next = nextSignificant(tokens, index);
  if (previous?.type === 'ident' && previous.value === 'case') return true;
  if (previous?.type === 'punct' && COMPARISON.has(operatorAt(tokens, index - 1, -1))) return true;
  if (next?.type === 'punct' && COMPARISON.has(operatorAt(tokens, index + 1, 1))) return true;
  return false;
};

/** Class tokens of a token range, plus the identifiers the class positions read. */
const scanClassPositions = (tokens, start, end, onToken, onIdentifier) => {
  // Each frame: { kind, key, inValue, parentKey }. `parentKey` is the object
  // property this frame was opened under, so cva's `defaultVariants` block can
  // be told from the variant maps that carry classes.
  const stack = [];
  let pendingClassName = false;

  const insideCall = (name) => stack.some((frame) => frame.kind === 'call' && frame.name === name);
  const insideDefaultVariants = () => stack.some((frame) => frame.kind === 'object' && frame.key === 'defaultVariants');
  const top = () => stack[stack.length - 1];

  const isClassPosition = () => {
    for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
      const frame = stack[depth];
      if (frame.kind === 'class') return true;
      if (frame.kind === 'array' || frame.kind === 'paren') continue;
      if (frame.kind === 'call') return CLASS_HELPERS.has(frame.name);
      if (frame.kind === 'object') {
        // cva: a variant's values are classes, its keys are variant names;
        // `defaultVariants` names variants, not classes.
        if (insideCall('cva')) return !insideDefaultVariants() && frame.inValue;
        // `cn({ 'a b': condition })`: the keys of an object passed straight to
        // a class helper are the classes. Any other object (a config, a zod
        // schema) is opaque.
        return frame.directClassObject && !frame.inValue;
      }
      return false;
    }
    return false;
  };

  for (let index = start; index < end; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];

    if (token.type === 'ident') {
      if (token.value === 'className' && next?.type === 'punct' && next.value === '=') {
        pendingClassName = true;
        index += 1;
        continue;
      }
      if (next?.type === 'punct' && next.value === '(') {
        stack.push({ kind: 'call', name: token.value });
        index += 1;
        continue;
      }
      const frame = top();
      if (frame?.kind === 'object' && !frame.inValue && next?.type === 'punct' && next.value === ':') {
        frame.key = token.value;
        continue;
      }
      if (isClassPosition()) onIdentifier(token.value, token.line);
      continue;
    }

    if (token.type === 'string' || token.type === 'template') {
      const chunks = token.type === 'string' ? [token.value] : token.quasis;
      const frame = top();
      const isObjectKey = frame?.kind === 'object' && !frame.inValue
        && next?.type === 'punct' && next.value === ':';
      if (isObjectKey) {
        frame.key = chunks.join('');
        continue;
      }
      // `cn(x === 'raw' && 'bg-x')`: the compared string names a mode.
      if (token.type === 'string' && isValueLiteral(tokens, index)) {
        pendingClassName = false;
        continue;
      }
      if (pendingClassName || isClassPosition()) {
        for (const chunk of chunks) onToken(chunk, token.line);
      }
      pendingClassName = false;
      continue;
    }

    if (token.type === 'punct') {
      if (token.value === '(') { stack.push({ kind: 'paren' }); continue; }
      if (token.value === '[') {
        // `tone[status ?? 'todo']` reads a map; only a `[` that starts an
        // expression is a class array.
        const previous = previousSignificant(tokens, index);
        const isMemberAccess = previous?.type === 'ident'
          || previous?.type === 'string'
          || previous?.type === 'template'
          || (previous?.type === 'punct' && [')', ']', '}'].includes(previous.value));
        stack.push({ kind: isMemberAccess ? 'skip' : 'array' });
        continue;
      }
      if (token.value === '{') {
        if (pendingClassName) { stack.push({ kind: 'class' }); pendingClassName = false; continue; }
        const parent = top();
        const parentKey = parent?.kind === 'object' ? parent.key : null;
        stack.push({ kind: 'object', key: null, inValue: false, parentKey });
        continue;
      }
      if (token.value === ')' || token.value === ']' || token.value === '}') { stack.pop(); continue; }
      if (token.value === ':') {
        const frame = top();
        if (frame?.kind === 'object') frame.inValue = true;
        continue;
      }
      if (token.value === ',') {
        const frame = top();
        if (frame?.kind === 'object') { frame.key = null; frame.inValue = false; }
        continue;
      }
      continue;
    }
  }
};

const collectClassTokens = (file, tokens) => {
  const source = readFileSync(file, 'utf8');
  const fileTokens = tokenize(source);
  const add = (chunk, line) => {
    for (const token of chunk.split(/\s+/)) {
      if (!token) continue;
      if (!tokens.has(token)) tokens.set(token, []);
      tokens.get(token).push({ file, line });
    }
  };

  const identifiers = new Map();
  scanClassPositions(
    fileTokens, 0, fileTokens.length,
    add,
    (name, line) => { if (!identifiers.has(name)) identifiers.set(name, line); },
  );
  if (identifiers.size === 0) return;

  // A module-level `const NAME = …` whose NAME a class position reads holds a
  // class list too (`const ACTIVE_TITLE_CLASS = 'font-semibold …'`).
  const pending = [...identifiers.entries()];
  const seen = new Set();
  while (pending.length > 0) {
    const [name, line] = pending.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    const declaration = new RegExp(`\\b(?:const|let|var)\\s+${name.replace(/[$]/g, '\\$')}\\s*(?::[^=]+)?=\\s*`, 'g');
    const match = declaration.exec(source);
    if (!match) continue;
    const expressionStart = match.index + match[0].length;
    // The expression ends at the first `;` or newline-terminated statement at
    // the same bracket depth; the parser only reads up to the next `;`.
    const statementEnd = source.indexOf(';', expressionStart);
    const end = statementEnd === -1 ? source.length : statementEnd;
    const rangeTokens = tokenize(source.slice(expressionStart, end));
    const lineOffset = source.slice(0, expressionStart).split('\n').length - 1;
    for (const token of rangeTokens) token.line += lineOffset;
    scanClassPositions(
      rangeTokens, 0, rangeTokens.length,
      add,
      (nested, nestedLine) => { if (!seen.has(nested)) pending.push([nested, nestedLine]); },
    );
    void line;
  }
};

// --- resolution -------------------------------------------------------------

// The visual kit ships its CSS as a string (`KIT_SHARED_CSS`), injected at
// runtime for agent pages and UI blocks, so its classes never reach a
// stylesheet on disk. Read that module with the same selectors.
const DECLARED_CLASS_SOURCES = [
  path.join(UI_SRC, 'components/chat/lib/visualKit.ts'),
];

const collectDeclaredClasses = (cssFiles) => {
  const declared = new Set();
  for (const file of [...cssFiles, ...DECLARED_CLASS_SOURCES]) {
    const css = readFileSync(file, 'utf8');
    for (const match of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) declared.add(match[1]);
    for (const match of css.matchAll(/@utility\s+([\w-]+)/g)) declared.add(match[1]);
  }
  return declared;
};

const main = async () => {
  const verbose = process.argv.includes('--verbose');
  const { __unstable__loadDesignSystem } = await import('tailwindcss');
  const designSystem = await __unstable__loadDesignSystem(readFileSync(CSS_ENTRY, 'utf8'), {
    base: UI_SRC,
    loadStylesheet: async (id, base) => resolveStylesheet(id, base),
  });

  const sourceFiles = listFiles(UI_SRC, SOURCE_FILE).filter((file) => !TEST_FILE.test(file));
  const cssFiles = listFiles(UI_SRC, /\.css$/);
  const declared = collectDeclaredClasses(cssFiles);

  const tokens = new Map();
  for (const file of sourceFiles) collectClassTokens(file, tokens);

  const resolvesAsUtility = (token) => {
    try {
      return Boolean(designSystem.candidatesToCss([token])?.[0]);
    } catch {
      return false;
    }
  };

  const unresolved = [];
  for (const [token, uses] of tokens) {
    if (declared.has(token) || MARKER_CLASSES.has(token) || isGroupOrPeer(token)) continue;
    if (resolvesAsUtility(token)) continue;
    // A variant on a class the app defines itself (`dark:oc-tile`).
    const base = token.split(':').pop();
    if (base && base !== token && (declared.has(base) || MARKER_CLASSES.has(base))) continue;
    unresolved.push({ token, uses });
  }

  const relative = (file) => path.relative(REPO_ROOT, file);
  if (verbose) {
    console.log(`[css-classes] ${sourceFiles.length} source files, ${tokens.size} class tokens, ${declared.size} declared selectors`);
  }
  if (unresolved.length === 0) {
    console.log(`[css-classes] ${tokens.size} class tokens resolve to a rule, a utility or a marker`);
    return 0;
  }
  unresolved.sort((left, right) => left.token.localeCompare(right.token));
  for (const { token, uses } of unresolved) {
    const first = uses[0];
    console.error(`[css-classes] ${token}  ${relative(first.file)}:${first.line}${uses.length > 1 ? ` (+${uses.length - 1} more)` : ''}`);
  }
  console.error(`[css-classes] ${unresolved.length} unresolved class token(s) of ${tokens.size}`);
  return 1;
};

process.exitCode = await main();
