#!/usr/bin/env node
/**
 * a2-settings-inventory.mjs
 *
 * Read-only audit and guardrail inventory comparing settings surfaces between an
 * upstream git ref (default: bc50ba56a) and the fork (default: WORKTREE).
 * Zero third-party dependencies (runs under Node or Bun).
 *
 * Extracts and cross-links 5 classes:
 *   1. settings-item      (`settingsItem`, `data-settings-item`, `settingsItemPrefix` in packages/ui/src)
 *   2. settings-registry  (`SETTINGS_REGISTRY`, `LOCAL_DEVICE_KEYS`, `DESKTOP_SHELL_KEYS` in registry.ts)
 *   3. settings-sanitizer (`settings-registry.json`, `settings-helpers.js`, `settings-normalization-runtime.js`, `settings-runtime.js`)
 *   4. settings-store     (fields, setters, `partialize` in settings-bearing Zustand stores)
 *   5. settings-search    (`SETTINGS_SEARCH_ITEMS` in search.ts)
 *
 * Usage (from repo root):
 *   node /path/to/a2-settings-inventory.mjs [--upstream-ref bc50ba56a] [--fork-ref WORKTREE] [--out-dir <dir>] [--json]
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();

function parseArgs(argv) {
  const opts = {
    upstreamRef: 'bc50ba56a',
    forkRef: 'WORKTREE',
    outDir: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--upstream-ref' && argv[i + 1]) {
      opts.upstreamRef = argv[++i];
    } else if (arg === '--fork-ref' && argv[i + 1]) {
      opts.forkRef = argv[++i];
    } else if (arg === '--out-dir' && argv[i + 1]) {
      opts.outDir = argv[++i];
    } else if (arg === '--json') {
      opts.json = true;
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return opts;
}

function git(args) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function listTreeFiles(ref, prefix) {
  if (ref === 'WORKTREE') {
    const absPrefix = path.join(REPO_ROOT, prefix);
    if (!existsSync(absPrefix)) return [];
    const results = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else results.push(path.relative(REPO_ROOT, full).replaceAll('\\', '/'));
      }
    };
    walk(absPrefix);
    return results.sort();
  }
  const out = git(['ls-tree', '-r', '--name-only', ref, '--', prefix]);
  return out.split('\n').map((s) => s.trim()).filter(Boolean).sort();
}

function readFileAt(ref, relPath) {
  if (ref === 'WORKTREE') {
    const full = path.join(REPO_ROOT, relPath);
    if (!existsSync(full)) return null;
    return readFileSync(full, 'utf8');
  }
  try {
    return git(['show', `${ref}:${relPath}`]);
  } catch {
    return null;
  }
}

function lineAt(src, index) {
  let ln = 1;
  for (let i = 0; i < index; i++) {
    if (src.charCodeAt(i) === 10) ln++;
  }
  return ln;
}

/**
 * Strip JS/TS comments while preserving line numbers (newlines retained) and string literals.
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      out += c;
      i++;
      while (i < n) {
        const ch = src[i];
        out += ch;
        if (ch === '\\') {
          if (i + 1 < n) {
            out += src[i + 1];
            i += 2;
            continue;
          }
        } else if (ch === quote) {
          i++;
          break;
        }
        i++;
      }
    } else if (c === '/' && next === '/') {
      out += '  ';
      i += 2;
      while (i < n && src[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else if (c === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < n) {
        out += '  ';
        i += 2;
      }
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Find matching closing delimiter for `openChar` at `startIdx` in comment-stripped source. */
function findMatching(src, startIdx, openChar, closeChar) {
  let depth = 0;
  let i = startIdx;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      i++;
      while (i < n) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === q) { i++; break; }
        if (q === '`' && src[i] === '$' && src[i + 1] === '{') {
          const endExpr = findMatching(src, i + 1, '{', '}');
          i = endExpr + 1;
          continue;
        }
        i++;
      }
      continue;
    }
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/** Extract top-level comma/semicolon-separated entries inside `{ ... }` or `[ ... ]`. */
function splitTopLevel(inner, separators = [',']) {
  const entries = [];
  let start = 0;
  let brace = 0;
  let paren = 0;
  let bracket = 0;
  let i = 0;
  const n = inner.length;
  while (i < n) {
    const c = inner[i];
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      i++;
      while (i < n) {
        if (inner[i] === '\\') { i += 2; continue; }
        if (inner[i] === q) { i++; break; }
        if (q === '`' && inner[i] === '$' && inner[i + 1] === '{') {
          const endExpr = findMatching(inner, i + 1, '{', '}');
          i = endExpr >= 0 ? endExpr + 1 : i + 2;
          continue;
        }
        i++;
      }
      continue;
    }
    if (c === '{') brace++;
    else if (c === '}') brace--;
    else if (c === '(') paren++;
    else if (c === ')') paren--;
    else if (c === '[') bracket++;
    else if (c === ']') bracket--;
    else if (brace === 0 && paren === 0 && bracket === 0 && separators.includes(c)) {
      const chunk = inner.slice(start, i);
      if (chunk.trim()) entries.push({ text: chunk, offset: start });
      start = i + 1;
    }
    i++;
  }
  const tail = inner.slice(start);
  if (tail.trim()) entries.push({ text: tail, offset: start });
  return entries;
}

function extractQuotedLiterals(text) {
  const lits = [];
  const re = /(['"])((?:\\.|(?!\1).)*)\1/g;
  let m;
  while ((m = re.exec(text)) !== null) lits.push(m[2]);
  return lits;
}

// ---------------------------------------------------------------------------
// 1. settings-item extractor
// ---------------------------------------------------------------------------
function extractSettingsItems(ref) {
  const files = listTreeFiles(ref, 'packages/ui/src').filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.(ts|tsx)$/.test(f),
  );
  const items = new Map();

  const addItem = (id, entry) => {
    if (!id) return;
    const list = items.get(id) ?? [];
    list.push(entry);
    items.set(id, list);
  };

  for (const file of files) {
    const raw = readFileAt(ref, file);
    if (!raw || (!raw.includes('settingsItem') && !raw.includes('settings-item'))) continue;
    const src = stripComments(raw);
    const re = /\b(settingsItemPrefix|settingsItem|data-settings-item)\s*=\s*/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const attr = m[1];
      let pos = m.index + m[0].length;
      while (pos < src.length && /\s/.test(src[pos])) pos++;
      const ln = lineAt(src, m.index);
      const ch = src[pos];
      if (ch === '"' || ch === "'") {
        const end = src.indexOf(ch, pos + 1);
        if (end > pos) {
          const val = src.slice(pos + 1, end);
          if (val) {
            const id = attr === 'settingsItemPrefix' ? `${val}*` : val;
            addItem(id, { file, line: ln, attr, kind: attr === 'settingsItemPrefix' ? 'prefix' : 'literal' });
          }
        }
      } else if (ch === '{') {
        const close = findMatching(src, pos, '{', '}');
        if (close > pos) {
          const expr = src.slice(pos + 1, close).trim();
          const litMatch = expr.match(/^(['"`])([^$`'"]+)\1$/);
          if (litMatch) {
            const val = litMatch[2];
            const id = attr === 'settingsItemPrefix' ? `${val}*` : val;
            addItem(id, { file, line: ln, attr, kind: attr === 'settingsItemPrefix' ? 'prefix' : 'literal' });
          } else if (expr.startsWith('`')) {
            const headMatch = expr.match(/^`([^$`]+)\$\{/);
            if (headMatch) {
              addItem(`${headMatch[1]}*`, { file, line: ln, attr, kind: 'template-prefix', expr });
            } else {
              // e.g. `${settingsItem}.connect`
              const tailMatch = expr.match(/^`\$\{([^}]+)\}\.([^`]+)`$/);
              if (tailMatch && tailMatch[1] === 'settingsItem') {
                // Capture suffixes like `.connect` / `.add-workspace` for known callers
                if (file.includes('SourceControlProviderCard')) {
                  addItem(`integrations.source-control.*.${tailMatch[2]}`, { file, line: ln, attr, kind: 'template-suffix', expr });
                } else if (file.includes('TrackerSettings')) {
                  addItem(`integrations.*.${tailMatch[2]}`, { file, line: ln, attr, kind: 'template-suffix', expr });
                }
              }
            }
          } else {
            // Conditional expression or ternary with literals containing `.`
            const lits = extractQuotedLiterals(expr).filter((s) => s.includes('.'));
            for (const lit of lits) {
              addItem(lit, { file, line: ln, attr, kind: 'conditional', expr });
            }
          }
        }
      }
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// 2. settings-registry extractor
// ---------------------------------------------------------------------------
function extractSettingsRegistry(ref) {
  const file = 'packages/ui/src/lib/settings/registry.ts';
  const raw = readFileAt(ref, file);
  const fields = new Map();
  const localDeviceKeys = new Map();
  const desktopShellKeys = new Map();
  if (!raw) return { fields, localDeviceKeys, desktopShellKeys };

  const src = stripComments(raw);

  // SETTINGS_REGISTRY = { ... }
  const regMatch = src.match(/\bSETTINGS_REGISTRY\s*=\s*\{/);
  if (regMatch) {
    const braceStart = regMatch.index + regMatch[0].length - 1;
    const braceEnd = findMatching(src, braceStart, '{', '}');
    if (braceEnd > braceStart) {
      const bodyStart = braceStart + 1;
      const body = src.slice(bodyStart, braceEnd);
      for (const entry of splitTopLevel(body, [','])) {
        const kv = entry.text.match(/^\s*(?:(['"])([\w-]+)\1|([A-Za-z_$][\w$]*))\s*:\s*([\s\S]+)$/);
        if (!kv) continue;
        const key = kv[2] ?? kv[3];
        const val = kv[4];
        const ln = lineAt(src, bodyStart + entry.offset + entry.text.search(/\S/));
        const scope = val.match(/\bscope\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null;
        const effMatch = val.match(/\beffect\s*:\s*\[([^\]]*)\]/);
        const effect = effMatch ? extractQuotedLiterals(effMatch[1]) : [];
        const surfMatch = val.match(/\bsurfaces\s*:\s*\[([^\]]*)\]/);
        const surfaces = surfMatch ? extractQuotedLiterals(surfMatch[1]) : null;
        const computed = /\bcomputed\s*:\s*true\b/.test(val);
        const secret = /\bsecret\s*:\s*true\b/.test(val);
        const perSurface = /\bperSurface\s*:\s*true\b/.test(val);
        const derived = /\bderived\s*:\s*true\b/.test(val);
        const adopt = val.match(/\badopt\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null;

        let uiKind = null;
        let uiStore = null;
        let uiField = null;
        let autoSave = null;
        const uiStoreCall = val.match(/\bui\s*:\s*(uiStore|configField|sessionDisplayField)\s*\(\s*['"]([^'"]+)['"]/);
        if (uiStoreCall) {
          uiKind = uiStoreCall[1];
          uiField = uiStoreCall[2];
          uiStore = uiKind === 'uiStore' ? 'useUIStore'
            : uiKind === 'configField' ? 'useConfigStore'
              : 'useSessionDisplayStore';
          autoSave = !/autoSave\s*:\s*false/.test(val);
        } else if (/\bui\s*:\s*\{/.test(val)) {
          uiKind = 'custom';
          if (val.includes('useI18nStore')) uiStore = 'useI18nStore';
          else if (val.includes('useSessionDisplayStore')) uiStore = 'useSessionDisplayStore';
          else if (val.includes('useUIStore')) uiStore = 'useUIStore';
          else if (val.includes('useMessageQueueStore')) uiStore = 'useMessageQueueStore';
          else if (val.includes('useInputHistoryStore')) uiStore = 'useInputHistoryStore';
          else if (val.includes('getDirectoryShowHidden')) uiStore = 'directoryShowHidden';
          else if (val.includes('getFilesViewShowGitignored')) uiStore = 'filesViewShowGitignored';
          uiField = val.match(/\.getState\(\)\.(\w+)/)?.[1] ?? null;
          autoSave = !/autoSave\s*:\s*false/.test(val);
        }

        fields.set(key, {
          key, line: ln, file, scope, effect, surfaces, computed, secret, perSurface, derived, adopt,
          uiKind, uiStore, uiField, autoSave,
        });
      }
    }
  }

  for (const [varName, map] of [['LOCAL_DEVICE_KEYS', localDeviceKeys], ['DESKTOP_SHELL_KEYS', desktopShellKeys]]) {
    const m = src.match(new RegExp(`\\b${varName}\\s*=\\s*\\[`));
    if (!m) continue;
    const arrStart = m.index + m[0].length - 1;
    const arrEnd = findMatching(src, arrStart, '[', ']');
    if (arrEnd > arrStart) {
      const inner = src.slice(arrStart + 1, arrEnd);
      const re = /(['"])([^'"]+)\1/g;
      let lm;
      while ((lm = re.exec(inner)) !== null) {
        map.set(lm[2], { key: lm[2], line: lineAt(src, arrStart + 1 + lm.index), file, table: varName });
      }
    }
  }

  return { fields, localDeviceKeys, desktopShellKeys };
}

// ---------------------------------------------------------------------------
// 3. settings-sanitizer extractor
// ---------------------------------------------------------------------------
function extractSettingsSanitizer(ref) {
  const dir = readFileAt(ref, 'packages/web/server/lib/host/settings-helpers.js')
    ? 'packages/web/server/lib/host'
    : 'packages/web/server/lib/opencode';
  const registryJsonPath = `${dir}/settings-registry.json`;
  const helpersPath = `${dir}/settings-helpers.js`;
  const normPath = `${dir}/settings-normalization-runtime.js`;
  const runtimePath = `${dir}/settings-runtime.js`;

  const registryJsonRaw = readFileAt(ref, registryJsonPath);
  const helpersRaw = readFileAt(ref, helpersPath);
  const normRaw = readFileAt(ref, normPath);
  const runtimeRaw = readFileAt(ref, runtimePath);

  const registryFields = new Map();
  if (registryJsonRaw) {
    const parsed = JSON.parse(registryJsonRaw);
    const lines = registryJsonRaw.split('\n');
    for (const [k, v] of Object.entries(parsed.fields ?? {})) {
      const idx = lines.findIndex((l) => l.includes(`"${k}":`));
      registryFields.set(k, { key: k, ...v, file: registryJsonPath, line: idx >= 0 ? idx + 1 : 1 });
    }
  }

  const sanitizerKeys = new Map();
  const addSanKey = (key, branch, file, line) => {
    if (!key) return;
    const entry = sanitizerKeys.get(key) ?? { key, branches: new Set(), refs: [] };
    entry.branches.add(branch);
    entry.refs.push(`${file}:${line}`);
    sanitizerKeys.set(key, entry);
  };

  if (helpersRaw) {
    const src = stripComments(helpersRaw);
    const boolM = src.match(/\bREGISTRY_BOOLEAN_SETTINGS\s*=\s*Object\.freeze\(\s*\[/);
    if (boolM) {
      const start = boolM.index + boolM[0].length - 1;
      const end = findMatching(src, start, '[', ']');
      if (end > start) {
        for (const lit of extractQuotedLiterals(src.slice(start, end))) {
          addSanKey(lit, 'REGISTRY_BOOLEAN_SETTINGS', helpersPath, lineAt(src, start));
        }
      }
    }

    // Pass-through for-of array in sanitizeSettingsUpdate
    const ptRe = /for\s*\(\s*const\s+key\s+of\s*\[/g;
    let ptM;
    while ((ptM = ptRe.exec(src)) !== null) {
      const start = ptM.index + ptM[0].length - 1;
      const end = findMatching(src, start, '[', ']');
      if (end > start) {
        const inner = src.slice(start, end);
        for (const lit of extractQuotedLiterals(inner)) {
          addSanKey(lit, 'passthrough-array', helpersPath, lineAt(src, start));
        }
      }
    }

    // candidate.<key> / result.<key> / settings.<key> / changes.<key> / current.<key>
    const propRe = /\b(candidate|result|settings|changes|current)\s*\??\.\s*([A-Za-z_$][\w$]*)\b/g;
    let pm;
    while ((pm = propRe.exec(src)) !== null) {
      const obj = pm[1];
      const prop = pm[2];
      // Skip JS built-in methods / irrelevant names
      if (['trim', 'length', 'filter', 'map', 'hasOwnProperty', 'toString', 'keys', 'entries'].includes(prop)) continue;
      if (obj === 'candidate') addSanKey(prop, 'sanitizeSettingsUpdate:candidate', helpersPath, lineAt(src, pm.index));
      else if (obj === 'result') addSanKey(prop, 'sanitizeSettingsUpdate:result', helpersPath, lineAt(src, pm.index));
      else if (obj === 'settings') addSanKey(prop, 'formatSettingsResponse:settings', helpersPath, lineAt(src, pm.index));
      else if (obj === 'changes' || obj === 'current') addSanKey(prop, `mergePersistedSettings:${obj}`, helpersPath, lineAt(src, pm.index));
    }

    // formatSettingsResponse return { ...sanitized, ... }
    const fmtM = src.match(/\bformatSettingsResponse\s*=\s*\([^)]*\)\s*=>\s*\{/);
    if (fmtM) {
      const bodyStart = fmtM.index + fmtM[0].length - 1;
      const bodyEnd = findMatching(src, bodyStart, '{', '}');
      if (bodyEnd > bodyStart) {
        const body = src.slice(bodyStart, bodyEnd);
        const retM = body.match(/\breturn\s*\{/);
        if (retM) {
          const rStart = retM.index + retM[0].length - 1;
          const rEnd = findMatching(body, rStart, '{', '}');
          if (rEnd > rStart) {
            const retInner = body.slice(rStart + 1, rEnd);
            for (const entry of splitTopLevel(retInner, [','])) {
              const t = entry.text.trim();
              if (t.startsWith('...(') || t.startsWith('...')) {
                for (const k of extractQuotedLiterals(t)) {
                  // check object keys inside conditional spreads like `...(pwaAppName ? { pwaAppName } : {})`
                }
                const innerObjRe = /\{\s*([A-Za-z_$][\w$]*)\s*[,:}]/g;
                let im;
                while ((im = innerObjRe.exec(t)) !== null) {
                  addSanKey(im[1], 'formatSettingsResponse:return', helpersPath, lineAt(src, bodyStart + rStart + entry.offset));
                }
              } else {
                const km = t.match(/^([A-Za-z_$][\w$]*)\s*(?::|,|$)/);
                if (km) addSanKey(km[1], 'formatSettingsResponse:return', helpersPath, lineAt(src, bodyStart + rStart + entry.offset));
              }
            }
          }
        }
      }
    }
  }

  if (normRaw) {
    const src = stripComments(normRaw);
    const nm = src.match(/\bnormalizeSettingsPaths\s*=\s*\([^)]*\)\s*=>\s*\{/);
    if (nm) {
      const start = nm.index + nm[0].length - 1;
      const end = findMatching(src, start, '{', '}');
      if (end > start) {
        const body = src.slice(start, end);
        const pRe = /\bnext\.([A-Za-z_$][\w$]*)\b/g;
        let pm;
        while ((pm = pRe.exec(body)) !== null) {
          addSanKey(pm[1], 'normalizeSettingsPaths', normPath, lineAt(src, start + pm.index));
        }
      }
    }
  }

  if (runtimeRaw) {
    const src = stripComments(runtimeRaw);
    const pRe = /\b(currentSettings|mergedSettings|formatted)\??\.([A-Za-z_$][\w$]*)\b/g;
    let pm;
    while ((pm = pRe.exec(src)) !== null) {
      if (['length', 'trim', 'map', 'filter'].includes(pm[2])) continue;
      addSanKey(pm[2], `settingsRuntime:${pm[1]}`, runtimePath, lineAt(src, pm.index));
    }
  }

  return { dir, registryFields, sanitizerKeys };
}

// ---------------------------------------------------------------------------
// 4. settings-store extractor
// ---------------------------------------------------------------------------
const STORE_SPECS = [
  { file: 'packages/ui/src/stores/useUIStore.ts', store: 'useUIStore', typeNames: ['UIStore'] },
  { file: 'packages/ui/src/stores/useSessionDisplayStore.ts', store: 'useSessionDisplayStore', typeNames: ['SessionDisplayStore'] },
  { file: 'packages/ui/src/stores/useConfigStore.ts', store: 'useConfigStore', typeNames: ['ConfigStore'] },
  { file: 'packages/ui/src/stores/useUpdateStore.ts', store: 'useUpdateStore', typeNames: ['UpdateState', 'UpdateStore'] },
  { file: 'packages/ui/src/stores/useInputHistoryStore.ts', store: 'useInputHistoryStore', typeNames: ['InputHistoryStoreState', 'InputHistorySnapshot'] },
  { file: 'packages/ui/src/stores/messageQueueStore.ts', store: 'useMessageQueueStore', typeNames: ['MessageQueueState', 'MessageQueueActions'] },
  { file: 'packages/ui/src/stores/permissionStore.ts', store: 'usePermissionStore', typeNames: ['PermissionStore'] },
  { file: 'packages/ui/src/stores/useOpenInAppsStore.ts', store: 'useOpenInAppsStore', typeNames: ['OpenInAppsState', 'OpenInAppsStore'] },
  { file: 'packages/ui/src/stores/useSessionWarmingStore.ts', store: 'useSessionWarmingStore', typeNames: ['SessionWarmingStore', 'SessionWarmingState'] },
];

function extractStoreMembers(ref) {
  const result = new Map();

  for (const spec of STORE_SPECS) {
    const raw = readFileAt(ref, spec.file);
    if (!raw) continue;
    const src = stripComments(raw);
    const fields = new Map(); // name -> { line, isFunctionType }
    const partializeKeys = new Set();

    for (const typeName of spec.typeNames) {
      const re = new RegExp(`(?:interface|type)\\s+${typeName}(?:\\s+extends\\s+[^{]+)?\\s*(?:=\\s*)?\\{`);
      const m = src.match(re);
      if (!m) continue;
      const start = m.index + m[0].length - 1;
      const end = findMatching(src, start, '{', '}');
      if (end <= start) continue;
      const body = src.slice(start + 1, end);
      for (const entry of splitTopLevel(body, [';', ','])) {
        const trimmed = entry.text.trim();
        if (!trimmed) continue;
        // method signature or property signature
        const sigM = trimmed.match(/^(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*(?:\(([\s\S]*)\)\s*:\s*([\s\S]+)|:\s*([\s\S]+))$/);
        if (!sigM) continue;
        const name = sigM[1];
        const ln = lineAt(src, start + 1 + entry.offset + entry.text.search(/\S/));
        let isFn = false;
        if (sigM[2] !== undefined) {
          isFn = true;
        } else if (sigM[4]) {
          // check top-level `=>` in type annotation
          let depth = 0;
          const t = sigM[4];
          for (let i = 0; i < t.length - 1; i++) {
            const c = t[i];
            if (c === '(' || c === '{' || c === '<') depth++;
            else if (c === ')' || c === '}' || c === '>') depth--;
            else if (depth === 0 && c === '=' && t[i + 1] === '>') {
              isFn = true;
              break;
            }
          }
        }
        fields.set(name, { line: ln, isFunctionType: isFn });
      }
    }

    // partialize: (state) => ({ ... })
    const partM = src.match(/\bpartialize\s*:\s*\([^)]*\)\s*=>\s*\(\s*\{/);
    if (partM) {
      const start = partM.index + partM[0].length - 1;
      const end = findMatching(src, start, '{', '}');
      if (end > start) {
        const inner = src.slice(start + 1, end);
        for (const entry of splitTopLevel(inner, [','])) {
          const km = entry.text.trim().match(/^([A-Za-z_$][\w$]*)\s*(?::|$)/);
          if (km) partializeKeys.add(km[1]);
        }
      }
    }

    for (const [name, info] of fields.entries()) {
      const pascal = name[0].toUpperCase() + name.slice(1);
      const candidateSetters = [
        `set${pascal}`,
        `apply${pascal}`,
        name.startsWith('settings') ? `setSettings${name.slice('settings'.length)}` : null,
      ].filter(Boolean);
      const foundSetter = candidateSetters.find((s) => fields.has(s)) ?? null;
      result.set(`${spec.store}.${name}`, {
        id: `${spec.store}.${name}`,
        store: spec.store,
        file: spec.file,
        line: info.line,
        member: name,
        kind: info.isFunctionType ? 'action' : 'field',
        persisted: partializeKeys.has(name),
        hasSetter: info.isFunctionType ? null : Boolean(foundSetter),
        setterName: foundSetter,
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 5. settings-search extractor
// ---------------------------------------------------------------------------
function extractSettingsSearch(ref) {
  const file = 'packages/ui/src/lib/settings/search.ts';
  const raw = readFileAt(ref, file);
  const items = new Map();
  if (!raw) return items;
  const src = stripComments(raw);
  const m = src.match(/\bSETTINGS_SEARCH_ITEMS[^=]*=\s*\[/);
  if (!m) return items;
  const start = m.index + m[0].length - 1;
  const end = findMatching(src, start, '[', ']');
  if (end <= start) return items;
  const body = src.slice(start + 1, end);
  for (const entry of splitTopLevel(body, [','])) {
    const trimmed = entry.text.trim();
    if (!trimmed.startsWith('{')) continue;
    const ln = lineAt(src, start + 1 + entry.offset + entry.text.search(/\S/));
    const id = trimmed.match(/\bid\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null;
    const page = trimmed.match(/\bpage\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null;
    const titleKey = trimmed.match(/\btitleKey\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null;
    const descriptionKey = trimmed.match(/\bdescriptionKey\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? null;
    const hasIsAvailable = /\bisAvailable\s*[:(]/.test(trimmed);
    const kwMatch = trimmed.match(/\bkeywords\s*:\s*\[([^\]]*)\]/);
    const keywords = kwMatch ? extractQuotedLiterals(kwMatch[1]) : [];
    if (id) {
      items.set(id, { id, page, titleKey, descriptionKey, keywords, hasIsAvailable, file, line: ln });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Consumer scan for registry keys (mirrors registry.test.ts effects scan)
// ---------------------------------------------------------------------------
const PLUMBING_FILES = new Set([
  'packages/ui/src/lib/settings/registry.ts',
  'packages/ui/src/lib/settings/registry.test.ts',
  'packages/ui/src/lib/settings/registry-snapshot.ts',
  'packages/ui/src/lib/settings/search.ts',
  'packages/ui/src/lib/persistence.ts',
  'packages/ui/src/lib/persistence.test.ts',
  'packages/ui/src/lib/appearanceAutoSave.ts',
  'packages/ui/src/lib/modelPrefsAutoSave.ts',
  'packages/web/server/lib/host/settings-helpers.js',
  'packages/web/server/lib/host/settings-helpers.test.js',
  'packages/web/server/lib/host/settings-runtime.js',
  'packages/web/server/lib/host/settings-files.js',
  'packages/web/server/lib/opencode/settings-helpers.js',
  'packages/web/server/lib/opencode/settings-helpers.test.js',
  'packages/web/server/lib/opencode/settings-runtime.js',
  'packages/web/server/lib/opencode/settings-files.js',
]);

function isPlumbingPath(rel) {
  return (
    PLUMBING_FILES.has(rel)
    || rel.startsWith('packages/ui/src/lib/i18n/messages/')
    || /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(rel)
    || rel.endsWith('settings-registry.json')
  );
}

function scanNonPlumbingIdentifiers(ref) {
  const roots = ['packages/ui/src', 'packages/web/server', 'packages/electron', 'packages/mobile', 'packages/agent-service'];
  const index = new Map();
  for (const root of roots) {
    const files = listTreeFiles(ref, root).filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));
    for (const file of files) {
      if (isPlumbingPath(file)) continue;
      const src = readFileAt(ref, file);
      if (!src) continue;
      const isStore = file.startsWith('packages/ui/src/stores/');
      for (const line of src.split('\n')) {
        const ids = line.match(/[A-Za-z_$][\w$]*/g);
        if (!ids) continue;
        for (const id of new Set(ids)) {
          if (isStore) {
            const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (
              new RegExp(`^\\s*(readonly\\s+)?${escaped}\\??\\s*:`).test(line)
              || new RegExp(`^\\s*set[A-Z]\\w*\\??\\s*:`).test(line)
              || new RegExp(`${escaped}\\s*:\\s*state\\.${escaped}\\b`).test(line)
              || new RegExp(`set\\(\\{[^}]*\\b${escaped}\\s*:`).test(line)
              || new RegExp(`\\b${escaped}\\s*=(?!=)`).test(line)
              || new RegExp(`delete\\s+state\\.${escaped}\\b`).test(line)
            ) {
              continue;
            }
          }
          const set = index.get(id) ?? new Set();
          set.add(file);
          index.set(id, set);
        }
      }
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// Compare upstream vs fork
// ---------------------------------------------------------------------------
function runInventory(opts) {
  const upRef = opts.upstreamRef;
  const fkRef = opts.forkRef;

  const upItems = extractSettingsItems(upRef);
  const fkItems = extractSettingsItems(fkRef);

  const upReg = extractSettingsRegistry(upRef);
  const fkReg = extractSettingsRegistry(fkRef);

  const upSan = extractSettingsSanitizer(upRef);
  const fkSan = extractSettingsSanitizer(fkRef);

  const upStores = extractStoreMembers(upRef);
  const fkStores = extractStoreMembers(fkRef);

  const upSearch = extractSettingsSearch(upRef);
  const fkSearch = extractSettingsSearch(fkRef);

  const fkConsumers = scanNonPlumbingIdentifiers(fkRef);

  const formatLocs = (entries) => entries.map((e) => `${e.file}:${e.line}`).join('; ');

  const inventory = [];

  // 1. settings-item
  const allItemIds = new Set([...upItems.keys(), ...fkItems.keys()]);
  for (const id of [...allItemIds].sort()) {
    const up = upItems.get(id);
    const fk = fkItems.get(id);
    const inUpSearch = upSearch.has(id);
    const inFkSearch = fkSearch.has(id);
    let status = 'present';
    const notes = [];
    if (up && !fk) {
      status = inFkSearch ? 'half-present' : 'missing';
      if (inFkSearch) notes.push('still in fork search.ts without UI settingsItem');
    } else if (!up && fk) {
      status = 'fork-only';
    } else if (up && fk) {
      if (inUpSearch && !inFkSearch) {
        status = 'half-present';
        notes.push('UI settingsItem exists, dropped from search.ts');
      }
    }
    inventory.push({
      class: 'settings-item',
      item: id,
      upstreamRef: up ? formatLocs(up) : '-',
      forkRef: fk ? formatLocs(fk) : '-',
      status,
      notes: notes.join('; '),
    });
  }

  // 2. settings-registry
  const allRegKeys = new Set([
    ...upReg.fields.keys(), ...upReg.localDeviceKeys.keys(), ...upReg.desktopShellKeys.keys(),
    ...fkReg.fields.keys(), ...fkReg.localDeviceKeys.keys(), ...fkReg.desktopShellKeys.keys(),
  ]);
  for (const key of [...allRegKeys].sort()) {
    const up = upReg.fields.get(key) ?? upReg.localDeviceKeys.get(key) ?? upReg.desktopShellKeys.get(key);
    const fk = fkReg.fields.get(key) ?? fkReg.localDeviceKeys.get(key) ?? fkReg.desktopShellKeys.get(key);
    let status = 'present';
    const notes = [];
    if (up && !fk) {
      const inSan = fkSan.registryFields.has(key) || fkSan.sanitizerKeys.has(key);
      const inStore = fkStores.has(`useUIStore.${key}`) || fkStores.has(`useConfigStore.${key}`);
      const hasConsumer = (fkConsumers.get(key)?.size ?? 0) > 0;
      if (inSan || inStore || hasConsumer) {
        status = 'half-present';
        if (inSan) notes.push('still in server sanitizer');
        if (inStore) notes.push('still in store');
        if (hasConsumer) notes.push(`still referenced in ${[...fkConsumers.get(key)].slice(0, 3).join(', ')}`);
      } else {
        status = 'missing';
      }
    } else if (!up && fk) {
      status = 'fork-only';
    } else if (up && fk && fkReg.fields.has(key)) {
      const spec = fkReg.fields.get(key);
      const upSpec = upReg.fields.get(key);
      const isWritable = !spec.computed && spec.scope !== 'device';
      if (isWritable && !fkSan.registryFields.has(key)) {
        status = 'half-present';
        notes.push('missing from server settings-registry.json');
      }
      if (isWritable && !fkSan.sanitizerKeys.has(key)) {
        status = 'half-present';
        notes.push('missing from settings-helpers.js sanitizer');
      }
      if (spec.uiStore && spec.uiField && ['useUIStore', 'useSessionDisplayStore', 'useConfigStore'].includes(spec.uiStore)) {
        const storeEntry = fkStores.get(`${spec.uiStore}.${spec.uiField}`);
        if (!storeEntry) {
          status = 'half-present';
          notes.push(`ui binding ${spec.uiStore}.${spec.uiField} missing from store`);
        } else if (storeEntry.hasSetter === false && spec.uiKind !== 'custom') {
          status = 'half-present';
          notes.push(`store field ${spec.uiStore}.${spec.uiField} has no setter`);
        }
      }
      if (upSpec?.uiKind && !spec.uiKind) {
        status = 'half-present';
        notes.push(`upstream had ui binding (${upSpec.uiStore}.${upSpec.uiField}), fork dropped ui binding`);
      }
      const fieldName = spec.uiField ?? key;
      const cons = new Set([...(fkConsumers.get(key)?.size ? fkConsumers.get(key) : []), ...(fkConsumers.get(fieldName)?.size ? fkConsumers.get(fieldName) : [])]);
      if (cons.size === 0 && !spec.computed) {
        status = 'half-present';
        notes.push('no non-plumbing consumer');
      }
      if (upSpec && JSON.stringify(upSpec.surfaces) !== JSON.stringify(spec.surfaces)) {
        notes.push(`surfaces changed: ${JSON.stringify(upSpec.surfaces)} -> ${JSON.stringify(spec.surfaces)}`);
      }
    }
    inventory.push({
      class: 'settings-registry',
      item: key,
      upstreamRef: up ? `${up.file}:${up.line}` : '-',
      forkRef: fk ? `${fk.file}:${fk.line}` : '-',
      status,
      notes: notes.join('; '),
    });
  }

  // 3. settings-sanitizer
  const allSanKeys = new Set([
    ...upSan.registryFields.keys(), ...upSan.sanitizerKeys.keys(),
    ...fkSan.registryFields.keys(), ...fkSan.sanitizerKeys.keys(),
  ]);
  for (const key of [...allSanKeys].sort()) {
    const upR = upSan.registryFields.get(key);
    const upS = upSan.sanitizerKeys.get(key);
    const fkR = fkSan.registryFields.get(key);
    const fkS = fkSan.sanitizerKeys.get(key);
    const inUp = Boolean(upR || upS);
    const inFk = Boolean(fkR || fkS);
    const upLoc = upR ? `${upR.file}:${upR.line}` : upS ? upS.refs[0] : '-';
    const fkLoc = fkR ? `${fkR.file}:${fkR.line}` : fkS ? fkS.refs[0] : '-';
    let status = 'present';
    const notes = [];
    if (inUp && !inFk) {
      status = fkReg.fields.has(key) ? 'half-present' : 'missing';
      if (fkReg.fields.has(key)) notes.push('still in UI registry.ts');
    } else if (!inUp && inFk) {
      status = 'fork-only';
      if (fkS && !fkR && !fkReg.fields.has(key) && !fkReg.localDeviceKeys.has(key) && !fkReg.desktopShellKeys.has(key)) {
        status = 'half-present';
        notes.push(`sanitizer mentions '${key}' (${[...fkS.branches].join(',')}) without registry entry`);
      }
    } else if (inUp && inFk) {
      if (fkR && !fkR.computed && !fkR.local && fkR.owner !== 'desktop-shell' && fkR.scope !== 'device' && !fkS) {
        status = 'half-present';
        notes.push('in settings-registry.json but no branch in settings-helpers.js');
      } else if (fkS && !fkR && !fkS.branches.has('formatSettingsResponse:return')) {
        const hasCandidate = fkS.branches.has('sanitizeSettingsUpdate:candidate') || fkS.branches.has('sanitizeSettingsUpdate:result') || fkS.branches.has('REGISTRY_BOOLEAN_SETTINGS') || fkS.branches.has('passthrough-array');
        if (hasCandidate) {
          status = 'half-present';
          notes.push(`dead sanitizer branch in settings-helpers.js (${[...fkS.branches].join(',')}) not in settings-registry.json`);
        }
      }
    }
    inventory.push({
      class: 'settings-sanitizer',
      item: key,
      upstreamRef: upLoc,
      forkRef: fkLoc,
      status,
      notes: notes.join('; '),
    });
  }

  // 4. settings-store
  const allStoreKeys = new Set([...upStores.keys(), ...fkStores.keys()]);
  for (const id of [...allStoreKeys].sort()) {
    const up = upStores.get(id);
    const fk = fkStores.get(id);
    let status = 'present';
    const notes = [];
    if (up && !fk) {
      status = 'missing';
    } else if (!up && fk) {
      status = 'fork-only';
    } else if (up && fk) {
      if (fk.kind === 'field' && up.hasSetter && !fk.hasSetter) {
        status = 'half-present';
        notes.push(`setter disappeared (upstream had ${up.setterName})`);
      }
      if (fk.kind === 'field' && up.persisted && !fk.persisted) {
        status = 'half-present';
        notes.push('dropped from store partialize');
      }
    }
    inventory.push({
      class: 'settings-store',
      item: id,
      upstreamRef: up ? `${up.file}:${up.line}` : '-',
      forkRef: fk ? `${fk.file}:${fk.line}` : '-',
      status,
      notes: notes.join('; '),
    });
  }

  // 5. settings-search
  const allSearchIds = new Set([...upSearch.keys(), ...fkSearch.keys()]);
  for (const id of [...allSearchIds].sort()) {
    const up = upSearch.get(id);
    const fk = fkSearch.get(id);
    let status = 'present';
    const notes = [];
    const hasUiAnchor = fkItems.has(id) || [...fkItems.keys()].some((k) => k.endsWith('*') && id.startsWith(k.slice(0, -1)));
    if (up && !fk) {
      status = hasUiAnchor ? 'half-present' : 'missing';
      if (hasUiAnchor) notes.push('UI anchor still exists in fork, missing from search.ts');
    } else if (!up && fk) {
      status = hasUiAnchor ? 'fork-only' : 'half-present';
      if (!hasUiAnchor) notes.push('search.ts entry has no matching UI settingsItem anchor');
    } else if (up && fk) {
      if (!hasUiAnchor && !id.startsWith('shortcuts.action.')) {
        status = 'half-present';
        notes.push('search.ts entry has no matching UI settingsItem anchor');
      }
      if (up.page !== fk.page) notes.push(`page moved: ${up.page} -> ${fk.page}`);
      if (up.hasIsAvailable && !fk.hasIsAvailable) notes.push('isAvailable gate removed');
    }
    inventory.push({
      class: 'settings-search',
      item: id,
      upstreamRef: up ? `${up.file}:${up.line}` : '-',
      forkRef: fk ? `${fk.file}:${fk.line}` : '-',
      status,
      notes: notes.join('; '),
    });
  }

  return { inventory, upItems, fkItems, upReg, fkReg, upSan, fkSan, upStores, fkStores, upSearch, fkSearch };
}

const opts = parseArgs(process.argv.slice(2));
const result = runInventory(opts);

if (opts.outDir) {
  mkdirSync(opts.outDir, { recursive: true });
  const header = ['class', 'item', 'upstream_ref', 'fork_ref', 'status', 'notes'].join('\t');
  const lines = result.inventory.map((r) =>
    [r.class, r.item, r.upstreamRef, r.forkRef, r.status, r.notes].map((v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t'),
  );
  writeFileSync(path.join(opts.outDir, 'A2-settings-inventory.tsv'), `${header}\n${lines.join('\n')}\n`, 'utf8');
}

if (opts.json) {
  console.log(JSON.stringify(result.inventory, null, 2));
} else {
  const summary = {};
  for (const r of result.inventory) {
    summary[r.class] ??= {};
    summary[r.class][r.status] = (summary[r.class][r.status] ?? 0) + 1;
  }
  console.log('Settings Inventory Summary (upstream:', opts.upstreamRef, 'vs fork:', opts.forkRef + ')');
  console.table(summary);
  const gaps = result.inventory.filter((r) => r.status === 'missing' || r.status === 'half-present');
  console.log(`Total rows: ${result.inventory.length}, gaps (missing/half-present): ${gaps.length}`);
}
