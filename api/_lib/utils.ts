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
export function toCamelCaseKeys<T>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCaseKeys(v)) as any;
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [snakeToCamel(key)]: toCamelCaseKeys(obj[key]),
      }),
      {},
    ) as any;
  }
  return obj;
}

