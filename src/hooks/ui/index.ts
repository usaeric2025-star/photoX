/**
 * ============================================================================
 * PHOTOX UI & STATE HOOKS (UI 與 URL 狀態控制器)
 * ============================================================================
 * 
 * 📌 [三大狀態體系之嚴格邊界]
 * 1. URL 狀態 (唯一的視圖真相來源 - nuqs):
 *    - 適用：搜尋、篩選、分頁、多選 IDs (selected)、批量模式開關 (batch)。
 *    - 核心原則：禁止使用 useEffect 將 URL 狀態與本地 State / Store 進行二次同步。
 * 2. UI 瞬態 (跨組件臨時交互 - @preact/signals-react via useUI):
 *    - 適用：全域 Dialog 開關、目前 Lightbox 投影片數據、主題、語系。
 * 📌 [設計原則]
 * - 嚴禁為單一的 URL 狀態或單一彈窗控制編寫獨立的微型 Hook 檔案！
 * ============================================================================
 */

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useQueryState, parseAsArrayOf, parseAsString, parseAsBoolean } from 'nuqs';
import { useUI } from '#lib/store/index.js';
import { 
  searchParser, categoryParser, tagsParser, sortParser, modalParser, 
  parseAsPhotoId, batchParser, selectedIdsParser, showGroupsCollapsedParser, 
  anchorParser, groupIdParser 
} from '#lib/nuqs/parsers.js';

// --- Filters Hook ---

export type ModalType = 'edit' | 'delete' | 'add' | 'upload' | 'batch-edit' | 'settings' | 'ai-batch' | 'group-create' | 'group-detail' | 'group-edit' | 'category-edit' | 'tag-edit' | 'manufacturer-edit' | 'none';

export function useFilters(options?: { enableStatus?: boolean }) {
  const [search, setSearch] = useQueryState('q', searchParser);
  const [category, setCategory] = useQueryState('c', categoryParser);
  const [tags, setTags] = useQueryState('t', tagsParser);
  const [sort, setSort] = useQueryState('s', sortParser);
  const [modal, setModal] = useQueryState('m', modalParser);
  const [photoId, setPhotoId] = useQueryState('id', parseAsPhotoId);
  const [batch, setBatch] = useQueryState('batch', batchParser);
  const [selected, setSelected] = useQueryState('selected', selectedIdsParser);
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useQueryState('gc', showGroupsCollapsedParser);
  const [anchor, setAnchor] = useQueryState('anchor', anchorParser);
  const [groupId, setGroupId] = useQueryState('g', groupIdParser);

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

  const openModal = (type: ModalType, id?: string) => {
    setModal(type);
    if (id) setPhotoId(id);
  };

  const closeModal = () => {
    setModal('none');
    setPhotoId(null);
  };

  return {
    search,
    setSearch,
    category,
    setCategory,
    tags,
    setTags,
    sort,
    setSort,
    modal: modal as ModalType,
    setModal,
    photoId,
    setPhotoId,
    batch,
    setBatch,
    selected,
    setSelected,
    showGroupsCollapsed,
    setShowGroupsCollapsed,
    anchor,
    setAnchor,
    groupId,
    setGroupId,
    updateFilters,
    openModal,
    closeModal,
    filters: { 
      search, 
      category, 
      categoryId: category ? Number(category) : null, 
      tags, 
      tagIds: tags, 
      sort: sort as any
    }
  };
}

export function useFilterState() {
  return useFilters();
}

// --- Lightbox Interactions Hook ---

interface UseLightboxInteractionsProps {
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  minSwipeDistance?: number;
}

export function useLightboxInteractions({
  currentIndex,
  onNext,
  onPrev,
  minSwipeDistance = 50,
}: UseLightboxInteractionsProps) {
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setIsZoomed(false);
    setDragOffset(0);
    setIsSwiping(false);
  }, [currentIndex]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!e.isPrimary || isZoomed) return;
    setPointerStartX(e.clientX);
    setDragOffset(0);
    setIsSwiping(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointerStartX === null) return;
    const diff = e.clientX - pointerStartX;
    setDragOffset(diff);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerStartX === null) return;
    
    const diff = e.clientX - pointerStartX;
    if (diff > minSwipeDistance) {
      onPrev();
    } else if (diff < -minSwipeDistance) {
      onNext();
    }
    
    setPointerStartX(null);
    setDragOffset(0);
    setIsSwiping(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    setPointerStartX(null);
    setDragOffset(0);
    setIsSwiping(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleToggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(!isZoomed);
  };

  return {
    isZoomed,
    isSwiping,
    dragOffset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    handleToggleZoom,
  };
}

// --- Search Transition Hook ---

/**
 * Hook to handle search transitions using React 19 useTransition.
 * Replaces manual debounce for filter updates to provide smoother UI interaction.
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
