import { useState, useEffect, useRef } from 'react';

interface UseLightboxInteractionsProps {
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose?: () => void;
  minSwipeDistance?: number;
}

/**
 * useLightboxInteractions
 * 
 * 處理燈箱手勢、縮放與滑動邏輯。
 */
export function useLightboxInteractions({
  currentIndex,
  onNext,
  onPrev,
  onClose,
  minSwipeDistance = 50,
}: UseLightboxInteractionsProps) {
  const [pointerStartX, setPointerStartX] = useState<number | null>(null);
  const [pointerStartY, setPointerStartY] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);
  const [swipeDirection, setSwipeDirection] = useState<'horizontal' | 'vertical' | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    setIsZoomed(false);
    setDragOffset(0);
    setDragOffsetY(0);
    setSwipeDirection(null);
    setIsSwiping(false);
  }, [currentIndex]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!e.isPrimary || isZoomed) return;

    // Double tap detection
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      e.preventDefault();
      setIsZoomed(prev => !prev);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;

    setPointerStartX(e.clientX);
    setPointerStartY(e.clientY);
    setDragOffset(0);
    setDragOffsetY(0);
    setSwipeDirection(null);
    setIsSwiping(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointerStartX === null || pointerStartY === null) return;

    const diffX = e.clientX - pointerStartX;
    const diffY = e.clientY - pointerStartY;

    let currentDirection = swipeDirection;

    if (!currentDirection) {
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      const threshold = 10;

      if (absX > threshold || absY > threshold) {
        if (absX > absY) {
          currentDirection = 'horizontal';
          setSwipeDirection('horizontal');
        } else {
          currentDirection = 'vertical';
          setSwipeDirection('vertical');
        }
      }
    }

    if (currentDirection === 'horizontal') {
      setDragOffset(diffX);
      setDragOffsetY(0);
    } else if (currentDirection === 'vertical') {
      setDragOffset(0);
      setDragOffsetY(diffY);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerStartX === null) return;
    
    if (swipeDirection === 'horizontal') {
      if (dragOffset > minSwipeDistance) {
        onPrev();
      } else if (dragOffset < -minSwipeDistance) {
        onNext();
      }
    } else if (swipeDirection === 'vertical') {
      if (Math.abs(dragOffsetY) > 100 && onClose) {
        onClose();
      }
    }
    
    setPointerStartX(null);
    setPointerStartY(null);
    setDragOffset(0);
    setDragOffsetY(0);
    setSwipeDirection(null);
    setIsSwiping(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    setPointerStartX(null);
    setPointerStartY(null);
    setDragOffset(0);
    setDragOffsetY(0);
    setSwipeDirection(null);
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
    dragOffsetY,
    swipeDirection,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    handleToggleZoom,
  };
}
