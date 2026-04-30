export function normalizeTagIds(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(item => {
      if (typeof item === 'object' && item !== null) return String(item.id || '');
      return String(item);
    }).filter(id => id && id !== '[object Object]');
  }
  if (typeof input === 'string') {
    return input.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}
