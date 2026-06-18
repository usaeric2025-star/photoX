import type { Context } from 'hono';
import { db } from '../../../_lib/db/index.js';
import { getServerEnv } from '../../../_shared/envSchema.js';

const serverEnv = getServerEnv(process.env);

export async function diagnoseWorker(c: Context) {
  const { testImageUrl } = await c.req.json();
  const workerUrl = (serverEnv as Record<string, unknown>).VITE_THUMBNAIL_WORKER_URL as string | undefined || process.env.VITE_THUMBNAIL_WORKER_URL;
  if (!workerUrl) {
    return c.json({ success: false, error: "未在服务器检测到 VITE_THUMBNAIL_WORKER_URL 环境变量" });
  }

  const base = workerUrl.replace(/\/$/, '');
  let targetUrl = base;
  let isRealImage = false;

  if (testImageUrl) {
    try {
      const urlObj = new URL(testImageUrl);
      const path = urlObj.pathname;
      targetUrl = `${base}${path.startsWith('/') ? path : '/' + path}?w=200&h=200`;
      isRealImage = true;
    } catch (e) {}
  } else {
    // If no test image, try to find one random image from DB to test "real" connectivity
    const randomPhoto = await db.query.furnitureItems.findFirst({
      columns: { imageUrl: true }
    });
    
    if (randomPhoto?.imageUrl) {
      try {
        const urlObj = new URL(randomPhoto.imageUrl);
        const path = urlObj.pathname;
        targetUrl = `${base}${path.startsWith('/') ? path : '/' + path}?w=200&h=200`;
        isRealImage = true;
      } catch (e) {}
    }
  }

  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(targetUrl, { 
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const end = performance.now();
    
    if (!res.ok) {
      return c.json({ 
          success: false, 
          error: `Worker 响应异常 (HTTP ${res.status}): ${res.statusText || 'Unknown Error'}`,
          data: {
            status: res.status,
            statusText: res.statusText,
            url: targetUrl,
            isRealImage
          }
      });
    }

    const contentType = res.headers.get('content-type');

    return c.json({ 
      success: true, 
      data: {
        status: res.status,
        statusText: res.statusText,
        latency: Math.round(end - start),
        url: targetUrl,
        contentType,
        isRealImage
      }
    });
  } catch (e: unknown) {
    return c.json({ success: false, error: `Worker 连通性异常: ${e instanceof Error ? e.message : 'Unknown error'}. 请检查 URL 是否正确及 Worker 是否已部署。` });
  }
}
