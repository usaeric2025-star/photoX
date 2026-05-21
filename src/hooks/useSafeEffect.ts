import { useEffect, useRef, EffectCallback, DependencyList } from 'react'

/**
 * 安全的 useEffect，防止因状态变化导致的无限循环
 * 在依赖项变化后，会等待一个微任务周期，避免同步循环
 */
export function useSafeEffect(
  effect: EffectCallback,
  deps: DependencyList,
  options?: { debounceMs?: number }
) {
  const isFirstRun = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  useEffect(() => {
    // 跳过首次执行（如果需要）
    if (options?.debounceMs && isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    
    if (options?.debounceMs) {
      timeoutRef.current = setTimeout(() => {
        effect()
      }, options.debounceMs)
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }
    
    return effect()
  }, deps)
}
