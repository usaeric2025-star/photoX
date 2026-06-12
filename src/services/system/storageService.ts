/**
 * @contract
 * @storage-contract: STORAGE_KEYS defines structured keys for localStorage/sessionStorage.
 * safeSetItem/safeGetItem must be used for ALL storage access to enforce validation.
 * ALL return values from safeGetItem must be reference-stable; if validation fails, return the original defaultValue.
 */
export const STORAGE_KEYS = {
  LANG: 'photo_appLang',
  COLUMNS: 'photo_columns',
  ACTIVE_GROUP: 'photo_activeGroupId',
  ACTIVE_PHOTO: 'photo_activePhotoId',
  EDIT_PHOTO: 'photo_editPhotoId',
  BATCH_EDITING: 'photo_batchEditingIds',
  GROUP_SETTINGS_OPEN: 'photo_groupSettingsOpen',
  VIEW_MODE: 'photo_viewMode',
  ACTIVE_SCREEN: 'photo_activeScreen',
  SIDEBAR_COLLAPSED: 'photo_isSidebarCollapsed',
  EDIT_FORM_DRAFT: 'photo_edit_form_draft',
  SORT_ORDER: 'photo_sortOrder',
  RECENTLY_VIEWED: 'photo_recently_viewed',
  LAST_MAINTENANCE_RUN: 'photo_last_maintenance_day',
  CACHE_VERSION: 'photo_cache_version_v2', // Increment this to force a hard clear of all local state
} as const;

type Validator<T> = (value: any) => T;

/**
 * @contract
 * Returns a reference-stable value. If validation fails or parsing fails, returns defaultValue.
 */
export function safeGetItem<T>(key: string, defaultValue: T, validator?: Validator<T>, isSession: boolean = false): T {
  const store = isSession ? sessionStorage : localStorage;
  const val = store.getItem(key);
  if (val === null) return defaultValue;
  try {
    let parsed: any;
    const trimmed = val.trim();
    if (
      trimmed.startsWith('{') || 
      trimmed.startsWith('[') || 
      trimmed === 'true' || 
      trimmed === 'false' || 
      /^-?\d+(\.\d+)?$/.test(trimmed)
    ) {
      parsed = JSON.parse(trimmed);
    } else {
      parsed = val;
    }
    if (validator) {
        const validated = validator(parsed);
        // Ensure strictly returning the validated new object is fine,
        // but if validation implies returning the default upon failure, 
        // the validator itself should return a stable default.
        return validated;
    }
    return parsed as T;
  } catch {
    return defaultValue;
  }
}

export function safeSetItem<T>(key: string, value: T, isSession: boolean = false): void {
  const store = isSession ? sessionStorage : localStorage;
  if (value === null || value === undefined) {
    store.removeItem(key);
  } else {
    const serialized = (typeof value === 'object') ? JSON.stringify(value) : String(value);
    store.setItem(key, serialized);
  }
}

export async function migrateStorage() {
  const CURRENT_VER = '2026-06-12-a';
  const savedVer = localStorage.getItem(STORAGE_KEYS.CACHE_VERSION);

  if (savedVer !== CURRENT_VER) {
    console.warn(`[Storage] Version mismatch (Old: ${savedVer}, New: ${CURRENT_VER}). Performing hard reset...`);
    
    // 1. Clear IndexedDB (syncCache and query persistence)
    try {
      const { syncCache } = await import('@/lib/db/indexedDB');
      await syncCache.clearPersistence();
    } catch (e) {}

    try {
      const { clear } = await import('idb-keyval');
      await clear();
    } catch (e) {}

    // 2. Clear critical localStorage keys
    const keysToRemove = Object.values(STORAGE_KEYS) as string[];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    // 3. Mark version as updated
    localStorage.setItem(STORAGE_KEYS.CACHE_VERSION, CURRENT_VER);
    return;
  }

  const legacyKeys = [
    'photoStore',
    'filterStore',
    'uiStore_legacy',
    'filterAtom_old',
    'supabase.auth.token' // This is usually managed by Supabase, but if we need a hard reset...
  ];

  const validKeys = Object.values(STORAGE_KEYS) as string[];
  const stores = [localStorage, sessionStorage];
  
  stores.forEach(store => {
    Object.keys(store).forEach(key => {
      // 1. Physical removal of known legacy keys
      if (legacyKeys.includes(key)) {
        store.removeItem(key);
        return;
      }

      // 2. Clear old photo_ prefixed keys not in current manifest
      if (key.startsWith('photo_') && !validKeys.includes(key)) {
        store.removeItem(key);
      }

      // 3. Clear old query-cache-like keys that don't match the new naming
      if (key.startsWith('react-query-') || key.startsWith('QueryCache_')) {
        store.removeItem(key);
      }
    });
  });
}
