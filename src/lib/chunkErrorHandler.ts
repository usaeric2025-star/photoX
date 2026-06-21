import type { AnyRouter } from '@tanstack/react-router'
import { logger } from '@/lib/logger'

const RELOAD_COUNT_KEY = '__chunk_reload_count__'
const MAX_RELOADS = 2

/**
 * 設置 Chunk 加載失敗自動恢復機制
 */
export function setupChunkErrorHandler(router: unknown) {
  const r = router as AnyRouter;
  window.addEventListener('unhandledrejection', async (event) => {
    const msg = event.reason?.message || ''
    const isChunkError = msg.includes('Failed to fetch dynamically imported module')
      || msg.includes('Importing a module script failed')
      || msg.includes('Loading chunk failed')
      || msg.includes('error loading dynamically imported module')
      || msg.includes('Failed to load module script')

    if (!isChunkError) return

    event.preventDefault()

    const reloadCount = Number(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0')
    
    if (reloadCount >= MAX_RELOADS) {
      logger.error('[Chunk] 多次刷新仍失敗，停止自動恢復')
      showFallbackErrorPage()
      return
    }

    sessionStorage.setItem(RELOAD_COUNT_KEY, String(reloadCount + 1))
    logger.warn(`[Chunk] 第 ${reloadCount + 1} 次自動恢復中...`)

    await clearCaches()

    try {
      await r.invalidate()
      const rr = r as unknown as { load?: () => Promise<void> };
      if (typeof rr.load === 'function') {
        await rr.load()
      } else {
        await r.navigate({ to: window.location.pathname, replace: true })
      }
      logger.debug('[Chunk] 軟導航成功，狀態已完整保留')
      clearChunkReloadCount()
    } catch (softError) {
      logger.warn('[Chunk] 軟導航失敗，嘗試硬刷新', softError)
      setTimeout(() => window.location.reload(), 100)
    }
  })
}

async function clearCaches() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(reg => reg.unregister()))
    } catch (e) {
      logger.warn('[Chunk] Service Worker 清理失敗', e)
    }
  }
  
  if ('caches' in window) {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
    } catch (e) {
      logger.warn('[Chunk] Cache API 清理失敗', e)
    }
  }
}

function showFallbackErrorPage() {
  const fallbackHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>更新失敗 - PhotoX</title>
        <style>
          body { margin: 0; padding: 2rem; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .container { max-width: 480px; background: white; border-radius: 1rem; padding: 2rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; }
          h2 { margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600; color: #0f172a; }
          p { margin: 0 0 1.5rem 0; color: #475569; line-height: 1.5; }
          button { background: #3b82f6; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>⚠️ 應用更新失敗</h2>
          <p>尝试自动恢复多次后仍无法载入最新版本。请点击下方按钮清除缓存后重新进入。</p>
          <button onclick="localStorage.clear(); sessionStorage.clear(); location.reload();">清除緩存並重試</button>
        </div>
      </body>
    </html>
  `
  document.body.innerHTML = fallbackHtml
}

export function clearChunkReloadCount() {
  sessionStorage.removeItem(RELOAD_COUNT_KEY)
}

export function initChunkHandler(router: unknown) {
  const r = router as AnyRouter;
  setupChunkErrorHandler(r)
  window.addEventListener('load', () => clearChunkReloadCount())
  r.subscribe('onLoad', () => clearChunkReloadCount())
}
