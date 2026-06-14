import { type } from "arktype";

/**
 * Ensures stable parameter references based on content hash or cache key.
 * This prevents unnecessary re-renders or re-fetches when dependencies 
 * are structurally identical but referentially different.
 */
class StableParamsFactory {
  private cache = new Map<string, any>();

  create<T>(namespace: string, params: T): T {
    const key = `${namespace}:${JSON.stringify(params)}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    this.cache.set(key, params);
    
    // Simple LRU-like cleanup if cache gets too big
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    return params;
  }
}

export const stableParams = new StableParamsFactory();

export function createStableParams<T>(namespace: string, params: T): T {
  return stableParams.create(namespace, params);
}
