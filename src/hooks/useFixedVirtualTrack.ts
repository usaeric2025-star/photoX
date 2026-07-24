import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

interface UseFixedVirtualTrackOptions {
  count: number;
  itemSize: number;
  gap?: number;
  padding?: number;
  overscan?: number;
  containerRef: RefObject<HTMLDivElement | null>;
  horizontal?: boolean;
}

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

export function useFixedVirtualTrack({
  count,
  itemSize,
  gap = 8,
  padding = 16,
  overscan = 6,
  containerRef,
  horizontal = true,
}: UseFixedVirtualTrackOptions) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [containerSize, setContainerSize] = useState(0);

  const stride = itemSize + gap;
  // 總尺寸包含首尾 padding 與 gap 補償
  const totalSize = count > 0 ? count * stride - gap + padding * 2 : 0;

  const isUserInteractingRef = useRef(false);
  const userInteractionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 監聽滾動與容器尺寸變動，加上邊界防護
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animationFrameId: number;

    const updateMeasurements = () => {
      const currentOffset = horizontal ? el.scrollLeft : el.scrollTop;
      const currentSize = horizontal ? el.clientWidth : el.clientHeight;

      setScrollOffset(currentOffset);
      setContainerSize(currentSize);
    };

    const handleScroll = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateMeasurements);
    };

    const handleUserStart = () => {
      isUserInteractingRef.current = true;
      if (userInteractionTimerRef.current) {
        clearTimeout(userInteractionTimerRef.current);
      }
      // 1.5 秒無觸摸操作後自動解除手動鎖定
      userInteractionTimerRef.current = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 1500);
    };

    // 初始化尺寸與滾動
    updateMeasurements();

    el.addEventListener('scroll', handleScroll, { passive: true });
    el.addEventListener('pointerdown', handleUserStart, { passive: true });
    el.addEventListener('touchstart', handleUserStart, { passive: true });
    el.addEventListener('wheel', handleUserStart, { passive: true });

    // 使用 ResizeObserver 監聽容器尺寸調整
    const observer = new ResizeObserver(() => {
      updateMeasurements();
    });
    observer.observe(el);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (userInteractionTimerRef.current) clearTimeout(userInteractionTimerRef.current);
      el.removeEventListener('scroll', handleScroll);
      el.removeEventListener('pointerdown', handleUserStart);
      el.removeEventListener('touchstart', handleUserStart);
      el.removeEventListener('wheel', handleUserStart);
      observer.disconnect();
    };
  }, [containerRef, horizontal]);

  // 計算當前視口渲染區間
  const startOffset = Math.max(0, scrollOffset - padding);
  const endOffset = Math.max(0, scrollOffset + containerSize - padding);

  const rawStartIndex = Math.floor(startOffset / stride);
  const rawEndIndex = Math.ceil(endOffset / stride);

  const startIndex = Math.max(0, rawStartIndex - overscan);
  const endIndex = Math.min(count - 1, rawEndIndex + overscan);

  const virtualItems: VirtualItem[] = [];
  if (count > 0 && containerSize > 0) {
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        start: padding + i * stride,
        size: itemSize,
      });
    }
  }

  // 精準平滑定位到指定 index，防止軌道逃離與防抖錯位
  const scrollToIndex = useCallback(
    (index: number, options?: { align?: 'center' | 'start' | 'end'; behavior?: ScrollBehavior; force?: boolean }) => {
      const el = containerRef.current;
      if (!el || index < 0 || index >= count) return;

      const { align = 'center', behavior = 'smooth', force = true } = options || {};

      // 如果用戶正在手動滑動軌道且非強制命令，暫緩硬性拉回
      if (!force && isUserInteractingRef.current) return;

      const size = horizontal ? el.clientWidth : el.clientHeight;
      if (size <= 0) return;

      const itemStart = padding + index * stride;

      let target = itemStart;
      if (align === 'center') {
        target = itemStart - size / 2 + itemSize / 2;
      } else if (align === 'end') {
        target = itemStart - size + itemSize;
      }

      // 嚴格邊界夾緊（Clamp），確保絕不逃離 bounds
      const maxScroll = Math.max(0, totalSize - size);
      const finalScroll = Math.max(0, Math.min(target, maxScroll));

      // 重置手動狀態
      isUserInteractingRef.current = false;

      if (horizontal) {
        // 部分流覽器在連續 smooth 觸發時可能卡死，強行設置以確保最新點位生效
        el.scrollTo({ left: finalScroll, behavior });
      } else {
        el.scrollTo({ top: finalScroll, behavior });
      }
    },
    [containerRef, count, horizontal, itemSize, padding, stride, totalSize]
  );

  return {
    virtualItems,
    totalSize,
    scrollToIndex,
  };
}

