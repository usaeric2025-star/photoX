import { queryKeys as newQueryKeys } from './query/keys';
import { PhotoKeyBuilder } from './query/PhotoKeyBuilder';

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

export const queryKeys = newQueryKeys;

export const photoKeys = {
  ...newQueryKeys.photos,
  builder: () => new PhotoKeyBuilder(),
};

export const groupKeys = newQueryKeys.groups;
export const tagKeys = newQueryKeys.tags;
export const categoryKeys = newQueryKeys.categories;
export const manufacturerKeys = newQueryKeys.manufacturers;
export const settingsKeys = newQueryKeys.settings;
export const storageKeys = newQueryKeys.storage;

/**
 * @deprecated Use imports from '@/lib/query/keys' instead.
 */
export const _legacy_queryKeys = queryKeys;
