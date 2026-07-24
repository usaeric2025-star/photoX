import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { feedback } from '#lib/feedback.js';
import { useTranslation } from '../core/index.js';
import { Category, Tag, Manufacturer } from '#src/types/index.js';

type Domain = 'categories' | 'tags' | 'manufacturers';

/**
 * useMetadataQueries
 * 整合所有元數據（分類、標籤、廠商）的查詢。
 */
export const useCategories = (options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();
  const cachedData = queryClient.getQueryData<Category[]>(queryKeys.categories.all);
  const hasCachedData = cachedData && cachedData.length > 0;

  const { data: categories = [], isLoading } = useAppQuery<Category[]>(
    queryKeys.categories.all,
    async () => {
      const res = await api.categories.$get();
      const data = await ErrorFactory.unwrap<Category[]>(res, 'Fetch categories failed');
      return data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },
    {
      staleTime: hasCachedData ? STALE_TIMES.MEDIUM : 0,
      refetchOnWindowFocus: true,
      ...options
    }
  );
  return { categories, isLoading };
};

export const useTags = (options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();
  const cachedData = queryClient.getQueryData<Tag[]>(queryKeys.tags.all);
  const hasCachedData = cachedData && cachedData.length > 0;

  const { data: tags = [], isLoading } = useAppQuery<Tag[]>(
    queryKeys.tags.all,
    async () => {
      const res = await api.tags.$get();
      return ErrorFactory.unwrap<Tag[]>(res, 'Fetch tags failed');
    },
    {
      staleTime: hasCachedData ? STALE_TIMES.MEDIUM : 0,
      refetchOnWindowFocus: true,
      ...options
    }
  );
  return { tags, isLoading };
};

export const useManufacturers = (options?: { enabled?: boolean }) => {
  const queryClient = useQueryClient();
  const cachedData = queryClient.getQueryData<Manufacturer[]>(queryKeys.manufacturers.all);
  const hasCachedData = cachedData && cachedData.length > 0;

  const { data: manufacturers = [], isLoading } = useAppQuery<Manufacturer[]>(
    queryKeys.manufacturers.all,
    async () => ErrorFactory.unwrap<Manufacturer[]>(api.manufacturers.$get(), 'Fetch manufacturers failed'),
    {
      staleTime: hasCachedData ? STALE_TIMES.MEDIUM : 0,
      refetchOnWindowFocus: true,
      ...options
    }
  );
  return { manufacturers, isLoading };
};

/**
 * useMetadataMutations
 * 整合所有元數據的寫操作。
 */
function useMetadataMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const invalidate = (domain: Domain) => {
    if (domain === 'categories') queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    if (domain === 'tags') queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
    if (domain === 'manufacturers') queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all });
  };

  const createMutation = useAppMutation({
    mutationFn: async ({ domain, data }: { domain: Domain; data: Record<string, unknown> }) => {
      // @ts-ignore - Hono client indexing
      return ErrorFactory.unwrap(api[domain].$post({ json: data }), t('createFailed'));
    },
    onSuccess: (_, variables) => {
      feedback.success(t('createSuccess'));
      invalidate(variables.domain);
    }
  });

  const updateMutation = useAppMutation({
    mutationFn: async ({ domain, id, updates }: { domain: Domain; id: string | number; updates: Record<string, unknown> }) => {
      // @ts-ignore - Hono client indexing
      return ErrorFactory.unwrap(api[domain][':id'].$put({ param: { id: String(id) }, json: { updates } }), t('updateFailed'));
    },
    onSuccess: (_, variables) => {
      feedback.success(t('updateSuccess'));
      invalidate(variables.domain);
    }
  });

  const deleteMutation = useAppMutation({
    mutationFn: async ({ domain, id }: { domain: Domain; id: string | number }) => {
      // @ts-ignore - Hono client indexing
      return ErrorFactory.unwrap(api[domain][':id'].$delete({ param: { id: String(id) } }), t('deleteFailed'));
    },
    onSuccess: (_, variables) => {
      feedback.success(t('deleteSuccess'));
      invalidate(variables.domain);
    }
  });

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}

export function useCategoryMutations() {
  const { create, update, remove, isPending } = useMetadataMutations();
  return {
    create: { mutateAsync: (data: Record<string, unknown>) => create.mutateAsync({ domain: 'categories', data: { categoryData: data } }) },
    edit: { mutateAsync: (args: { id: string | number; updates: Record<string, unknown> }) => update.mutateAsync({ domain: 'categories', ...args }) },
    remove: { mutateAsync: (id: string | number) => remove.mutateAsync({ domain: 'categories', id }) },
    isPending
  };
}

export function useTagMutations() {
  const { create, update, remove, isPending } = useMetadataMutations();
  return {
    create: { mutateAsync: (data: Record<string, unknown>) => create.mutateAsync({ domain: 'tags', data: { tagData: data } }) },
    edit: { mutateAsync: (args: { id: string | number; updates: Record<string, unknown> }) => update.mutateAsync({ domain: 'tags', ...args }) },
    remove: { mutateAsync: (id: string | number) => remove.mutateAsync({ domain: 'tags', id }) },
    isPending
  };
}

export function useManufacturerMutations() {
  const { create, update, remove, isPending } = useMetadataMutations();
  return {
    create: { mutateAsync: (data: Record<string, unknown>) => create.mutateAsync({ domain: 'manufacturers', data: { manufacturerData: data } }) },
    edit: { mutateAsync: (args: { id: string | number; updates: Record<string, unknown> }) => update.mutateAsync({ domain: 'manufacturers', ...args }) },
    remove: { mutateAsync: (id: string | number) => remove.mutateAsync({ domain: 'manufacturers', id }) },
    isPending
  };
}

/**
 * useTagSearch
 * 處理標籤搜尋。
 */
export function useTagSearch(keywordOrTags: string | Tag[]) {
  const [keyword, setKeyword] = useState(typeof keywordOrTags === 'string' ? keywordOrTags : '');
    
  const isServerSearch = typeof keywordOrTags === 'string';
  const searchTerm = isServerSearch ? keyword : '';
    
  const { data: searchResults = [], isLoading } = useAppQuery<Tag[]>(
    queryKeys.tags.search(searchTerm),
    async () => {
      if (!searchTerm.trim()) return [];
      return ErrorFactory.unwrap<Tag[]>(api.tags.search.$get({ query: { keyword: searchTerm } }), 'Search tags failed');
    },
    { enabled: isServerSearch && searchTerm.trim().length > 0 }
  );

  const filteredTags = useMemo(() => {
    if (isServerSearch) return searchResults;
    const allTags = Array.isArray(keywordOrTags) ? keywordOrTags : [];
    if (!keyword.trim()) return allTags;
    const lower = keyword.toLowerCase();
    return allTags.filter(t => t.name.toLowerCase().includes(lower));
  }, [isServerSearch, searchResults, keywordOrTags, keyword]);

  return { 
     keyword, 
     setKeyword, 
     filteredTags, 
     data: filteredTags,
    isLoading 
   };
}

/**
 * useTagSorting
 * 處理標籤排序、置頂與熱度識別。
 */
export function useTagSorting(tags: Tag[], settings?: { pinnedTags?: string[] }) {
  const [sortBy, setSortBy] = useState<'name' | 'count'>('count');
  
  const pinnedIds = useMemo(() => {
    const fromSettings = settings?.pinnedTags || [];
    const fromTags = tags.filter(t => t.isPinned).map(t => String(t.id));
    return Array.from(new Set([...fromSettings, ...fromTags]));
  }, [tags, settings]);

  const hotIds = useMemo(() => {
    const fromTags = tags.filter(t => t.isHot).map(t => String(t.id));
    const sortedByCount = [...tags].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    const topByCount = sortedByCount.slice(0, 5).map(t => String(t.id));
    return new Set([...fromTags, ...topByCount]);
  }, [tags]);

  const tagsToRender = useMemo(() => {
    const pinnedSet = new Set(pinnedIds);
    return [...tags].sort((a, b) => {
      const aPinned = pinnedSet.has(String(a.id));
      const bPinned = pinnedSet.has(String(b.id));
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
            
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
  }, [tags, pinnedIds, sortBy]);

  return { sortBy, setSortBy, sortedTags: tagsToRender, tagsToRender, pinnedIds, hotIds };
}
