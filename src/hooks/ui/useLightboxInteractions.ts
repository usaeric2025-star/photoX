import { useState, useEffect } from 'react';

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
