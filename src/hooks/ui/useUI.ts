import { useQueryState } from 'nuqs';
import { QUERY_PARAMS } from '#lib/nuqs/constants.js';
import { 
  searchParser, categoryParser, tagsParser, sortParser, 
  batchParser, selectedIdsParser, showGroupsCollapsedParser, 
  anchorParser, groupIdParser, modalParser, parseAsPhotoId 
} from '#lib/nuqs/parsers.js';
import { useCallback, useTransition, useState, useEffect, useRef } from 'react';
import { useSetAtom } from 'jotai';
import { isLightboxZoomedAtom } from '#src/store/index.js';
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
  totalPhotos?: number;
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
  totalPhotos,
  onNext,
  onPrev,
  onClose,
  minSwipeDistance = GESTURE_CONFIG.SWIPE_THRESHOLD,
}: UseLightboxInteractionsProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'horizontal' | 'vertical' | null>(null);
  
  const setIsZoomed = useSetAtom(isLightboxZoomedAtom);

  useEffect(() => {
    setIsZoomed(scale > 1);
    return () => {
      setIsZoomed(false);
    };
  }, [scale, setIsZoomed]);
  
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastDistance = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const startPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const hasMovedRef = useRef(false);

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
    hasMovedRef.current = false;
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    hasMovedRef.current = false;
    
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
      hasMovedRef.current = true;
      const pts = Array.from(pointers.current.values());
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastDistance.current !== null && lastDistance.current > 5 && distance > 5) {
        const delta = distance / lastDistance.current;
        if (!isNaN(delta) && isFinite(delta) && delta > 0) {
          // Limit the scale multiplier speed per move event to prevent explosive zoom rate
          const clampedDelta = Math.max(0.7, Math.min(1.4, delta));
          setScale(prev => {
            const safePrev = (isNaN(prev) || !isFinite(prev)) ? 1 : prev;
            const target = safePrev * clampedDelta;
            if (isNaN(target) || !isFinite(target)) return safePrev;
            // Apply a gentle low-pass filter / damping to prevent sudden micro-jitters
            const next = safePrev + (target - safePrev) * 0.4;
            return Math.min(GESTURE_CONFIG.MAX_SCALE, Math.max(GESTURE_CONFIG.MIN_SCALE, next));
          });
        }
      }
      lastDistance.current = distance;
      return;
    }

    if (pointers.current.size === 1 && isDragging.current) {
      const diffX = e.clientX - startPos.current.x;
      const diffY = e.clientY - startPos.current.y;

      if (Math.hypot(diffX, diffY) > 5) {
        hasMovedRef.current = true;
      }

      if (scale > 1) {
        const newX = initialPos.current.x + diffX;
        const newY = initialPos.current.y + diffY;
        const safeScale = (isNaN(scale) || !isFinite(scale)) ? 1 : scale;
        const limitX = (safeScale - 1) * window.innerWidth / 2;
        const limitY = (safeScale - 1) * window.innerHeight / 2;
        
        const finalX = Math.min(limitX, Math.max(-limitX, newX));
        const finalY = Math.min(limitY, Math.max(-limitY, newY));

        setPosition({
          x: isNaN(finalX) ? 0 : finalX,
          y: isNaN(finalY) ? 0 : finalY
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

      if (currentDirection === 'horizontal') {
        const hasPrev = currentIndex > 0;
        const hasNext = totalPhotos !== undefined ? currentIndex < totalPhotos - 1 : true;
        let x = diffX;
        if ((diffX > 0 && !hasPrev) || (diffX < 0 && !hasNext)) {
          // Applying rubber-band dampening: y = sign(x) * |x|^0.75 * 1.5
          x = Math.sign(diffX) * Math.pow(Math.abs(diffX), 0.75) * 1.5;
        }
        setPosition({ x, y: 0 });
      }
      else if (currentDirection === 'vertical') setPosition({ x: 0, y: diffY });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastDistance.current = null;

    if (pointers.current.size === 1) {
      // One finger left! Reset startPos and initialPos to prevent jump/jitter
      const remainingPointer = Array.from(pointers.current.values())[0];
      if (remainingPointer) {
        startPos.current = { x: remainingPointer.x, y: remainingPointer.y };
        initialPos.current = { ...position };
      }
    }

    if (pointers.current.size === 0) {
      isDragging.current = false;
      if (scale > 1 && scale < 1.15) {
        resetZoom();
      } else if (scale === 1) {
        if (swipeDirection === 'horizontal') {
          const hasPrev = currentIndex > 0;
          const hasNext = totalPhotos !== undefined ? currentIndex < totalPhotos - 1 : true;
          
          if (position.x > minSwipeDistance) {
            if (hasPrev) {
              hapticFeedback.light();
              onPrev();
            }
          } else if (position.x < -minSwipeDistance) {
            if (hasNext) {
              hapticFeedback.light();
              onNext();
            }
          }
        } else if (swipeDirection === 'vertical') {
          if (Math.abs(position.y) > GESTURE_CONFIG.CLOSE_THRESHOLD && onClose) {
            hapticFeedback.light();
            onClose();
          }
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
      if (hasMovedRef.current) return;
      if (scale > 1) resetZoom();
      else setScale(GESTURE_CONFIG.DOUBLE_TAP_SCALE);
    },
    resetZoom
  };
}
