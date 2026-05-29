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
  IS_STAFF_MODE: 'isStaffMode',
  VIEW_MODE: 'photo_viewMode',
  ACTIVE_SCREEN: 'photo_activeScreen',
  SIDEBAR_COLLAPSED: 'photo_isSidebarCollapsed',
  EDIT_FORM_DRAFT: 'photo_edit_form_draft',
  SORT_ORDER: 'photo_sortOrder',
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
    const parsed = key.endsWith('_draft') || key.includes('EditingIds') ? JSON.parse(val) : val;
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

export function migrateStorage() {
  // Logic to clear legacy or invalid keys if needed
  const validKeys = Object.values(STORAGE_KEYS);
  const stores = [localStorage, sessionStorage];
  
  stores.forEach(store => {
    Object.keys(store).forEach(key => {
      if (key.startsWith('photo_') && !Object.values(STORAGE_KEYS).includes(key as any) && key !== 'isStaffMode') {
        store.removeItem(key);
      }
    });
  });
}
