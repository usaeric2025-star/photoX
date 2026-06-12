import { useMutation, useQueryClient, QueryKey, QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { showToast } from '@/lib/ui/toast';
import { api } from '@/lib/api';
import { hapticFeedback } from '@/lib/ui/haptics';

import { ErrorFactory } from '@/lib/error/ErrorFactory';

/**
 * 樂觀更新 DSL 操作符 (Optimistic Update DSL)
 * 減少重複的數據結構处理逻辑
 */
export const optimistic = {
  /** 单列表操作 (Array) */
  list: {
    remove: <T>(idField: keyof T = 'id' as any) => (old: T[] | undefined, id: any) => {
      return (old || []).filter((item: any) => item[idField] !== id);
    },
    update: <T>(idField: keyof T = 'id' as any) => (old: T[] | undefined, { id, updates }: { id: any; updates: Partial<T> }) => {
      return (old || []).map((item: any) => item[idField] === id ? { ...item, ...updates } : item);
    },
    add: <T>() => (old: T[] | undefined, newItem: T) => {
      return [...(old || []), newItem];
    },
  },
  /** 无限滚动分页结构 (InfiniteData) */
  infinite: {
    remove: <T>(idField: keyof T = 'id' as any) => (old: any, ids: any | any[]) => {
      if (!old || !old.pages) return old;
      const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos?.filter((p: any) => !idSet.has(p[idField])) || page.items?.filter((p: any) => !idSet.has(p[idField])),
        })),
      };
    },
    update: <T>(idField: keyof T = 'id' as any) => (old: any, { id, updates }: { id: any; updates: Partial<T> }) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos?.map((p: any) => p[idField] === id ? { ...p, ...updates } : p) || page.items?.map((p: any) => p[idField] === id ? { ...p, ...updates } : p),
        })),
      };
    },
    add: <T>() => (old: any, item: T) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any, index: number) => 
          index === 0 ? { ...page, photos: [item, ...(page.photos || [])], items: [item, ...(page.items || [])] } : page
        ),
      };
    },
    batchUpdate: <T>(idField: keyof T = 'id' as any) => (old: any, { ids, updates }: { ids: any[]; updates: Partial<T> }) => {
      if (!old || !old.pages) return old;
      const idSet = new Set(ids);
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          photos: page.photos?.map((p: any) => idSet.has(p[idField]) ? { ...p, ...updates } : p) || page.items?.map((p: any) => idSet.has(p[idField]) ? { ...p, ...updates } : p),
        })),
      };
    }
  }
};
