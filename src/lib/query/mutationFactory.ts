import { showToast } from '@/lib/ui/toast';
import { api } from '@/lib/api';
import { hapticFeedback } from '@/lib/ui/haptics';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useAppMutation } from './index';

/**
 * Standard Mutation Factory
 */
export function createMutation<TVariables, TData>(config: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}) {
  return function useStandardMutation() {
    return useAppMutation(config);
  };
}

/**
 * 樂觀更新 DSL 操作符 (Optimistic Update DSL)
 */
export const optimistic = {
  list: {
    remove: <T extends Record<string, unknown>>(idField: keyof T = 'id' as keyof T) => (old: T[] | undefined, id: T[keyof T]) => {
      return (old || []).filter((item: T) => item[idField] !== id);
    },
    update: <T extends Record<string, unknown>>(idField: keyof T = 'id' as keyof T) => (old: T[] | undefined, { id, updates }: { id: T[keyof T]; updates: Partial<T> }) => {
      return (old || []).map((item: T) => item[idField] === id ? { ...item, ...updates } : item);
    },
    add: <T>() => (old: T[] | undefined, newItem: T) => {
      return [...(old || []), newItem];
    },
  },
  infinite: {
    remove: <T extends Record<string, unknown>>(idField: keyof T = 'id' as keyof T) => (old: { pages: { photos?: T[], items?: T[] }[] } | undefined, ids: T[keyof T] | T[keyof T][]) => {
      if (!old || !old.pages) return old;
      const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          photos: page.photos?.filter((p) => !idSet.has(p[idField] as T[keyof T])) || page.items?.filter((p) => !idSet.has(p[idField] as T[keyof T])),
        })),
      };
    },
    update: <T extends Record<string, unknown>>(idField: keyof T = 'id' as keyof T) => (old: { pages: { photos?: T[], items?: T[] }[] } | undefined, { id, updates }: { id: T[keyof T]; updates: Partial<T> }) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          photos: page.photos?.map((p) => p[idField] === id ? { ...p, ...updates } : p) || page.items?.map((p) => p[idField] === id ? { ...p, ...updates } : p),
        })),
      };
    },
    add: <T extends Record<string, unknown>>() => (old: { pages: { photos?: T[], items?: T[] }[] } | undefined, item: T) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page, index: number) => 
          index === 0 ? { ...page, photos: [item, ...(page.photos || [])], items: [item, ...(page.items || [])] } : page
        ),
      };
    },
    batchUpdate: <T extends Record<string, unknown>>(idField: keyof T = 'id' as keyof T) => (old: { pages: { photos?: T[], items?: T[] }[] } | undefined, { ids, updates }: { ids: T[keyof T][]; updates: Partial<T> }) => {
      if (!old || !old.pages) return old;
      const idSet = new Set(ids);
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          photos: page.photos?.map((p) => idSet.has(p[idField] as T[keyof T]) ? { ...p, ...updates } : p) || page.items?.map((p) => idSet.has(p[idField] as T[keyof T]) ? { ...p, ...updates } : p),
        })),
      };
    }
  }
};
