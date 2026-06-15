import { useRef, useEffect } from 'react'
import { logger } from '@/lib/logger'

export const useRenderCount = (label: string, enabled = true) => {
  const count = useRef(0)
  const isStrictMode = useRef(true)
  
  if (!enabled) return
  
  if (isStrictMode.current) {
    isStrictMode.current = false
    return
  }
  
  count.current++
  logger.debug(`[Render] ${label}: ${count.current}`)
}

// 組件中使用
export const RenderCount = ({ label }: { label: string }) => {
  useRenderCount(label)
  return null
}
