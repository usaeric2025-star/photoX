/**
 * Ensures an object follows the { zh: string, en: string, ms: string } format.
 * Used to normalize AI output or legacy data.
 */
export function normalizeI18n(input: any, fallbackStr: string = ''): { zh: string; en: string; ms: string } {
  if (!input) {
    return { zh: fallbackStr, en: fallbackStr, ms: fallbackStr };
  }

  // If input is already a string, use it as the Chinese value and repeat it
  if (typeof input === 'string') {
    return { zh: input, en: input, ms: input };
  }

  // If it's an object, extract values or fallback
  return {
    zh: String(input.zh || input.name || fallbackStr),
    en: String(input.en || input.zh || input.name || fallbackStr),
    ms: String(input.ms || input.zh || input.name || fallbackStr)
  };
}
