/**
 * Source-text helpers shared by the upstream-gaps audits.
 *
 * An import or re-export names a symbol without using it. Audits that ask
 * "is this symbol used?" strip module syntax first, so an imported-but-unused
 * symbol never counts as coverage.
 */

export function stripModuleSyntax(src) {
  return src
    .replace(/^[ \t]*import\s+[^'"();]*?from\s*['"][^'"]+['"][ \t]*;?/gm, '')
    .replace(/^[ \t]*import\s*['"][^'"]+['"][ \t]*;?/gm, '')
    .replace(/^[ \t]*export\s*\{[^}]*\}(?:\s*from\s*['"][^'"]+['"])?[ \t]*;?/gm, '');
}

// A call of the symbol: the only use that makes a route or constructor function run.
export function callsName(strippedSrc, name) {
  return new RegExp(`(?<![\\w$.])${name}\\s*\\(`).test(strippedSrc);
}

// Any value use of the symbol, such as a data table spread into a mounted module.
export function usesName(strippedSrc, name) {
  return new RegExp(`(?<![\\w$])${name}(?![\\w$])`).test(strippedSrc);
}
