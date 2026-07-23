import { useState, useEffect, useRef, useCallback } from 'react';
import { GESTURE_CONFIG } from '#src/constants/config.js';
import { hapticFeedback } from '#lib/ui/haptics.js';
import { getPointerDistance, clampPosition, clamp } from '#src/lib/gesture.js';

export interface UseLightboxInteractionsProps {
  currentIndex: number;
  totalPhotos?: number;
  onNext: () => void;
  onPrev: () => void;
  onClose?: () => void;
  onTap?: () => void;
  minSwipeDistance?: number;
}

/**
 * useLightboxInteractions
 * 處理燈箱手勢、縮放與滑動邏輯。
 * 遵循「就近整合」與「反過度拆分」規範，作為 Lightbox 特有的 Local Hook。
 */
export function useLightboxInteractions({
  currentIndex,
  totalPhotos,
  onNext,
  onPrev,
  onClose,
  onTap,
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
      lastTapRef.current = Date.now();
    }

    if (pointers.current.size === 1) {
      startPos.current = { x: e.clientX, y: e.clientY };
      initialPos.current = { ...position };
      isDragging.current = true;
      if (scale === 1) setIsSwiping(true);
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      lastDistance.current = getPointerDistance(pts[0], pts[1]);
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
      const distance = getPointerDistance(pts[0], pts[1]);
      if (lastDistance.current !== null && lastDistance.current > 0) {
        const delta = distance / lastDistance.current;
        setScale(prev => {
          const target = prev * delta;
          return clamp(target, GESTURE_CONFIG.MIN_SCALE, GESTURE_CONFIG.MAX_SCALE);
        });
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
        setPosition(clampPosition(
          { x: newX, y: newY },
          scale,
          window.innerWidth,
          window.innerHeight
        ));
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
      if (!hasMovedRef.current) {
        onTap?.();
      }
      if (scale === 1) {
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
    resetZoom
  };
}
