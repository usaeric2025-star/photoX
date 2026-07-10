
const PAGINATION = {
  PUBLIC_PAGE_SIZE: 120,
  ADMIN_BATCH_SIZE: 120,
  BATCH_SIZE: 20,
  CHUNK_SIZE: 100,
  SYNC_PAGE_SIZE: 1000,
  VIRTUAL_SCROLL_OVERSCAN: 800,
  DEFAULT_LIMIT: 100,
};

const PHOTO_QUERY_CONFIG = {
  limit: PAGINATION.DEFAULT_LIMIT,
  sortBy: 'created_at',
  sortOrder: 'desc',
  secondarySort: 'id',
} as const;

const EMPTY_ARRAY: never[] = [];

export const DB_CONFIG = {
  TABLE_NAME: 'furniture_items',
  BUCKET_NAME: 'furniture_images',
};


const CACHE_CONFIG = {
  STALE_TIME_5M: 1000 * 60 * 5,
  GC_TIME_30M: 1000 * 60 * 30,
};

const AI_CONFIG = {
  CONCURRENCY: 3,
  TIMEOUT: 45000,
  RETRIES: 2,
};
