// 根据当前语言返回正确的字段值
export const getLocalizedValue = (
  item: { zh?: string; en?: string; ms?: string; name?: string },
  language: 'zh' | 'en' | 'ms'
): string => {
  if (language === 'zh' && item.zh) return item.zh
  if (language === 'en' && item.en) return item.en
  if (language === 'ms' && item.ms) return item.ms
  return item.name || ''
}

// 批量转换数组
export const getLocalizedArray = <T extends { zh?: string; en?: string; ms?: string }>(
  items: T[],
  language: 'zh' | 'en' | 'ms'
): (T & { displayName: string })[] => {
  return items.map(item => ({
    ...item,
    displayName: getLocalizedValue(item, language)
  }))
}
