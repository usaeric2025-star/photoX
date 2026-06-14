import { useRef, useEffect } from 'react'

export const useRenderCount = (label: string, enabled = true) => {
  const count = useRef(0)
  const isStrictMode = useRef(true)
  
  if (!enabled) return
  
  if (isStrictMode.current) {
    isStrictMode.current = false
    return
  }
  
  count.current++
  console.log(`[Render] ${label}: ${count.current}`)
}

// 組件中使用
export const RenderCount = ({ label }: { label: string }) => {
  useRenderCount(label)
  return null
}
