import { useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

export function usePerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRender = useRef(performance.now());

  useEffect(() => {
    renderCount.current++;
    const now = performance.now();
    const elapsed = now - lastRender.current;
    
    // 如果渲染耗时较长，打印 debug 消息
    if (elapsed > 16) { // 超过一帧（60fps）
      logger.debug(`[性能] ${componentName} 渲染耗时 ${elapsed.toFixed(2)}ms, 第 ${renderCount.current} 次渲染`);
    }
    
    lastRender.current = now;
  });

  return { renderCount: renderCount.current };
}
