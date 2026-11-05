/** Normalisation shared by import, display and tests. Mirrors the SQL helpers. */

export function normalizeMatric(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** "okafor CHINEDU" → "Okafor Chinedu". Only used for display of typed input. */
export function titleCase(value: string): string {
  return normalizeName(value)
    .toLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
