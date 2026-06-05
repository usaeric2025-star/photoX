import type { Filters } from '@/types/photo';

export const queryKeys = {
  photos: {
    all: ['photos'] as const,
    lists: () => [...queryKeys.photos.all, 'list'] as const,
    list: (filters: Filters) => [...queryKeys.photos.lists(), filters] as const,
    details: () => [...queryKeys.photos.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.photos.details(), id] as const,
    infinite: () => [...queryKeys.photos.all, 'infinite'] as const,
    count: () => [...queryKeys.photos.all, 'count'] as const,
  },
  groups: {
    all: ['groups'] as const,
    lists: () => [...queryKeys.groups.all, 'list'] as const,
    list: (filters: Filters) => [...queryKeys.groups.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.groups.all, 'detail', id] as const,
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
  },
};

// Backwards compatibility for existing imports
export const photoKeys = queryKeys.photos;
export const groupKeys = queryKeys.groups;
export const tagKeys = queryKeys.tags;
export const categoryKeys = queryKeys.categories;
export const manufacturerKeys = queryKeys.manufacturers;
export const settingsKeys = queryKeys.settings;
