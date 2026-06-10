import { logger } from '@/lib/logger';

/**
 * Checks if a string is a common placeholder or useless text (null, undefined, [], etc.)
 */
export const isPlaceholderText = (str: string): boolean => {
  if (!str) return true;
  const s = str.trim().toLowerCase();
  
  // Basic technical placeholders
  const technicalNulls = ['null', 'undefined', '{}', '[object object]', '[对象 对象]', 'n/a', 'na', 'none', '', 'undefined undefined'];
  if (technicalNulls.includes(s)) return true;
  
  // Human placeholders (Chinese)
  const placeholders = [
    '暂无', '置顶', '无', '未命名', '不知名', '说明', 
    '请填写', '描述', '产品描述', '暂无说明', '未命名产品',
    '待补充', '批量分析', '测试'
  ];
  return placeholders.some(p => s.includes(p));
};

/**
 * Specific check for product/photo names that look like system defaults or IDs
 */
export const isPlaceholderName = (nameStr: string): boolean => {
  if (!nameStr) return true;
  const s = nameStr.trim().toLowerCase();
  
  // If it's general placeholder text, it's a placeholder name
  if (isPlaceholderText(s)) return true;
  
  // Numeric/ID-like names (UUIDs, long hex, or pure numbers)
  if (/^\d+$/.test(s)) return true;
  if (/^[a-f0-9]{32}$/.test(s)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
  
  // Camera filename prefixes and common upload temporary names
  const cameraPrefixes = [
    'img_', 'dsc_', 'pxl_', 'screenshot', 'upload_', 
    'temp-', 'image_', 'img-', 'dsc-', 'whatsapp'
  ];
  
  if (cameraPrefixes.some(prefix => s.startsWith(prefix))) return true;
  
  // Pattern match for IMG1234, DSC001 etc
  return /^(img|dsc|pxl|res)\d+/i.test(s);
};

/**
 * Determines if a record (photo or group) has "meaningful" info that shouldn't be overwritten blindly
 */
export const hasExistingInfo = (p: any): boolean => {
  if (!p) return false;
  
  let hasRealName = false;
  const nameVal = p.name;
  
  if (nameVal) {
    if (typeof nameVal === 'object') {
      // For multi-lang names, check if any field has real content
      const parts = [nameVal.zh, nameVal.en, nameVal.ms].map(s => String(s || '').trim());
      hasRealName = parts.some(s => s !== '' && !isPlaceholderName(s) && s.length > 2);
    } else {
      const s = String(nameVal).trim();
      hasRealName = !isPlaceholderName(s) && s.length > 2;
    }
  }
  
  const desc = p.description;
  let hasRealDesc = false;
  
  if (desc) {
    if (typeof desc === 'object') {
      hasRealDesc = Object.values(desc).some(v => v && String(v).length > 10 && !isPlaceholderText(String(v)));
    } else {
      hasRealDesc = String(desc).length > 10 && !isPlaceholderText(String(desc));
    }
  }
  
  return hasRealName && hasRealDesc;
};

/**
 * Safe name splitting/fallback utility
 */
export const getDisplayName = (nameObj: any, lang: string = 'zh'): string => {
  if (!nameObj) return '未命名';
  if (typeof nameObj === 'string') return nameObj;
  return nameObj[lang] || nameObj.zh || nameObj.en || nameObj.ms || '未命名';
};

/**
 * Name splitting logic: + > , > ；
 * Main name: before delimiter, Others: after
 * Useful for extracting primary product name from technical labels
 */
export const splitProductName = (name: string): { main: string, others: string[] } => {
  // Clear common [object Object] pollution
  if (!name || name.includes('[object')) return { main: '未命名', others: [] };
  
  const parts = name.split(/[+\,；]+/).map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { main: name, others: [] };
  
  return { main: parts[0], others: parts.slice(1) };
};
