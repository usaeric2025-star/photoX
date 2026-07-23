import { useEffect, useRef } from 'react';

/**
 * 相邻图片预加载 Hook
 * 在后台预先拉取当前照片前后 `prefetchCount` 张图片，提升灯箱切换顺滑度
 */
export function usePhotoPrefetch(
  imageUrls: string[],
  currentIndex: number,
  prefetchCount: number = 2
) {
  const loadedSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) return;

    const start = Math.max(0, currentIndex - prefetchCount);
    const end = Math.min(imageUrls.length, currentIndex + prefetchCount + 1);

    for (let i = start; i < end; i++) {
      if (i === currentIndex) continue; // 当前主图由 <img> 组件直接载入

      const url = imageUrls[i];
      if (!url || loadedSetRef.current.has(url)) continue;

      loadedSetRef.current.add(url);

      const img = new Image();
      // 设置低优先级 fetchPriority，不抢占当前主图与 API 的网络带宽
      if ('fetchPriority' in img) {
        (img as unknown as { fetchPriority: string }).fetchPriority = 'low';
      }
      img.src = url;
    }
  }, [imageUrls, currentIndex, prefetchCount]);
}
