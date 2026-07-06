import { descLang } from '#lib/store/index.js';

/**
 * Common utility to get a display string from potentially localized content
 * Priority: Specific language -> zh -> en -> ms -> original value
 */
export const getLocalizedDisplay = (val: unknown, lang?: 'zh' | 'en' | 'ms'): string => {
  if (!val) return '';
  const currentLang = lang || descLang.value || 'zh';

  if (typeof val === 'string') {
    try {
      if (val.startsWith('{') && val.endsWith('}')) {
        const parsed = JSON.parse(val) as Record<string, string>;
        return parsed[currentLang] || parsed.zh || parsed.en || parsed.ms || val;
      }
    } catch(e) {}
    return val;
  }
  
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, string>;
    return obj[currentLang] || obj.zh || obj.en || obj.ms || '';
  }
  
  return String(val);
};
