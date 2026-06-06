
/**
 * Safe text accessor for multi-language fields that might be strings or JSON.
 */
export function getSafeText(field: any, locale: string = 'zh'): string {
  if (!field) return '';
  let data = field;

  // Keep parsing if it's a string representing JSON (handle nested stringified JSON too!)
  let parsedCount = 0;
  while (typeof data === 'string' && parsedCount < 3) {
    const trimmed = data.trim();
    // Support strings that might be wrapped in external quotes like "{\"zh\":...}" or start with {
    if (trimmed.startsWith('{') || (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.includes('{'))) {
      try {
        let cleanStr = trimmed;
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          try {
            cleanStr = JSON.parse(trimmed); // Unescape the wrapper string
          } catch (e) {
            // Strip outer quotes manually if JSON.parse fails on wrapper
            cleanStr = trimmed.slice(1, -1);
          }
        }
        if (typeof cleanStr === 'string' && cleanStr.trim().startsWith('{')) {
          data = JSON.parse(cleanStr);
        } else {
          data = cleanStr;
        }
        parsedCount++;
      } catch (e) {
        // Fallback: use regex to extract locale key even from a broken JSON string
        const regex = new RegExp(`"${locale}"\\s*:\\s*"([^"]+)`);
        const match = trimmed.match(regex);
        if (match) return match[1];

        const anyMatch = trimmed.match(/"[^"]+":"([^"]+)/);
        if (anyMatch) return anyMatch[1];

        break;
      }
    } else {
      break;
    }
  }

  if (typeof data === 'string') {
    // If it's still a JSON string for some reason
    if (data.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object') {
          data = parsed;
        }
      } catch (e) {}
    } else {
      return data;
    }
  }
  
  if (data && typeof data === 'object') {
    // Check direct locale entry
    let val = data[locale];
    if (val === undefined || val === null) {
      // Fallback order: zh -> en -> ms -> name
      val = data.zh || data.en || data.ms || data.name;
    }
    
    // If nested under translation objects, recurse once
    if (val !== undefined && val !== null) {
      if (typeof val === 'string') {
        if (val.trim().startsWith('{')) {
          return getSafeText(val, locale);
        }
        return val;
      }
      if (typeof val === 'object') {
        return getSafeText(val, locale);
      }
      return String(val);
    }
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
