import { useAppQuery } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { Category, Tag, Manufacturer } from '#src/types/index.js';
import { useMemo, useState } from 'react';

function useMetadataQueries(options?: { enabled?: boolean }) {
  const { data: categories = [], isLoading: isCategoriesLoading } = useAppQuery(
    queryKeys.categories.all,
    async () => ErrorFactory.unwrap<Category[]>(api.categories.$get(), 'Fetch categories failed'),
    { enabled: options?.enabled }
  );

  const { data: tags = [], isLoading: isTagsLoading } = useAppQuery(
    queryKeys.tags.all,
    async () => ErrorFactory.unwrap<Tag[]>(api.tags.$get(), 'Fetch tags failed'),
    { enabled: options?.enabled }
  );

  const { data: manufacturers = [], isLoading: isManufacturersLoading } = useAppQuery(
    queryKeys.manufacturers.all,
    async () => ErrorFactory.unwrap<Manufacturer[]>(api.manufacturers.$get(), 'Fetch manufacturers failed'),
    { enabled: options?.enabled }
  );

  return {
    categories,
    tags,
    manufacturers,
    isLoading: isCategoriesLoading || isTagsLoading || isManufacturersLoading,
    isCategoriesLoading,
    isTagsLoading,
    isManufacturersLoading,
  };
}

export const useCategories = (options?: { enabled?: boolean }) => {
  const { categories, isCategoriesLoading } = useMetadataQueries(options);
  return { categories, isLoading: isCategoriesLoading };
};

export const useTags = (options?: { enabled?: boolean }) => {
  const { tags, isTagsLoading } = useMetadataQueries(options);
  return { tags, isLoading: isTagsLoading };
};

export const useManufacturers = (options?: { enabled?: boolean }) => {
  const { manufacturers, isManufacturersLoading } = useMetadataQueries(options);
  return { manufacturers, isLoading: isManufacturersLoading };
};

/**
 * useTagSearch
 * 
 * 處理標籤搜尋。支持客戶端與服務端搜索。
 */
export function useTagSearch(keywordOrTags: string | Tag[]) {
  const [keyword, setKeyword] = useState(typeof keywordOrTags === 'string' ? keywordOrTags : '');
  
  // 如果傳入的是字符串，執行服務端搜索
  const isServerSearch = typeof keywordOrTags === 'string';
  const searchTerm = isServerSearch ? (keywordOrTags as string) : keyword;

  const { data: searchResults = [], isLoading } = useAppQuery(
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
    if (!searchTerm.trim()) return allTags;
    const lower = searchTerm.toLowerCase();
    return allTags.filter(t => t.name.toLowerCase().includes(lower));
  }, [isServerSearch, searchResults, keywordOrTags, searchTerm]);

  return { 
    keyword: searchTerm, 
    setKeyword, 
    filteredTags, 
    data: filteredTags, // 兼容某些組件
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
    // 使用次數前 5 的標籤，或標記為 isHot 的標籤
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
