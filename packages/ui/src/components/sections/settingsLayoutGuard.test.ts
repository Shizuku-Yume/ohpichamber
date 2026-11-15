import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Settings layout guard.
 *
 * Settings rows and section spacing come from the named classes in
 * `shared/SettingsSection.tsx`; layout.md and PATTERNS.md explain why (one row
 * pattern, one control width, one spacing scale, container queries only). This
 * test enforces that by scanning the JSX under `components/sections` and
 * rejecting the ad-hoc utilities that produced the ragged right column and the
 * doubled section rhythm.
 *
 * Rules, each reported with file:line:
 *
 * - W  a raw width utility (`w-48`, `w-[…]`, `w-fit`, `max-w-md`, `min-w-[1rem]`,
 *      with or without a variant prefix) on a settings control — SelectTrigger,
 *      Input, Textarea, NumberInput, the model/agent/project pickers — or in
 *      `controlClassName`/`containerClassName`/`triggerClassName`. `w-full`,
 *      `min-w-0`, `max-w-none` and `max-w-full` only say "fill", "may shrink"
 *      or "stay in the column", so they stay allowed.
 * - S  a `space-y-*` wrapper around `SettingsSection` children: sections own
 *      their vertical rhythm (`py-8`), so a page must not stack them again.
 *      `space-y-0` is the documented "no extra spacing" spelling and passes;
 *      content groups inside a section use the `SETTINGS_SPACE_*` classes.
 * - P  page padding on `SettingsPageLayout`: the page layout owns it
 *      (`px-6 @3xl:px-12`).
 * - B  a viewport breakpoint (`sm:`/`md:`/`lg:`/`xl:`/`2xl:`) in settings pane
 *      content. The pane is much narrower than the viewport, so its content
 *      responds with container queries (`@xl:`, `@3xl:`). Hover-only opacity
 *      affordances pass: there the prefix selects desktop pointer behaviour
 *      (`md:group-hover:opacity-100`), not a pane width.
 * - N  `SETTINGS_WIDTH_NUMBER_CLASS` applied outside a
 *      `SETTINGS_NUMBER_STEPPER_ROW_CLASS` row: the fixed width exists to size a
 *      stepper, and a bare one leaves a stub on the line.
 *
 * File exceptions are listed with their reason below and stay narrow:
 * navigation/sidebar chrome (layout.md "Exception"), the project settings
 * dialog shell, and two shared editors that are not settings field rows.
 * Dialog content needs no file exception: the breakpoint rule tracks the
 * `Dialog` ancestor, while control widths apply inside dialogs too.
 * `shared/SettingsSection.tsx` is excluded because it defines the vocabulary.
 */

const SECTIONS_ROOT = dirname(fileURLToPath(import.meta.url));

const RULES = ['W', 'S', 'P', 'B', 'N'] as const;
type Rule = (typeof RULES)[number];

/** Attributes that carry class names for a control or its wrapper. */
const CLASS_ATTRS: Record<string, true> = {
  className: true,
  controlClassName: true,
  containerClassName: true,
  triggerClassName: true,
  contentClassName: true,
};

/** Components that are settings controls (or the trigger of one). */
const CONTROL_TAGS: Record<string, true> = {
  Input: true,
  Textarea: true,
  NumberInput: true,
  Select: true,
  SelectTrigger: true,
  ModelSelector: true,
  AgentSelector: true,
  SettingsProjectSelector: true,
  SettingsColorField: true,
};

/** Width tokens that only say "fill", "may shrink" or "stay in the column". */
const NEUTRAL_WIDTH_TOKENS: Record<string, true> = {
  'w-full': true,
  'min-w-0': true,
  'max-w-none': true,
  'max-w-full': true,
};

/** Row-level primitives: a number stepper belongs inside the row's own band. */
const ROW_BOUNDARY_TAGS: Record<string, true> = {
  SettingsSection: true,
  SettingsFieldRow: true,
  SettingsStackedField: true,
  SettingsControlGroup: true,
  SettingsTwoColumn: true,
  SettingsPageLayout: true,
};

const NUMBER_WIDTH_CLASS = 'SETTINGS_WIDTH_NUMBER_CLASS';
const NUMBER_STEPPER_ROW_CLASS = 'SETTINGS_NUMBER_STEPPER_ROW_CLASS';

const VIEWPORT_BREAKPOINT = /^(?:sm|md|lg|xl|2xl):(.+)$/;
const HOVER_OPACITY = /^(?:sm|md|lg|xl|2xl):(?:(?:group-hover|hover|focus|focus-visible):)?opacity-/;
/** Modal chrome sizes to the viewport; its body still follows the pane rules. */
const DIALOG_CHROME_TAG = /^(?:Dialog|AlertDialog)/;

interface FileException {
  readonly match: RegExp;
  /** Rules the file is exempt from; omit for every rule. */
  readonly rules?: readonly Rule[];
  readonly reason: string;
}

const FILE_EXCEPTIONS: readonly FileException[] = [
  {
    match: /(^|\/)[A-Za-z0-9]*Sidebar\.tsx$/,
    reason: 'navigation chrome outside the pane (layout.md Exception)',
  },
  {
    match: /(^|\/)SettingsSidebar(?:Item|Layout|Search)?\.tsx$/,
    reason: 'navigation chrome outside the pane (layout.md Exception)',
  },
  {
    match: /(^|\/)ProjectSettings(?:Panel|Header)\.tsx$/,
    reason: 'project settings dialog shell: header and tab strip are modal chrome',
  },
  {
    match: /(^|\/)shared\/SettingsColorField\.tsx$/,
    rules: ['W'],
    reason: 'hex field is sized to a #RRGGBB swatch, not to a settings row',
  },
  {
    match: /(^|\/)shared\/EnvironmentVariablesEditor\.tsx$/,
    rules: ['W'],
    reason: 'bespoke name/value row editor, not a settings field row',
  },
];

interface JsxAttr {
  readonly name: string;
  /** Raw value source, quotes or braces included; empty for a bare attribute. */
  readonly raw: string;
  readonly start: number;
}

interface JsxElement {
  readonly tag: string;
  readonly attrs: readonly JsxAttr[];
  readonly start: number;
  readonly parent: JsxElement | null;
  readonly children: JsxElement[];
}

interface Violation {
  readonly file: string;
  readonly line: number;
  readonly rule: Rule;
  readonly detail: string;
}

/** Skip a quoted string or template literal; `${…}` inside a template recurses. */
function skipString(source: string, start: number): number {
  const quote = source[start];
  let index = start + 1;
  while (index < source.length) {
    const character = source[index];
    if (character === '\\') {
      index += 2;
      continue;
    }
    if (character === quote) return index + 1;
    if (quote === '`' && character === '$' && source[index + 1] === '{') {
      index = skipBraces(source, index + 1);
      continue;
    }
    index += 1;
  }
  return index;
}

/** Skip a balanced `{…}` block, including strings, comments and nested braces. */
function skipBraces(source: string, start: number): number {
  let depth = 0;
  let index = start;
  while (index < source.length) {
    const character = source[index];
    if (character === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index);
      index = newline < 0 ? source.length : newline + 1;
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 2;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      index = skipString(source, index);
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      index += 1;
      if (depth === 0) return index;
      continue;
    }
    index += 1;
  }
  return index;
}

/**
 * True when `<` at `index` starts a JSX element rather than a comparison or a
 * type argument list: the tag name must follow the angle bracket, and the
 * preceding token must not be an identifier or number (`Array<string>`,
 * `count < 5`). A comment ends in punctuation, so a tag on the next line still
 * counts.
 */
function isJsxStart(source: string, index: number): boolean {
  const next = source[index + 1];
  if (next === '>') return true;
  if (next === undefined || !/[A-Za-z_$]/.test(next)) return false;

  let previous = index - 1;
  while (previous >= 0 && /\s/.test(source[previous])) previous -= 1;
  if (previous < 0) return true;
  return !/[\w$]/.test(source[previous]);
}

/** Read one opening tag (attributes included) starting at `<`. */
function readTag(
  source: string,
  start: number,
  parent: JsxElement | null,
): { node: JsxElement; end: number; selfClosing: boolean } | null {
  const length = source.length;
  const attrs: JsxAttr[] = [];
  const isNamePart = (character: string | undefined): boolean =>
    character !== undefined && /[\w$.:-]/.test(character);

  if (source[start + 1] === '>') {
    return { node: { tag: '', attrs, start, parent, children: [] }, end: start + 2, selfClosing: false };
  }

  let index = start + 1;
  const nameStart = index;
  while (index < length && isNamePart(source[index])) index += 1;
  const tag = source.slice(nameStart, index);
  if (tag.length === 0) return null;

  while (index < length) {
    while (index < length && /\s/.test(source[index])) index += 1;
    if (index >= length) return null;

    const character = source[index];
    if (character === '/' && source[index + 1] === '>') {
      return { node: { tag, attrs, start, parent, children: [] }, end: index + 2, selfClosing: true };
    }
    if (character === '>') {
      return { node: { tag, attrs, start, parent, children: [] }, end: index + 1, selfClosing: false };
    }
    if (character === '{') {
      index = skipBraces(source, index);
      continue;
    }
    if (character === '"' || character === "'") {
      index = skipString(source, index);
      continue;
    }
    if (!isNamePart(character)) return null;

    const attrStart = index;
    while (index < length && isNamePart(source[index])) index += 1;
    const name = source.slice(attrStart, index);
    while (index < length && /\s/.test(source[index])) index += 1;

    if (source[index] !== '=') {
      attrs.push({ name, raw: '', start: attrStart });
      continue;
    }

    index += 1;
    while (index < length && /\s/.test(source[index])) index += 1;
    const valueStart = index;
    if (source[index] === '"' || source[index] === "'") {
      index = skipString(source, index);
    } else if (source[index] === '{') {
      index = skipBraces(source, index);
    } else {
      while (index < length && isNamePart(source[index])) index += 1;
    }
    attrs.push({ name, raw: source.slice(valueStart, index), start: attrStart });
  }
  return null;
}

/**
 * True when a comment starts here. JSX text may contain `//` (a URL) or `/*`,
 * so a comment only starts at the beginning of a line or right after code
 * punctuation.
 */
function isCommentStart(source: string, index: number): boolean {
  let previous = index - 1;
  while (previous >= 0 && (source[previous] === ' ' || source[previous] === '\t')) previous -= 1;
  if (previous < 0 || source[previous] === '\n') return true;
  return '{};,=()[]'.includes(source[previous]);
}

/**
 * Parse the JSX elements of a source file into a tree. Braces are transparent
 * at child level, so conditional and mapped JSX keeps its real parent, while
 * strings, comments and attribute expressions are skipped.
 */
function parseJsx(source: string): JsxElement[] {
  const roots: JsxElement[] = [];
  const stack: JsxElement[] = [];
  const length = source.length;
  let index = 0;

  while (index < length) {
    const character = source[index];

    if (character === '/' && isCommentStart(source, index)) {
      if (source[index + 1] === '/') {
        const newline = source.indexOf('\n', index);
        index = newline < 0 ? length : newline + 1;
        continue;
      }
      if (source[index + 1] === '*') {
        const close = source.indexOf('*/', index + 2);
        index = close < 0 ? length : close + 2;
        continue;
      }
    }
    if (character === '"' || character === "'" || character === '`') {
      index = skipString(source, index);
      continue;
    }

    if (character === '<') {
      if (source[index + 1] === '/') {
        const close = source.indexOf('>', index + 2);
        index = close < 0 ? length : close + 1;
        stack.pop();
        continue;
      }
      if (isJsxStart(source, index)) {
        const parsed = readTag(source, index, stack.length > 0 ? stack[stack.length - 1] : null);
        if (parsed !== null) {
          const parent = parsed.node.parent;
          if (parent === null) roots.push(parsed.node);
          else parent.children.push(parsed.node);
          if (!parsed.selfClosing) stack.push(parsed.node);
          index = parsed.end;
          continue;
        }
      }
      index += 1;
      continue;
    }
    index += 1;
  }
  return roots;
}

/** Every string literal inside an attribute value, template parts included. */
function stringLiterals(raw: string): string[] {
  const literals: string[] = [];
  let index = 0;
  while (index < raw.length) {
    const quote = raw[index];
    if (quote !== '"' && quote !== "'" && quote !== '`') {
      index += 1;
      continue;
    }
    let buffer = '';
    index += 1;
    while (index < raw.length) {
      const character = raw[index];
      if (character === '\\') {
        buffer += raw[index + 1] ?? '';
        index += 2;
        continue;
      }
      if (quote === '`' && character === '$' && raw[index + 1] === '{') {
        const end = skipBraces(raw, index + 1);
        literals.push(...stringLiterals(raw.slice(index + 2, end - 1)));
        buffer += ' ';
        index = end;
        continue;
      }
      if (character === quote) {
        index += 1;
        break;
      }
      buffer += character;
      index += 1;
    }
    literals.push(buffer);
  }
  return literals;
}

/** Class tokens an attribute contributes, whether a literal or an expression. */
function classTokens(raw: string): string[] {
  if (raw.length === 0) return [];
  const texts = raw[0] === '"' || raw[0] === "'"
    ? [raw.slice(1, -1)]
    : stringLiterals(raw);
  return texts.flatMap((text) => text.split(/\s+/).filter((token) => token.length > 0));
}

/** Utility name with variant prefixes (`@xl:`, `md:`, `hover:`) removed. */
function baseUtility(token: string): string {
  let bracketDepth = 0;
  let lastColon = -1;
  for (let index = 0; index < token.length; index += 1) {
    const character = token[index];
    if (character === '[') bracketDepth += 1;
    else if (character === ']') bracketDepth -= 1;
    else if (character === ':' && bracketDepth === 0) lastColon = index;
  }
  return lastColon < 0 ? token : token.slice(lastColon + 1);
}

function isRawWidthToken(token: string): boolean {
  const utility = baseUtility(token);
  if (NEUTRAL_WIDTH_TOKENS[utility] === true) return false;
  return /^w-(\d+(?:\.\d+)?|px|fit|auto|min|max|screen|\[\S+\]|\d+\/\d+)$/.test(utility)
    || /^max-w-/.test(utility)
    || /^min-w-/.test(utility);
}

function lineOf(source: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source[index] === '\n') line += 1;
  }
  return line;
}

/** Every class-bearing attribute on the element. */
function classAttrs(element: JsxElement): JsxAttr[] {
  return element.attrs.filter((attr) => CLASS_ATTRS[attr.name] === true);
}

function exceptionReason(file: string, rule: Rule): string | null {
  for (const exception of FILE_EXCEPTIONS) {
    if (!exception.match.test(file)) continue;
    if (exception.rules !== undefined && !exception.rules.includes(rule)) continue;
    return exception.reason;
  }
  return null;
}

/** True when every viewport prefix on the value is a hover-only opacity affordance. */
function isHoverOnlyBreakpointValue(tokens: readonly string[]): boolean {
  return tokens
    .filter((token) => VIEWPORT_BREAKPOINT.test(token))
    .every((token) => HOVER_OPACITY.test(token));
}

/** True when the element renders inside a modal dialog, which sizes to the window. */
function insideDialog(element: JsxElement): boolean {
  let current: JsxElement | null = element;
  while (current !== null) {
    if (DIALOG_CHROME_TAG.test(current.tag)) return true;
    current = current.parent;
  }
  return false;
}

function scanSource(file: string, source: string): Violation[] {
  const violations: Violation[] = [];
  const report = (offset: number, rule: Rule, detail: string): void => {
    if (exceptionReason(file, rule) !== null) return;
    violations.push({ file, line: lineOf(source, offset), rule, detail });
  };

  const visit = (element: JsxElement): void => {
    // W: page-local control widths.
    for (const attr of element.attrs) {
      const inspected = attr.name === 'controlClassName'
        || attr.name === 'containerClassName'
        || attr.name === 'triggerClassName'
        || (attr.name === 'className' && CONTROL_TAGS[element.tag] === true);
      if (!inspected) continue;
      for (const token of classTokens(attr.raw)) {
        if (!isRawWidthToken(token)) continue;
        report(
          attr.start,
          'W',
          `<${element.tag}> ${attr.name} carries the raw width "${token}" (use a SETTINGS_WIDTH_* class)`,
        );
      }
    }

    // S: a stack around sections.
    const className = element.attrs.find((attr) => attr.name === 'className');
    if (className !== undefined && element.children.some((child) => child.tag === 'SettingsSection')) {
      for (const token of classTokens(className.raw)) {
        const utility = baseUtility(token);
        if (!/^space-y-/.test(utility) || utility === 'space-y-0') continue;
        report(
          className.start,
          'S',
          `<${element.tag}> stacks sections with "${token}" (sections own their rhythm; use SETTINGS_SPACE_* for content groups)`,
        );
      }
    }

    // P: the page layout owns page padding.
    if (element.tag === 'SettingsPageLayout') {
      for (const attr of classAttrs(element)) {
        for (const token of classTokens(attr.raw)) {
          if (!/^(?:p|px|py|ps|pe|pt|pb|pl|pr)-/.test(baseUtility(token))) continue;
          report(attr.start, 'P', `SettingsPageLayout overrides page padding with "${token}"`);
        }
      }
    }

    // B: viewport breakpoints inside pane content. A dialog sizes to the
    // window, so its body is not pane content; control widths inside it (W)
    // still follow the row rules.
    if (!insideDialog(element)) {
      for (const attr of classAttrs(element)) {
        const tokens = classTokens(attr.raw);
        if (isHoverOnlyBreakpointValue(tokens)) continue;
        for (const token of tokens) {
          if (!VIEWPORT_BREAKPOINT.test(token)) continue;
          report(
            attr.start,
            'B',
            `<${element.tag}> ${attr.name} uses the viewport breakpoint "${token}" in pane content (use @xl:/@3xl:)`,
          );
        }
      }
    }

    // N: the fixed number width belongs to a stepper row.
    for (const attr of classAttrs(element)) {
      if (!attr.raw.includes(NUMBER_WIDTH_CLASS)) continue;
      let ancestor = element.parent;
      let inStepperRow = false;
      while (ancestor !== null) {
        const stepper = ancestor.attrs.some((candidate) => candidate.raw.includes(NUMBER_STEPPER_ROW_CLASS));
        if (stepper) {
          inStepperRow = true;
          break;
        }
        if (ROW_BOUNDARY_TAGS[ancestor.tag] === true) break;
        ancestor = ancestor.parent;
      }
      if (!inStepperRow) {
        report(
          attr.start,
          'N',
          `<${element.tag}> applies ${NUMBER_WIDTH_CLASS} outside a ${NUMBER_STEPPER_ROW_CLASS} row`,
        );
      }
    }

    for (const child of element.children) visit(child);
  };

  for (const root of parseJsx(source)) visit(root);
  return violations;
}

const EXCLUDED_SOURCES: Record<string, true> = {
  'shared/SettingsSection.tsx': true,
};

function walkSources(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      walkSources(full, files);
      continue;
    }
    if (!entry.name.endsWith('.tsx') || entry.name.endsWith('.test.tsx')) continue;
    if (EXCLUDED_SOURCES[relative(SECTIONS_ROOT, full)] === true) continue;
    files.push(full);
  }
  return files;
}

function scanSections(): Violation[] {
  const violations: Violation[] = [];
  for (const file of walkSources(SECTIONS_ROOT)) {
    violations.push(...scanSource(relative(SECTIONS_ROOT, file), readFileSync(file, 'utf8')));
  }
  return violations;
}

function formatViolations(violations: readonly Violation[]): string {
  return violations
    .map((violation) => `${violation.file}:${violation.line} [${violation.rule}] ${violation.detail}`)
    .sort()
    .join('\n');
}

describe('settings layout guard', () => {
  test('detects a raw width on a control and a section stack on a page', () => {
    const source = `
      const page = (
        <SettingsPageLayout title="OMP">
          <div className="space-y-6">
            <SettingsSection title="A">
              <SettingsFieldRow label="Model">
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              </SettingsFieldRow>
              <SettingsFieldRow label="Budget" controlClassName="max-w-md">
                <Input className="h-7 w-44" />
                <ModelSelector className="w-48" />
              </SettingsFieldRow>
            </SettingsSection>
          </div>
        </SettingsPageLayout>
      );
    `;
    const violations = scanSource('fixture/LayoutPage.tsx', source);
    expect(violations.map((violation) => violation.rule).sort()).toEqual(['S', 'W', 'W', 'W', 'W']);
    expect(violations.some((violation) => violation.detail.includes('"w-48"'))).toBe(true);
    expect(violations.some((violation) => violation.detail.includes('"max-w-md"'))).toBe(true);
    expect(violations.some((violation) => violation.detail.includes('"w-44"'))).toBe(true);
    expect(violations.some((violation) => violation.detail.includes('"space-y-6"'))).toBe(true);
  });

  test('accepts the named classes and layout-neutral widths', () => {
    const source = `
      const page = (
        <SettingsPageLayout title="OMP">
          <div className="space-y-0">
            <SettingsSection title="A">
              <div className={SETTINGS_SPACE_ROW_CLASS}>
                <SettingsFieldRow label="Model">
                  <SelectTrigger className={SETTINGS_WIDTH_SELECT_CLASS}><SelectValue /></SelectTrigger>
                </SettingsFieldRow>
                <SettingsFieldRow label="Budget">
                  <div className={SETTINGS_NUMBER_STEPPER_ROW_CLASS}>
                    <NumberInput className={SETTINGS_WIDTH_NUMBER_CLASS} />
                    <span className={SETTINGS_NUMBER_UNIT_CLASS}>s</span>
                  </div>
                </SettingsFieldRow>
                <SettingsFieldRow label="Notes" controlClassName="w-full max-w-none">
                  <Textarea className="min-w-0" />
                </SettingsFieldRow>
              </div>
            </SettingsSection>
          </div>
        </SettingsPageLayout>
      );
    `;
    expect(formatViolations(scanSource('fixture/CleanPage.tsx', source))).toBe('');
  });

  test('detects bare number width, page padding and viewport breakpoints', () => {
    const source = `
      const page = (
        <SettingsPageLayout className="px-4 @xl:px-6" title="Git">
          <SettingsSection title="A">
            <SettingsFieldRow label="Limit">
              <NumberInput className={SETTINGS_WIDTH_NUMBER_CLASS} />
            </SettingsFieldRow>
            <div className="flex flex-col gap-2 md:flex-row">
              <Input className="h-7 md:max-w-sm" />
            </div>
            <Button className="md:opacity-0 md:group-hover:opacity-100" />
          </SettingsSection>
        </SettingsPageLayout>
      );
    `;
    const violations = scanSource('fixture/OverridesPage.tsx', source);
    expect(violations.map((violation) => violation.rule).sort()).toEqual(['B', 'B', 'N', 'P', 'P', 'W']);
    expect(violations.every((violation) => !violation.detail.includes('md:opacity-0'))).toBe(true);
  });

  test('exempts modal chrome, sidebars and the project dialog shell', () => {
    const dialog = `
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="sm:text-start" />
          <DialogFooter className="sm:justify-between">
            <div className="flex flex-col-reverse gap-2 sm:flex-row" />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    `;
    expect(formatViolations(scanSource('agents/AgentsDialog.tsx', dialog))).toBe('');
    expect(formatViolations(scanSource('agents/AgentsSidebar.tsx', '<div className="h-6 w-6 md:opacity-0" />'))).toBe('');
    expect(formatViolations(scanSource('projects/ProjectSettingsPanel.tsx', '<div className="px-4 sm:px-6" />'))).toBe('');

    // A dialog body sizes to the window, so its viewport breakpoints pass, but
    // a control width inside it still follows the row rules.
    const nestedRow = `
      <Dialog open>
        <DialogContent className="sm:max-w-4xl">
          <SettingsFieldRow label="Limit">
            <Input className="h-7 md:max-w-sm" />
          </SettingsFieldRow>
        </DialogContent>
      </Dialog>
    `;
    const nested = scanSource('fixture/NestedSettings.tsx', nestedRow);
    expect(nested.map((violation) => violation.rule).sort()).toEqual(['W']);
  });

  test('finds no ad-hoc layout override under components/sections', () => {
    expect(formatViolations(scanSections())).toBe('');
  });
});
