import { ErrorFactory } from '#lib/error/ErrorFactory.js';

/**
 * Clean up redundant language tag prefixes like "zh:", "en:", "ms:" or quotes from the string.
 */
export function cleanTranslationPrefixes(str: string): string {
  if (!str) return '';
  let result = str.trim();
  
  // Strip outer quotes if there are quotes
  if (result.startsWith('"') && result.endsWith('"')) {
    result = result.substring(1, result.length - 1).trim();
  } else if (result.startsWith("'") && result.endsWith("'")) {
    result = result.substring(1, result.length - 1).trim();
  }
  
  // Clean prefixes like "zh:", "zh：", "en:", "en：", "ms:", "ms：", "cn:", "cn：" (case insensitive)
  const prefixRegex = /^(zh|en|ms|cn|zh-cn|malay|chinese|english)\s*[:：]\s*/i;
  let matchCount = 0;
  while (prefixRegex.test(result) && matchCount < 3) {
    result = result.replace(prefixRegex, '').trim();
    matchCount++;
  }
  
  return result;
}

/**
 * Safe text accessor for multi-language fields that might be strings or JSON.
 */
export function getSafeText(field: unknown, locale: string = 'zh'): string {
  if (!field) return '';
  let data: unknown = field; 

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
            cleanStr = JSON.parse(trimmed) as string; // Unescape the wrapper string
          } catch (e) {
            // Strip outer quotes manually if JSON.parse fails on wrapper
            ErrorFactory.capture(e);
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
        ErrorFactory.capture(e);
        // Fallback: use regex to extract locale key even from a broken JSON string
        const regex = new RegExp(`"${locale}"\\s*:\\s*"([^"]+)`);
        const match = trimmed.match(regex);
        if (match) return cleanTranslationPrefixes(match[1]);

        const fallbackMatch = trimmed.match(/"[^"]+":"([^"]+)/);
        if (fallbackMatch) return cleanTranslationPrefixes(fallbackMatch[1]);

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
      } catch (e) {
        ErrorFactory.capture(e);
      }
    } else {
      return cleanTranslationPrefixes(data);
    }
  }
  
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    // Check direct locale entry
    let val = obj[locale];
    if (val === undefined || val === null) {
      // Fallback order: zh -> en -> ms -> name
      val = obj.zh || obj.en || obj.ms || obj.name;
    }
    
    // If nested under translation objects, recurse once
    if (val !== undefined && val !== null) {
      if (typeof val === 'string') {
        if (val.trim().startsWith('{')) {
          return getSafeText(val, locale);
        }
        return cleanTranslationPrefixes(val);
      }
      if (typeof val === 'object') {
        // Check if nested is actually { zh: "..." } etc.
        return getSafeText(val, locale);
      }
      return cleanTranslationPrefixes(String(val));
    }
    return '';
  }
  
  return cleanTranslationPrefixes(String(data));
}

/**
 * Standardizes units for display.
 */
function formatUnit(unit: string | null | undefined): string {
  const u = unit?.toLowerCase().trim();
  if (u === 'inch' || u === 'in' || u === 'inc') return 'inch';
  if (u === 'cm') return 'cm';
  if (u === 'mm') return 'mm';
  if (u === 'm') return 'm';
  return u || 'cm';
}
