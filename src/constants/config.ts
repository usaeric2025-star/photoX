
export const ADMIN_ROUTES = {
  HOME: '/admin',
  BATCH: '/admin/batch',
  BATCH_EDIT: '/admin/batch-edit',
  DIAGNOSTICS: '/admin/diagnostics',
  TASKS: '/admin/tasks',
  ERROR_LOGS: '/admin/error-logs',
  SETTINGS: '/admin/settings',
  GROUP_DETAIL_BASE: '/admin/group',
  GROUP_DETAIL: '/admin/group/:id',
} as const;

export const APP_CONFIG = {
  NAME: 'PhotoX',
} as const;

export const PAGINATION = {
  PUBLIC_PAGE_SIZE: 120,
  ADMIN_BATCH_SIZE: 120,
  BATCH_SIZE: 20,
  CHUNK_SIZE: 100,
  SYNC_PAGE_SIZE: 1000,
  VIRTUAL_SCROLL_OVERSCAN: 800,
  DEFAULT_LIMIT: 100,
} as const;

export const PHOTO_QUERY_CONFIG = {
  limit: PAGINATION.DEFAULT_LIMIT,
  sortBy: 'created_at',
  sortOrder: 'desc',
  secondarySort: 'id',
} as const;

export const EMPTY_ARRAY: never[] = [];

export const DB_CONFIG = {
  TABLE_NAME: 'furniture_items',
  BUCKET_NAME: 'furniture_images',
} as const;

export const CACHE_CONFIG = {
  STALE_TIME_5M: 1000 * 60 * 5,
  GC_TIME_30M: 1000 * 60 * 30,
} as const;

export const AI_CONFIG = {
  CONCURRENCY: 3,
  TIMEOUT: 45000,
  RETRIES: 2,
} as const;

export const ANIMATION_CONFIG = {
  LITE_SLEEK_DEFAULT: 250,
  STAGGER_DELAY: 50,
  LONG_DELAY: 800,
} as const;

export const PLACEHOLDERS = {
  EMPTY_VAL: '---',
  UNKNOWN: 'unknown',
  NONE: 'none',
} as const;

export const REGEX = {
  GENERIC_PHOTO_NAME: /^(IMG_|DSC_|P_)\d+/i,
  IMAGE_EXTENSIONS: /\.(jpg|jpeg|png|webp|gif|bmp)$/i,
  MD_JSON_CODE_BLOCK: /```json\n?|```\n?/g,
} as const;

export const GESTURE_CONFIG = {
  SWIPE_THRESHOLD: 50,
  CLOSE_THRESHOLD: 100,
  SCALE_DIVISOR: 800,
  OPACITY_DIVISOR: 300,
  MAX_SCALE: 4,
  MIN_SCALE: 1,
  DOUBLE_TAP_SCALE: 2.5,
  DOUBLE_TAP_DELAY: 300,
} as const;
