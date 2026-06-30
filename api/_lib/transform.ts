export function toCamelCase<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Check if the value is a plain object and recursively convert it, if needed.
    // For now, doing a shallow conversion as per user snippet.
    result[camelKey] = value;
  }
  return result as T;
}

export function toCamelCaseArray<T extends Record<string, unknown>>(arr: T[]): T[] {
  return arr.map(toCamelCase);
}
