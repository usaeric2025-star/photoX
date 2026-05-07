/**
 * Defensive utility for safe array access
 */
export function safeArray<T>(arr: any): T[] {
  if (!arr) return [];
  if (Array.isArray(arr)) return arr;
  // If it's a single item incorrectly stored as non-array
  if (typeof arr === 'object' && arr !== null) return [arr as unknown as T];
  return [];
}
