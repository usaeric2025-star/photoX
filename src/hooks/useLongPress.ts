import { useCallback, useRef, useState } from 'react';

export const useLongPress = <T = any>(
  onLongPress: (item: T, e?: any) => void,
  onClick?: (item: T, e?: any) => void,
  options: { delay?: number; shouldPreventDefault?: boolean } = {}
) => {
  const { delay = 500, shouldPreventDefault = true } = options;
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const target = useRef<EventTarget | null>(null);
  const activeItemRef = useRef<T | null>(null);
  
  const [activeItem, setActiveItemState] = useState<T | null>(null);
  const longPressTriggered = useRef(false);

  const setActiveItem = useCallback((item: T | null) => {
    activeItemRef.current = item;
    setActiveItemState(item);
  }, []);

  const start = useCallback(
    (item: T, e?: any) => {
      setActiveItem(item);
      if (shouldPreventDefault && e && e.target) {
        e.target.addEventListener('touchend', preventDefault, { passive: false });
        target.current = e.target;
      }
      longPressTriggered.current = false;
      timeout.current = setTimeout(() => {
        onLongPress(item, e);
        longPressTriggered.current = true;
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault, setActiveItem]
  );

  const clear = useCallback(
    (e?: any, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      shouldTriggerClick && !longPressTriggered.current && onClick && activeItemRef.current && onClick(activeItemRef.current, e);
      longPressTriggered.current = false;
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick]
  );

  const preventDefault = (e: any) => {
    if (!('touches' in e) || e.touches.length < 2 && e.preventDefault) {
      e.preventDefault();
    }
  };

  return {
    onMouseDown: (item: T, e?: any) => start(item, e),
    onTouchStart: (item: T, e?: any) => start(item, e),
    onMouseUp: (e?: any) => clear(e),
    onMouseLeave: (e?: any) => clear(e, false),
    onTouchEnd: (e?: any) => clear(e),
    onTouchCancel: (e?: any) => clear(e, false),
    onTouchMove: (e?: any) => clear(e, false),
    onContextMenu: (e?: any) => e?.preventDefault?.(),
    startPress: start,
    endPress: clear,
    cancelPress: (e?: any, trigger?: boolean) => clear(e, trigger),
    handleTouchMove: (e?: any, trigger?: boolean) => clear(e, trigger),
    hasLongPressed: longPressTriggered,
    activeItem,
    setActiveItem,
  };
};
