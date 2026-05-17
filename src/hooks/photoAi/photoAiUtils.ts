export const shouldUpdateName = (name: string | null | undefined): boolean => {
  if (!name || name.trim() === '') return true;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (/^[\d\s\-_]+$/.test(trimmed)) return true;
  if (
    lower === 'furniture' ||
    lower === '未命名产品' ||
    lower === 'furniture record' ||
    /\.(jpg|jpeg|png|heic|webp)$/i.test(trimmed) ||
    /^(img|image|photo|dsc|pic)[\s_-]?\d+/i.test(lower)
  ) return true;
  if (trimmed.length < 3) return true;
  return false;
};

export const cleanAiName = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const trimmed = name.trim();
  const measurementOnlyPattern = /^(\d+(\.\d+)?\s*(cm|inch|mm|["'”]))+$/i;
  if (measurementOnlyPattern.test(trimmed)) return null;
  return trimmed;
};

export const formatAiError = (errorMsg: string): string => {
  if (errorMsg.includes('{')) {
    try {
      const jsonPart = errorMsg.substring(errorMsg.indexOf('{'));
      const parsed = JSON.parse(jsonPart);
      return (parsed as any).error?.message || (parsed as any).message || errorMsg;
    } catch(e) {}
  }
  return errorMsg;
};

export const isMeasurementOnly = (name: string): boolean => {
  const measurementOnly = /^(\d+(\.\d+)?\s*(cm|inch|mm|["'”]|x|X))(\s*(x|X)\s*(\d+(\.\d+)?\s*(cm|inch|mm|["'”]|x|X)))*$/i;
  return measurementOnly.test(name);
};
