export function toCamelCase<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

export function toCamelCaseArray<T extends Record<string, unknown>>(arr: T[]): T[] {
  return arr.map(toCamelCase);
}
