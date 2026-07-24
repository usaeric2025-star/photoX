/**
 * Utility functions for API handlers
 */

/**
 * Converts a snake_case string to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (g) => g[1].toUpperCase());
}

/**
 * Deeply converts object keys from snake_case to camelCase
 */
export function toCamelCaseKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCaseKeys(v)) as unknown as T;
  } else if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    const typedObj = obj as Record<string, unknown>;
    return Object.keys(typedObj).reduce(
      (result, key) => ({
        ...result,
        [snakeToCamel(key)]: toCamelCaseKeys(typedObj[key]),
      }),
      {},
    ) as unknown as T;
  }
  return obj as T;
}

