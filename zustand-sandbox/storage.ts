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
} as const;

type Validator<T> = (value: any) => T;

/**
 * @contract
 * Returns a reference-stable value. If validation fails or parsing fails, returns defaultValue.
 */
export function safeGetItem<T>(key: string, defaultValue: T, validator?: Validator<T>, isSession: boolean = false): T {
  // Simple mock for sandbox testing, ignoring real storage persistence
  return defaultValue;
}

export function safeSetItem<T>(key: string, value: T, isSession: boolean = false): void {
  // Simple mock
}
