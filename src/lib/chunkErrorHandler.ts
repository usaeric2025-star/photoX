import { logger } from '#lib/logger.js'

const RELOAD_COUNT_KEY = '__chunk_reload_count__'
const MAX_RELOADS = 2

/**
 * 設置 Chunk 加載失敗自動恢復機制
 */
function setupChunkErrorHandler() {
  window.addEventListener('unhandledrejection', async (event) => {
    const msg = event.reason?.message || ''
    handleChunkError(msg, event)
  })

  window.addEventListener('error', (event) => {
    const msg = event.message || ''
    // 檢查是否為資源加載錯誤且包含 chunk/module 關鍵字
    const isResourceError = event.target instanceof HTMLElement && (event.target.tagName === 'SCRIPT' || event.target.tagName === 'LINK')
    if (isResourceError || /chunk|module script|dynamically imported/i.test(msg)) {
      handleChunkError(msg, event)
    }
  }, true)
}

export async function handleChunkError(msg: string, event?: Event | PromiseRejectionEvent) {
  const isChunkError = msg.includes('Failed to fetch dynamically imported module')
    || msg.includes('Importing a module script failed')
    || msg.includes('Loading chunk failed')
    || msg.includes('error loading dynamically imported module')
    || msg.includes('Failed to load module script')
    || /chunk|module script|dynamically imported/i.test(msg)

  if (!isChunkError) return

  if (event) {
    event.preventDefault()
  }

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
    setTimeout(() => window.location.reload(), 100)
  } catch (softError) {
    logger.warn('[Chunk] 刷新失敗', softError)
    setTimeout(() => window.location.reload(), 100)
  }
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

function clearChunkReloadCount() {
  sessionStorage.removeItem(RELOAD_COUNT_KEY)
}

export function initChunkHandler() {
  setupChunkErrorHandler()
  window.addEventListener('load', () => clearChunkReloadCount())
}
