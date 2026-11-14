import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Description policy test (PATTERNS.md / research items 5d & 9):
 * Explanatory prose on SettingsCheckboxRow and SettingsFieldRow goes behind info=.
 * A visible description is reserved for conditional status, warnings, errors, or approved exceptions.
 */

const SECTIONS_ROOT = join(dirname(fileURLToPath(import.meta.url)));

const ALLOWLIST_KEYS: Record<string, true> = {
  // Destructive threshold: lowering the limit drops prompt history, so explanation stays visible (ChatSettings.tsx).
  'settings.openchamber.visual.field.inputHistoryLimitDescription': true,
  // Orientation hint: explains display mode differences across window environments (OpenChamberVisualSettings.tsx).
  'settings.openchamber.visual.field.installOrientationHint': true,
};

function walkTsx(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
        walkTsx(full, files);
      }
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      files.push(full);
    }
  }
  return files;
}

interface RowViolation {
  file: string;
  line: number;
  component: string;
  descriptionSnippet: string;
}

function findStaticRowDescriptions(source: string, filename: string): RowViolation[] {
  const violations: RowViolation[] = [];
  const startRegex = /<(SettingsCheckboxRow|SettingsFieldRow)\b/g;
  let match: RegExpExecArray | null;

  while ((match = startRegex.exec(source)) !== null) {
    const component = match[1];
    let pos = startRegex.lastIndex;
    let braceDepth = 0;
    let inString: string | null = null;
    let attrs = '';

    while (pos < source.length) {
      const ch = source[pos];
      if (inString) {
        if (ch === inString && source[pos - 1] !== '\\') inString = null;
      } else if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
      } else if (ch === '{') {
        braceDepth++;
      } else if (ch === '}') {
        braceDepth--;
      } else if (braceDepth === 0 && (ch === '>' || (ch === '/' && source[pos + 1] === '>'))) {
        break;
      }
      attrs += ch;
      pos++;
    }

    const descMatch = /description=(?:\{([^]*?)\}|"([^"]*)")/.exec(attrs);
    if (!descMatch) continue;

    const expr = (descMatch[1] ?? descMatch[2]).trim();
    const isStaticCall = /^t\(\s*['"]([^'"]+)['"]\s*\)$/.exec(expr);
    const isStaticLiteral = descMatch[2] !== undefined;

    if (isStaticCall) {
      const key = isStaticCall[1];
      if (ALLOWLIST_KEYS[key]) continue;
      const line = source.substring(0, match.index).split('\n').length;
      violations.push({ file: filename, line, component, descriptionSnippet: expr });
    } else if (isStaticLiteral) {
      const line = source.substring(0, match.index).split('\n').length;
      violations.push({ file: filename, line, component, descriptionSnippet: expr });
    }
  }

  return violations;
}

describe('settings row description policy', () => {
  test('flags static description on SettingsCheckboxRow and SettingsFieldRow', () => {
    const sampleViolation = `
      <SettingsCheckboxRow
        label="Foo"
        description={t('settings.some.static.description')}
      />
    `;
    const violations = findStaticRowDescriptions(sampleViolation, 'test.tsx');
    expect(violations.length).toBe(1);
    expect(violations[0].component).toBe('SettingsCheckboxRow');
    expect(violations[0].descriptionSnippet).toBe("t('settings.some.static.description')");
  });

  test('permits allowlisted static descriptions', () => {
    const sampleCompliant = `
      <SettingsFieldRow
        label="Input history"
        description={t('settings.openchamber.visual.field.inputHistoryLimitDescription')}
      />
    `;
    const violations = findStaticRowDescriptions(sampleCompliant, 'test.tsx');
    expect(violations.length).toBe(0);
  });

  test('permits conditional status and error descriptions', () => {
    const sampleConditional = `
      <SettingsFieldRow
        label="Error state"
        description={failed ? t('settings.error.message') : undefined}
      />
    `;
    const violations = findStaticRowDescriptions(sampleConditional, 'test.tsx');
    expect(violations.length).toBe(0);
  });

  test('all sections files comply with the description policy', () => {
    const files = walkTsx(SECTIONS_ROOT);
    const allViolations: RowViolation[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const fileViolations = findStaticRowDescriptions(content, file);
      allViolations.push(...fileViolations);
    }
    // Every row under sections/ must follow the description policy; see the lint rule no-static-row-description.
    expect(allViolations).toEqual([]);
  });
});
