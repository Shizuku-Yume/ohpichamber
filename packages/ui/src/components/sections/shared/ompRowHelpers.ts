/** Infer the display unit for a number setting by its id naming convention. */
export function inferUnit(id: string): 'percent' | 'seconds' | 'tokens' | undefined {
  if (id.endsWith('Percent') || id.endsWith('Pct')) return 'percent';
  if (id.endsWith('Seconds') || id.endsWith('Sec')) return 'seconds';
  if (id.endsWith('Tokens')) return 'tokens';
  return undefined;
}

/** Lower-case, hyphenated slug the option-label keys use. */
export function optionSlug(value: unknown): string {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** OMP's own sentinel: `-1` or `default`, both shown as the Default option. */
export function isSentinelOption(value: string): boolean {
  return value === 'default' || value === '-1';
}
