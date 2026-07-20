import { useQueryState } from 'nuqs';
import { QUERY_PARAMS } from '#lib/nuqs/constants.js';
import { 
  searchParser, categoryParser, tagsParser, sortParser, 
  batchParser, selectedIdsParser, showGroupsCollapsedParser, 
  anchorParser, groupIdParser, modalParser, parseAsPhotoId 
} from '#lib/nuqs/parsers.js';
import { useCallback, useTransition, useState, useEffect, useRef, useMemo } from 'react';
import { PLACEHOLDERS, GESTURE_CONFIG } from '#src/constants/config.js';
import { hapticFeedback } from '#lib/ui/haptics.js';

type ModalType = 'edit' | 'delete' | 'add' | 'upload' | 'batch-edit' | 'settings' | 'ai-batch' | 'group-create' | 'group-detail' | 'group-edit' | 'category-edit' | 'tag-edit' | 'manufacturer-edit' | 'none';

/**
 * useModalActions
 * 專門處理彈窗控制邏輯。
 */
function useModalActions() {
  const [modal, setModal] = useQueryState(QUERY_PARAMS.MODAL, modalParser);
  const [photoId, setPhotoId] = useQueryState(QUERY_PARAMS.PHOTO_ID, parseAsPhotoId);

  const openModal = (type: ModalType, id?: string) => {
    setModal(type);
    if (id) setPhotoId(id);
  };

  const closeModal = () => {
    setModal(PLACEHOLDERS.NONE as ModalType);
    setPhotoId(null);
  };

  return { modal: modal as ModalType, setModal, photoId, setPhotoId, openModal, closeModal };
}

/**
 * useFilters
 * 處理所有與 URL 狀態相關的篩選、分頁、彈窗控制。
 */
export function useFilters() {
  const [search, setSearch] = useQueryState(QUERY_PARAMS.SEARCH, searchParser);
  const [category, setCategory] = useQueryState(QUERY_PARAMS.CATEGORY, categoryParser);
  const [tags, setTags] = useQueryState(QUERY_PARAMS.TAGS, tagsParser);
  const [sort, setSort] = useQueryState(QUERY_PARAMS.SORT, sortParser);
  const [batch, setBatch] = useQueryState(QUERY_PARAMS.BATCH, batchParser);
  const [selected, setSelected] = useQueryState(QUERY_PARAMS.SELECTED, selectedIdsParser);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useQueryState(QUERY_PARAMS.COLLAPSED, showGroupsCollapsedParser);
  const [anchor, setAnchor] = useQueryState(QUERY_PARAMS.ANCHOR, anchorParser);
  const [groupId, setGroupId] = useQueryState(QUERY_PARAMS.GROUP_ID, groupIdParser);

  const { modal, photoId, setPhotoId, openModal, closeModal, setModal } = useModalActions();

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

  const filters = useMemo(() => ({ 
    search, category, 
    categoryId: category ? Number(category) : null, 
    tags, tagIds: tags || [], 
    sort: sort as any
  }), [search, category, tags, sort]);

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
    filters
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


