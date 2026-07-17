import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
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

/**
 * Translate Chinese words in dimension labels to English to enforce English fallback
 */
export function translateDimensionLabelToEnglish(label: string): string {
  if (!label) return '';
  const mapping: Record<string, string> = {
    '整體': 'Overall',
    '整体': 'Overall',
    '座高': 'Seat Height',
    '坐高': 'Seat Height',
    '扶手': 'Armrest',
    '靠背': 'Backrest',
    '桌面': 'Table Top',
    '抽屜': 'Drawer',
    '抽屉': 'Drawer',
    '櫃子': 'Cabinet',
    '柜子': 'Cabinet',
    '座深': 'Seat Depth',
    '坐深': 'Seat Depth',
    '座寬': 'Seat Width',
    '坐寬': 'Seat Width',
    '坐面': 'Seat',
    '座面': 'Seat',
  };

  let result = label;
  Object.entries(mapping).forEach(([zh, en]) => {
    const regex = new RegExp(zh, 'gi');
    result = result.replace(regex, en);
  });

  // Strip "Estimated" and "AI" prefixes/suffixes that might be noisy
  result = result.replace(/AI Estimated/gi, '')
                 .replace(/Estimated/gi, '')
                 .replace(/AI/gi, '')
                 .trim();

  return result || 'Specs';
}

async function translateDimensionLabelWithAi(label: string): Promise<string> {
  const result = await ErrorFactory.unwrap<any>(
    api.ai['translate'].$post({ json: { promptText: `Translate this to English. Input: "${label}"` } }),
    'Translation failed'
  );
  return result as string || label;
}
