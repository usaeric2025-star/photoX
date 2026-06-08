export interface PhotoFilters {
  category_id?: string | null;
  tag_id?: string | null;
  manufacturer_id?: string | null;
  searchQuery?: string | null;
  sortOrder?: string | null;
  groupId?: string | null;
  photoId?: string | null;
  isAdminMode?: boolean;
  onlyUngrouped?: boolean;
  is_hidden?: boolean;
  limit?: number;
  pageSize?: number;
}

const PHOTO_ALL = ['photos'] as const;
const GROUP_ALL = ['groups'] as const;

/**
 * 稳定化排序对象，确保 Query Key 顺通一致
 */
function sortObject(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.keys(obj)
    .sort()
    .reduce((acc: any, key: string) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

export const queryKeys = {
  photos: {
    all: PHOTO_ALL,
    lists: () => [...PHOTO_ALL, 'list'] as const,
    list: (filters?: PhotoFilters) => [...PHOTO_ALL, 'list', sortObject(filters)] as const,
    details: () => [...PHOTO_ALL, 'detail'] as const,
    detail: (id: string) => [...PHOTO_ALL, 'detail', id] as const,
    infinite: (filters?: PhotoFilters, freshness?: string) => [...PHOTO_ALL, 'infinite', sortObject(filters), freshness],
    count: (filters?: PhotoFilters) => [...PHOTO_ALL, 'count', sortObject(filters)],
  },
  groups: {
    all: GROUP_ALL,
    lists: () => [...GROUP_ALL, 'list'] as const,
    list: (filters?: any) => [...GROUP_ALL, 'list', sortObject(filters)] as const,
    detail: (id: string, freshness?: string) => [...GROUP_ALL, 'detail', id, freshness],
  },
  tags: {
    all: ['tags'] as const,
    list: () => [...queryKeys.tags.all, 'list'] as const,
    tags: () => [...queryKeys.tags.all] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
    categories: () => [...queryKeys.categories.all] as const,
  },
  manufacturers: {
    all: ['manufacturers'] as const,
    list: () => [...queryKeys.manufacturers.all, 'list'] as const,
    manufacturers: () => [...queryKeys.manufacturers.all] as const,
  },
  settings: {
    all: ['settings'] as const,
    lists: () => [...queryKeys.settings.all, 'list'] as const,
    list: () => [...queryKeys.settings.lists()] as const,
    detail: (key: string) => [...queryKeys.settings.all, 'detail', key] as const,
  },
  storage: {
    all: ['storage'] as const,
    audit: () => [...queryKeys.storage.all, 'audit'] as const,
  },
};

/**
 * 照片 Query Key 链式构建器
 */
class PhotoKeyBuilder {
  private filters: PhotoFilters = {};

  category(id?: string | null) { this.filters.category_id = id; return this; }
  tag(id?: string | null) { this.filters.tag_id = id; return this; }
  search(q?: string | null) { this.filters.searchQuery = q; return this; }
  sort(s?: string | null) { this.filters.sortOrder = s; return this; }
  admin(b = true) { this.filters.isAdminMode = b; return this; }
  ungrouped(b = true) { this.filters.onlyUngrouped = b; return this; }
  hidden(b?: boolean | null) { this.filters.is_hidden = b === null ? undefined : b; return this; }
  manufacturer(id?: string | null) { this.filters.manufacturer_id = id; return this; }

  infinite() { return queryKeys.photos.infinite(this.filters); }
  count() { return queryKeys.photos.count(this.filters); }
  list() { return queryKeys.photos.list(this.filters); }
}

// Backwards compatibility for existing imports
export const photoKeys = {
  ...queryKeys.photos,
  builder: () => new PhotoKeyBuilder(),
};
export const groupKeys = queryKeys.groups;
export const tagKeys = queryKeys.tags;
export const categoryKeys = queryKeys.categories;
export const manufacturerKeys = queryKeys.manufacturers;
export const settingsKeys = queryKeys.settings;
export const storageKeys = queryKeys.storage;
