import type { FilterOptions, GroupFilterOptions } from '@/types/api';

/**
 * 稳定化排序对象，确保 Query Key 顺通一致
 */

function sortObject(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const source = obj as Record<string, unknown>;
  return Object.keys(source)
    .sort()
    .reduce((acc: Record<string, unknown>, key: string) => {
      acc[key] = source[key];
      return acc;
    }, {});
}

const photos = {
  all: ['photos'] as const,
  list: (filters: any) => [...photos.all, 'list', sortObject(filters)] as const,
  detail: (photoId: string) => [...photos.all, 'detail', photoId] as const,
  infinite: (filters: any, mode: 'public' | 'admin') => 
    [...photos.all, 'infinite', mode, sortObject(filters)] as const,
  count: (filters: any) => [...photos.all, 'count', sortObject(filters)] as const,
};

const groups = {
  all: ['groups'] as const,
  list: (filters: any) => [...groups.all, 'list', sortObject(filters)] as const,
  detail: (groupId: string, isAdmin: boolean) => 
    [...groups.all, 'detail', groupId, isAdmin] as const,
  photos: (groupId: string) => [...groups.all, 'photos', groupId] as const,
};

const aiAudit = {
  all: ['ai-audit'] as const,
  byPhoto: (photoId: string) => [...aiAudit.all, 'photo', photoId] as const,
};

const categories = {
  all: ['categories'] as const,
  public: () => [...categories.all, 'public'] as const,
  admin: () => [...categories.all, 'admin'] as const,
  categories: () => [...categories.all] as const,
};

const tags = {
  all: ['tags'] as const,
  list: (mode: 'public' | 'admin') => [...tags.all, mode] as const,
  tags: () => [...tags.all] as const,
};

const manufacturers = {
  all: ['manufacturers'] as const,
  list: (mode: 'public' | 'admin') => [...manufacturers.all, mode] as const,
  manufacturers: () => [...manufacturers.all] as const,
};

const settings = {
  all: ['settings'] as const,
  detail: (key: string) => [...settings.all, 'detail', key] as const,
};

const storage = {
  all: ['storage'] as const,
  audit: () => [...storage.all, 'audit'] as const,
};

const diagnostics = {
  all: ['diagnostics'] as const,
  audit: () => [...diagnostics.all, 'audit'] as const,
  report: () => [...diagnostics.all, 'report'] as const,
  r2: () => [...diagnostics.all, 'r2'] as const,
};

export const queryKeys = {
  photos,
  groups,
  aiAudit,
  categories,
  tags,
  manufacturers,
  settings,
  storage,
  diagnostics
} as const;
