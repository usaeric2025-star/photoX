import { createJSONStorage } from 'jotai/utils';

const PREFIX = 'photox_';
const memoryCache = new Map<string, unknown>();

export const STORAGE_KEYS = {
  AUTH: 'auth',
  SETTINGS: 'cached_settings',
  THEME: 'theme',
  PREFERENCE: 'preferences',
  CACHE: 'cache',
  LANG: 'appLang',
  DESC_LANG: 'descLang',
  COLUMNS: 'columns',
  ACTIVE_GROUP: 'activeGroupId',
  ACTIVE_PHOTO: 'activePhotoId',
  EDIT_PHOTO: 'editPhotoId',
  BATCH_EDITING: 'batchEditingIds',
  GROUP_SETTINGS_OPEN: 'groupSettingsOpen',
  VIEW_MODE: 'viewMode',
  ACTIVE_SCREEN: 'activeScreen',
  SIDEBAR_COLLAPSED: 'isSidebarCollapsed',
  EDIT_FORM_CACHE: 'edit_form_cache',
  SORT_ORDER: 'sortOrder',
  RECENTLY_VIEWED: 'recently_viewed',
  LAST_MAINTENANCE_RUN: 'last_maintenance_day',
  CACHE_VERSION: 'cache_version_v2',
  UPLOAD_AS_GROUP: 'uploadAsGroup',
  PHOTO_WALL_COLUMNS: 'photo-wall-columns',
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
      memoryCache.delete(key);
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
      memoryCache.clear();
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

  getItem(key: string): string | null {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(`${PREFIX}${key.startsWith(PREFIX) ? key.slice(PREFIX.length) : key}`);
    } catch {
      return (memoryCache.get(key) as string) || null;
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
  }
};

/**
 * Jotai compatible storage using the photox_ prefix
 */
export const jotaiStorage = createJSONStorage<any>(() => ({
  getItem: (key) => storage.getItem(key),
  setItem: (key, value) => storage.setItem(key, value),
  removeItem: (key) => storage.remove(key),
}));
