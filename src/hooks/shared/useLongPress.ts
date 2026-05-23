import { useCallback, useRef, useState } from 'react';

export interface UseLongPressOptions {
  delay?: number;
  shouldPreventDefault?: boolean;
}

export const useLongPress = <T = any>(
  onLongPress: (itemOrEvent: any) => void,
  onClick?: (itemOrEvent: any) => void,
  options: UseLongPressOptions = {}
) => {
  const { delay = 500, shouldPreventDefault = true } = options;

  // legacy state support for TagEditor/FormShared
  const [activeItem, setActiveItem] = useState<T | null>(null);
  const [, setHasLongPressedState] = useState(false);
  const hasLongPressedRef = useRef(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = useRef(false);
  const isTouchRef = useRef(false);

  // New API: Start press triggering
  const start = useCallback(
    (event: React.MouseEvent | React.TouchEvent, item?: T) => {
      if (event.type === 'touchstart') {
        isTouchRef.current = true;
      } else if (isTouchRef.current && event.type === 'mousedown') {
        return; // Ignore simulated mouse events on touch screens
      }

      isLongPressedRef.current = false;
      hasLongPressedRef.current = false;
      setHasLongPressedState(false);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        isLongPressedRef.current = true;
        hasLongPressedRef.current = true;
        setHasLongPressedState(true);
        if (item !== undefined) {
          onLongPress(item);
        } else {
          onLongPress(event);
        }
        if ('vibrate' in navigator) {
          try {
            navigator.vibrate(50);
          } catch (e) {
            // Ignore sandboxing restrictions in nested iframe contexts
          }
        }
      }, delay);
    },
    [onLongPress, delay]
  );

  // Legacy API: startPress supporting passing an item first
  const startPress = useCallback(
    (item: T, event?: React.MouseEvent | React.TouchEvent) => {
      if (event) {
        start(event, item);
      } else {
        isLongPressedRef.current = false;
        hasLongPressedRef.current = false;
        setHasLongPressedState(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          isLongPressedRef.current = true;
          hasLongPressedRef.current = true;
          setHasLongPressedState(true);
          onLongPress(item);
          if ('vibrate' in navigator) {
            try {
              navigator.vibrate(50);
            } catch (e) {
              // Ignore sandboxing restrictions
            }
          }
        }, delay);
      }
    },
    [start, onLongPress, delay]
  );

  // New API: Clear press triggering
  const clear = useCallback(
    (event: React.MouseEvent | React.TouchEvent, shouldTriggerClick = true) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (isLongPressedRef.current) {
        if (shouldPreventDefault && event.cancelable) {
          event.preventDefault();
        }
        isLongPressedRef.current = false;
        return;
      }

      // Automatically reset long pressed ref after clear turns are completed to allow next presses
      setTimeout(() => {
        hasLongPressedRef.current = false;
      }, 0);

      if (shouldTriggerClick && onClick) {
        onClick(event);
      }
    },
    [onClick, shouldPreventDefault]
  );

  // Legacy API events: endPress, cancelPress, handleTouchMove
  const endPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isLongPressedRef.current = false;
  }, []);

  const cancelPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isLongPressedRef.current = false;
  }, []);

  const handleTouchMove = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (shouldPreventDefault) {
        event.preventDefault();
      }
    },
    [shouldPreventDefault]
  );

  return {
    // New API Spread bindings
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: (e: React.MouseEvent) => clear(e, true),
    onTouchEnd: (e: React.TouchEvent) => clear(e, true),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchMove: (e: React.TouchEvent) => clear(e, false),
    onTouchCancel: (e: React.TouchEvent) => clear(e, false),
    onContextMenu: handleContextMenu,

    // Legacy support elements
    startPress,
    endPress,
    cancelPress,
    handleTouchMove,
    hasLongPressed: hasLongPressedRef,
    activeItem,
    setActiveItem,
  };
};
