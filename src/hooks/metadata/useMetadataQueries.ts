import { useAppQuery } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { Category, Tag, Manufacturer } from '#src/types/index.js';
import { useMemo, useState } from 'react';

/**
 * useCategories
 * 
 * 獲取所有分類。
 */
export const useCategories = (options?: { enabled?: boolean }) => {
  const { data: categories = [], isLoading } = useAppQuery<Category[]>(
    queryKeys.categories.all,
    async () => ErrorFactory.unwrap<Category[]>(api.categories.$get(), 'Fetch categories failed'),
    options
  );
  return { categories, isLoading };
};

/**
 * useTags
 * 
 * 獲取所有標籤。
 */
export const useTags = (options?: { enabled?: boolean }) => {
  const { data: tags = [], isLoading } = useAppQuery<Tag[]>(
    queryKeys.tags.all,
    async () => ErrorFactory.unwrap<Tag[]>(api.tags.$get(), 'Fetch tags failed'),
    options
  );
  return { tags, isLoading };
};

/**
 * useManufacturers
 * 
 * 獲取所有廠商。
 */
export const useManufacturers = (options?: { enabled?: boolean }) => {
  const { data: manufacturers = [], isLoading } = useAppQuery<Manufacturer[]>(
    queryKeys.manufacturers.all,
    async () => ErrorFactory.unwrap<Manufacturer[]>(api.manufacturers.$get(), 'Fetch manufacturers failed'),
    options
  );
  return { manufacturers, isLoading };
};

/**
 * useTagSearch
 * 
 * 處理標籤搜尋。支持客戶端與服務端搜索。
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
 * 
 * 處理標籤排序、置頂與熱度識別。
 */
export function useTagSorting(tags: Tag[], settings?: any) {
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
