import React, { useRef, useState } from 'react';

export const useLongPress = (onLongPress: (item: any) => void) => {
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const activeTouchId = useRef<number | null>(null);
  const touchStartPoint = useRef<{x: number, y: number} | null>(null);
  const hasLongPressed = useRef<boolean>(false);
  const [activeItem, setActiveItem] = useState<any | null>(null);

  const startPress = (item: any, e?: React.TouchEvent | React.MouseEvent) => {
    hasLongPressed.current = false;
    
    if (e && 'touches' in e) {
      activeTouchId.current = e.touches[0].identifier;
      touchStartPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      activeTouchId.current = null;
      touchStartPoint.current = null;
    }

    pressTimer.current = setTimeout(() => {
      hasLongPressed.current = true;
      setActiveItem(item);
      onLongPress(item);
    }, 400);
  };

  const clearTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const cancelPress = () => {
    clearTimer();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPoint.current) return;
    const touchList = Array.from(e.changedTouches) as React.Touch[];
    const touch = touchList.find(t => t.identifier === activeTouchId.current);
    if (!touch) return;
    
    const dx = touch.clientX - touchStartPoint.current.x;
    const dy = touch.clientY - touchStartPoint.current.y;
    if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
      cancelPress();
    }
  };

  const endPress = () => {
    clearTimer();
    activeTouchId.current = null;
    touchStartPoint.current = null;
  };

  return {
    startPress,
    endPress,
    cancelPress,
    handleTouchMove,
    hasLongPressed,
    activeItem,
    setActiveItem
  };
};
