
/**
 * Safe text accessor for multi-language fields that might be strings or JSON.
 */
export function getSafeText(field: any, locale: string = 'zh'): string {
  if (!field) return '';
  let data = field;

  // If it is a stringified JSON object
  if (typeof data === 'string' && data.trim().startsWith('{')) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // It's a broken JSON string.
      // 1. Try a simple regex for finding the locale value: "zh":"value"
      const regex = new RegExp(`"${locale}"\\s*:\\s*"([^"]+)`); // Allowing missing closing quote
      const match = data.match(regex);
      if (match) return match[1];

      // 2. If no match for locale, try to extract any JSON value: "key":"value"
      const anyMatch = data.match(/"[^"]+":"([^"]+)/);
      if (anyMatch) return anyMatch[1];
      
      // 3. Fallback: If still nothing, just return raw string or make it readable
      return data.replace(/[{}"\\]/g, ' ').replace(locale, '').replace(':', ' ').trim();
    }
  }

  if (typeof data === 'string') return data;
  
  // If it's an object with language keys
  if (typeof data === 'object') {
    const val = data[locale] || data.zh || data.en || data.ms || data.name;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return JSON.stringify(val);
    if (val !== undefined && val !== null) return String(val);
    return '';
  }
  
  return String(data);
}

/**
 * Standardizes units for display.
 */
export function formatUnit(unit: string | null | undefined): string {
  const u = unit?.toLowerCase().trim();
  if (u === 'inch' || u === 'in' || u === 'inc') return 'inch';
  if (u === 'cm') return 'cm';
  if (u === 'mm') return 'mm';
  if (u === 'm') return 'm';
  return u || 'cm';
}
