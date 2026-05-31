/**
 * Defensive utility for safe array access
 */
export function safeArray<T>(arr: unknown): T[] {
  if (!arr) return [];
  if (Array.isArray(arr)) return arr as T[];
  if (typeof arr === 'string') {
    // Handle comma-separated strings
    return arr.split(',').map(s => s.trim()).filter(Boolean) as unknown as T[];
  }
  // If it's a single item incorrectly stored as non-array
  if (typeof arr === 'object' && arr !== null) return [arr as T];
  return [];
}
