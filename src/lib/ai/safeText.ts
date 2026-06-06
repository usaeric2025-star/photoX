
/**
 * Safe text accessor for multi-language fields that might be strings or JSON.
 */
export function getSafeText(field: any, locale: string = 'zh'): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  
  // If it's an object with language keys
  if (typeof field === 'object') {
    const val = field[locale] || field.zh || field.en || field.ms || field.name;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return JSON.stringify(val);
    if (val !== undefined && val !== null) return String(val);
    return '';
  }
  
  return String(field);
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
