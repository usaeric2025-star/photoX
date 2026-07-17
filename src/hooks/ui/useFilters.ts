import { useQueryState } from 'nuqs';
import { 
  searchParser, categoryParser, tagsParser, sortParser, 
  batchParser, selectedIdsParser, showGroupsCollapsedParser, 
  anchorParser, groupIdParser 
} from '#lib/nuqs/parsers.js';
import { useCallback, useTransition } from 'react';
import { useModalActions } from './useModalActions.js';

export type ModalType = 'edit' | 'delete' | 'add' | 'upload' | 'batch-edit' | 'settings' | 'ai-batch' | 'group-create' | 'group-detail' | 'group-edit' | 'category-edit' | 'tag-edit' | 'manufacturer-edit' | 'none';

/**
 * useFilters
 * 
 * 處理所有與 URL 狀態相關的篩選、分頁、彈窗控制。
 */
export function useFilters() {
  const [search, setSearch] = useQueryState('q', searchParser);
  const [category, setCategory] = useQueryState('c', categoryParser);
  const [tags, setTags] = useQueryState('t', tagsParser);
  const [sort, setSort] = useQueryState('s', sortParser);
  const [batch, setBatch] = useQueryState('batch', batchParser);
  const [selected, setSelected] = useQueryState('selected', selectedIdsParser);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useQueryState('gc', showGroupsCollapsedParser);
  const [anchor, setAnchor] = useQueryState('anchor', anchorParser);
  const [groupId, setGroupId] = useQueryState('g', groupIdParser);

  const { modal, photoId, setPhotoId, openModal, closeModal, setModal } = useModalActions() as any;

  const updateFilters = (updates: {
    search?: string;
    category?: string;
    categoryId?: string;
    tags?: string[];
    tagIds?: string[];
    sort?: string;
  }) => {
    if (updates.search !== undefined) setSearch(updates.search || null);
    if (updates.category !== undefined) setCategory(updates.category || null);
    if (updates.categoryId !== undefined) setCategory(updates.categoryId || null);
    if (updates.tags !== undefined) setTags(updates.tags?.length ? updates.tags : null);
    if (updates.tagIds !== undefined) setTags(updates.tagIds?.length ? updates.tagIds : null);
    if (updates.sort !== undefined) setSort((updates.sort || null) as any);
  };

  return {
    search, setSearch,
    category, setCategory,
    tags, setTags,
    sort, setSort,
    modal, setModal,
    photoId, setPhotoId,
    batch, setBatch,
    selected, setSelected,
    showGroupsCollapsed, setShowGroupsCollapsed,
    anchor, setAnchor,
    groupId, setGroupId,
    updateFilters,
    openModal,
    closeModal,
    filters: { 
      search, category, 
      categoryId: category ? Number(category) : null, 
      tags, tagIds: tags, 
      sort: sort as any
    }
  };
}

/**
 * useSearchTransition
 * 使用 React Transitions 處理搜尋輸入，優化 UI 響應。
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
