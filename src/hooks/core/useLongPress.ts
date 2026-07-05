import { useCallback, useRef, useEffect } from 'react';

interface UseLongPressOptions {
  /** 长按触发时间（毫秒），默认 500ms */
  delay?: number;
  /** 长按触发回调 */
  onLongPress: (e: React.MouseEvent | React.TouchEvent) => void;
  /** 短按点击回调（可选） */
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

export function useLongPress<T extends HTMLElement = HTMLDivElement>({
  delay = 500,
  onLongPress,
  onClick,
  disabled = false,
}: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const isPressedRef = useRef(false);
  const elementRef = useRef<T | null>(null);

  // ✅ 清理定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ✅ 按下事件
  const handleStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      isPressedRef.current = true;
      isLongPressRef.current = false;

      // 启动长按计时器
      timerRef.current = setTimeout(() => {
        if (isPressedRef.current) {
          isLongPressRef.current = true;
          onLongPress(e);
        }
        clearTimer();
      }, delay);
    },
    [disabled, delay, onLongPress, clearTimer]
  );

  // ✅ 释放事件
  const handleEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      clearTimer();

      // ✅ 如果不是长按，且有点击回调，触发点击
      if (!isLongPressRef.current && onClick) {
        onClick(e);
      }

      isPressedRef.current = false;
    },
    [disabled, clearTimer, onClick]
  );

  // ✅ 离开元素（取消长按）
  const handleLeave = useCallback(() => {
    if (disabled) return;
    clearTimer();
    isPressedRef.current = false;
  }, [disabled, clearTimer]);

  // ✅ 清理（组件卸载时）
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  // ✅ 返回事件绑定
  return {
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onMouseLeave: handleLeave,
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchCancel: handleLeave,
    ref: elementRef,
  };
}
