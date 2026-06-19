export function uniqueBy<T>(arr: T[], key: keyof T): T[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  return arr.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  if (!Array.isArray(arr)) return {};
  return arr.reduce((acc, item) => {
    const group = String(item[key]);
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
