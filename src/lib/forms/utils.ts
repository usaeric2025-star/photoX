export const toSingleString = (val: unknown): string => {
  if (typeof val === 'object' && val !== null) {
    const v = val as Record<string, string>;
    return v.zh || v.en || v.ms || '';
  }
  return typeof val === 'string' ? val : '';
};

export const toMultiObject = (val: unknown): { zh: string; en: string; ms: string } => {
  if (typeof val === 'object' && val !== null) {
    const v = val as Record<string, string>;
    return { zh: v.zh || '', en: v.en || '', ms: v.ms || '' };
  }
  const s = typeof val === 'string' ? val : '';
  return { zh: s, en: '', ms: '' };
};
