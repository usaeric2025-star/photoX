import { useQueryState } from 'nuqs';
import { QUERY_PARAMS } from '#lib/nuqs/constants.js';
import { 
  searchParser, categoryParser, tagsParser, sortParser, 
  batchParser, selectedIdsParser, showGroupsCollapsedParser, 
  anchorParser, groupIdParser, modalParser, parseAsPhotoId 
} from '#lib/nuqs/parsers.js';
import { useCallback, useTransition, useState, useEffect, useRef } from 'react';
import { PLACEHOLDERS, GESTURE_CONFIG } from '#src/constants/config.js';

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

interface UseLightboxInteractionsProps {
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose?: () => void;
  minSwipeDistance?: number;
}

/**
 * useLightboxInteractions
 * 處理燈箱手勢、縮放與滑動邏輯。
 */
export function useLightboxInteractions({
  currentIndex,
  onNext,
  onPrev,
  onClose,
  minSwipeDistance = GESTURE_CONFIG.SWIPE_THRESHOLD,
}: UseLightboxInteractionsProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'horizontal' | 'vertical' | null>(null);
  
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastDistance = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const startPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  useEffect(() => {
    resetZoom();
  }, [currentIndex]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setSwipeDirection(null);
    setIsSwiping(false);
    isDragging.current = false;
    pointers.current.clear();
    lastDistance.current = null;
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    if (e.isPrimary && pointers.current.size === 1) {
      const now = Date.now();
      const timeDiff = now - lastTapRef.current;
      if (timeDiff > 50 && timeDiff < GESTURE_CONFIG.DOUBLE_TAP_DELAY) {
        e.preventDefault();
        if (scale > 1) resetZoom();
        else {
          const rect = target.getBoundingClientRect();
          const offsetX = e.clientX - (rect.left + rect.width / 2);
          const offsetY = e.clientY - (rect.top + rect.height / 2);
          setScale(GESTURE_CONFIG.DOUBLE_TAP_SCALE);
          setPosition({
            x: -offsetX * (GESTURE_CONFIG.DOUBLE_TAP_SCALE - 1),
            y: -offsetY * (GESTURE_CONFIG.DOUBLE_TAP_SCALE - 1)
          });
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
    }

    if (pointers.current.size === 1) {
      startPos.current = { x: e.clientX, y: e.clientY };
      initialPos.current = { ...position };
      isDragging.current = true;
      if (scale === 1) setIsSwiping(true);
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      lastDistance.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setIsSwiping(false);
      setSwipeDirection(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastDistance.current !== null) {
        const delta = distance / lastDistance.current;
        setScale(prev => {
          const next = prev * delta;
          return Math.min(GESTURE_CONFIG.MAX_SCALE, Math.max(GESTURE_CONFIG.MIN_SCALE, next));
        });
      }
      lastDistance.current = distance;
      return;
    }

    if (pointers.current.size === 1 && isDragging.current) {
      const diffX = e.clientX - startPos.current.x;
      const diffY = e.clientY - startPos.current.y;

      if (scale > 1) {
        const newX = initialPos.current.x + diffX;
        const newY = initialPos.current.y + diffY;
        const limitX = (scale - 1) * window.innerWidth / 2;
        const limitY = (scale - 1) * window.innerHeight / 2;
        setPosition({
          x: Math.min(limitX, Math.max(-limitX, newX)),
          y: Math.min(limitY, Math.max(-limitY, newY))
        });
        return;
      }

      let currentDirection = swipeDirection;
      if (!currentDirection) {
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);
        if (absX > 10 || absY > 10) {
          currentDirection = absX > absY ? 'horizontal' : 'vertical';
          setSwipeDirection(currentDirection);
        }
      }

      if (currentDirection === 'horizontal') setPosition({ x: diffX, y: 0 });
      else if (currentDirection === 'vertical') setPosition({ x: 0, y: diffY });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastDistance.current = null;

    if (pointers.current.size === 0) {
      isDragging.current = false;
      if (scale === 1) {
        if (swipeDirection === 'horizontal') {
          if (position.x > minSwipeDistance) onPrev();
          else if (position.x < -minSwipeDistance) onNext();
        } else if (swipeDirection === 'vertical') {
          if (Math.abs(position.y) > GESTURE_CONFIG.CLOSE_THRESHOLD && onClose) onClose();
        }
        setPosition({ x: 0, y: 0 });
        setSwipeDirection(null);
        setIsSwiping(false);
      }
    }
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    pointers.current.clear();
    lastDistance.current = null;
    isDragging.current = false;
    if (scale === 1) {
      setPosition({ x: 0, y: 0 });
      setSwipeDirection(null);
      setIsSwiping(false);
    }
  };

  return {
    scale,
    position,
    isZoomed: scale > 1,
    isSwiping,
    swipeDirection,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    handleToggleZoom: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (scale > 1) resetZoom();
      else setScale(GESTURE_CONFIG.DOUBLE_TAP_SCALE);
    },
    resetZoom
  };
}
