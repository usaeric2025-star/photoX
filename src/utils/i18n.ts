/**
 * Safely extracts a localized string from a JSON object.
 * Format: { zh: string, en: string, ms: string }
 */
export function safeText(
  obj: any, 
  lang: 'zh' | 'en' | 'ms' = 'zh', 
  fallback: string = '-'
): string {
  if (!obj) return fallback;

  // Handle legacy string data
  if (typeof obj === 'string') return obj;

  // Attempt to get the requested language
  const val = obj[lang];
  if (val) return val;

  // Fallback chain: requested -> zh -> en -> ms -> fallback
  return obj.zh || obj.en || obj.ms || fallback;
}
