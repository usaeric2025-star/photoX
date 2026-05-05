
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const createCache = <T>(ttlMs: number = 5 * 60 * 1000) => {
  let cache: CacheEntry<T> | null = null;

  return {
    get: (): T | null => {
      if (!cache) return null;
      const now = Date.now();
      if (now - cache.timestamp > ttlMs) {
        cache = null;
        return null;
      }
      return cache.data;
    },
    set: (data: T) => {
      cache = {
        data,
        timestamp: Date.now()
      };
    },
    clear: () => {
      cache = null;
    }
  };
};

export const createKeyedCache = <T>(ttlMs: number = 5 * 60 * 1000) => {
  const cacheMap = new Map<string, CacheEntry<T>>();

  return {
    get: (key: string): T | null => {
      const entry = cacheMap.get(key);
      if (!entry) return null;
      const now = Date.now();
      if (now - entry.timestamp > ttlMs) {
        cacheMap.delete(key);
        return null;
      }
      return entry.data;
    },
    set: (key: string, data: T) => {
      cacheMap.set(key, {
        data,
        timestamp: Date.now()
      });
    },
    clear: () => {
      cacheMap.clear();
    }
  };
};
