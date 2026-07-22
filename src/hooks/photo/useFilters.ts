import { useQueryState } from '#lib/nuqs/index.js';
import { QUERY_PARAMS } from '#lib/nuqs/constants.js';
import { 
  searchParser, categoryParser, categoriesParser, tagsParser, sortParser, 
  groupIdParser, groupsParser, batchParser, selectedIdsParser, showGroupsCollapsedParser, anchorParser
} from '#lib/nuqs/parsers.js';
import { useCallback, useMemo, useTransition } from 'react';
import { useModalActions } from '../ui/useUI.js';

/**
 * useFilters
 * Manages photo gallery filtering state synced with URL (nuqs)
 */
export function useFilters() {
  const [search, setSearch] = useQueryState(QUERY_PARAMS.SEARCH, searchParser);
  const [category, setCategory] = useQueryState(QUERY_PARAMS.CATEGORY, categoryParser);
  const [categories, setCategories] = useQueryState(QUERY_PARAMS.CATEGORIES, categoriesParser);
  const [tags, setTags] = useQueryState(QUERY_PARAMS.TAGS, tagsParser);
  const [sort, setSort] = useQueryState(QUERY_PARAMS.SORT, sortParser);
  const [batch, setBatch] = useQueryState(QUERY_PARAMS.BATCH, batchParser);
  const [selected, setSelected] = useQueryState(QUERY_PARAMS.SELECTED, selectedIdsParser);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useQueryState(QUERY_PARAMS.COLLAPSED, showGroupsCollapsedParser);
  const [anchor, setAnchor] = useQueryState(QUERY_PARAMS.ANCHOR, anchorParser);
  const [groupId, setGroupId] = useQueryState(QUERY_PARAMS.GROUP_ID, groupIdParser);
  const [groups, setGroups] = useQueryState(QUERY_PARAMS.GROUPS, groupsParser);

  const { modal, photoId, setPhotoId, openModal, closeModal, setModal } = useModalActions();

  const updateFilters = useCallback((updates: {
    search?: string;
    category?: string;
    categories?: string[];
    categoryId?: string;
    tags?: string[];
    tagIds?: string[];
    sort?: string;
    groupId?: string;
    groups?: string[];
  }) => {
    // 輔助函式：清理數組，確保只有非空字符串且不重複
    const cleanArray = (arr: string[] | undefined) => {
      if (!arr) return null;
      const filtered = arr.filter(v => typeof v === 'string' && v.trim() !== '');
      return filtered.length ? Array.from(new Set(filtered)) : null;
    };

    if (updates.search !== undefined) setSearch(updates.search?.trim() || null);
    if (updates.category !== undefined) setCategory(updates.category || null);
    if (updates.categoryId !== undefined) setCategory(updates.categoryId || null);
    
    if (updates.categories !== undefined) setCategories(cleanArray(updates.categories));
    
    if (updates.tags !== undefined) setTags(cleanArray(updates.tags));
    if (updates.tagIds !== undefined) setTags(cleanArray(updates.tagIds));
    
    if (updates.sort !== undefined) setSort((updates.sort || null) as any);
    if (updates.groupId !== undefined) setGroupId(updates.groupId || null);
    
    if (updates.groups !== undefined) setGroups(cleanArray(updates.groups));
  }, [setSearch, setCategory, setCategories, setTags, setSort, setGroupId, setGroups]);

  const filters = useMemo(() => ({ 
    search, 
    category,
    categories,
    categoryId: category ? Number(category) : null, 
    tags, tagIds: tags || [], 
    sort: sort as any,
    groupId,
    groups
  }), [search, category, categories, tags, sort, groupId, groups]);

  return {
    search, setSearch,
    category, setCategory,
    categories, setCategories,
    tags, setTags,
    sort, setSort,
    modal, setModal,
    photoId, setPhotoId,
    batch, setBatch,
    selected, setSelected,
    showGroupsCollapsed, setShowGroupsCollapsed,
    anchor, setAnchor,
    groupId, setGroupId,
    groups, setGroups,
    updateFilters,
    openModal,
    closeModal,
    filters
  };
}

/**
 * useSearchTransition
 * Optimizes UI response for search input using React Transitions.
 */
export const useSearchTransition = (onUpdate: (value: string) => void) => {
  const [isPending, startTransition] = useTransition();
  const updateSearch = useCallback((searchTerm: string) => {
    startTransition(() => {
      onUpdate(searchTerm);
    });
  }, [onUpdate]);

  return { isPending, updateSearch };
};
