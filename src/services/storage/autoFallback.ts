const PREFIX = 'photox_';
const memoryCache = new Map<string, any>();

export const STORAGE_KEYS = {
  AUTH: 'auth',
  SETTINGS: 'cached_settings',
  THEME: 'theme',
  PREFERENCE: 'preferences',
  CACHE: 'cache',
} as const;

type StorageKey = string;

export const storage = {
  get<T>(key: StorageKey, fallback: T): T {
    try {
      if (typeof window === 'undefined') return fallback;
      const raw = localStorage.getItem(`${PREFIX}${key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key}`);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return (memoryCache.get(key) as T) ?? fallback;
    }
  },

  set<T>(key: StorageKey, value: T): boolean {
    try {
      if (typeof window === 'undefined') {
        memoryCache.set(key, value);
        return true;
      }
      localStorage.setItem(`${PREFIX}${key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key}`, JSON.stringify(value));
      return true;
    } catch {
      memoryCache.set(key, value);
      return false;
    }
  },

  remove(key: StorageKey): boolean {
    try {
      if (typeof window === 'undefined') {
        memoryCache.delete(key);
        return true;
      }
      localStorage.removeItem(`${PREFIX}${key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key}`);
      memoryCache.delete(key);
      return true;
    } catch {
      return false;
    }
  },

  clear(): boolean {
    try {
      if (typeof window === 'undefined') {
        memoryCache.clear();
        return true;
      }
      Object.values(STORAGE_KEYS).forEach(k => {
        localStorage.removeItem(`${PREFIX}${k}`);
      });
      memoryCache.clear();
      return true;
    } catch {
      return false;
    }
  },

  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(`${PREFIX}${key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key}`);
    } catch {
      return memoryCache.get(key) || null;
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      if (typeof window === 'undefined') {
        memoryCache.set(key, value);
        return true;
      }
      localStorage.setItem(`${PREFIX}${key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key}`, value);
      return true;
    } catch {
      memoryCache.set(key, value);
      return false;
    }
  },

  isAvailable(): boolean {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },
};
