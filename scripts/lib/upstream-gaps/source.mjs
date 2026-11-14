/**
 * Source-text helpers shared by the upstream-gaps audits.
 *
 * An import, re-export, comment or string names a symbol without using it.
 * Audits that ask "is this symbol used?" strip those first, so a mention
 * that never runs never counts as coverage.
 */

export function stripModuleSyntax(src) {
  return src
    // Import and re-export statements first, while their module strings are intact.
    .replace(/^[ \t]*import\s+[^'"();]*?from\s*['"][^'"]+['"][ \t]*;?/gm, '')
    .replace(/^[ \t]*import\s*['"][^'"]+['"][ \t]*;?/gm, '')
    .replace(/^[ \t]*export\s*\{[^}]*\}(?:\s*from\s*['"][^'"]+['"])?[ \t]*;?/gm, '')
    // Block and line comments; `//` after a colon is a URL, not a comment.
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1')
    // Single-line string literals.
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, "''");
}

// Any use of the symbol in code: a call, a default parameter value, a dependency
// object entry, or member access (`module.name`).
export function usesName(strippedSrc, name) {
  return new RegExp(`(?<![\\w$])${name}(?![\\w$])`).test(strippedSrc);
}
