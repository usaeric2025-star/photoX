export interface ResizeOptions {
  width?: number;
  format?: 'auto' | 'webp' | 'avif';
}

export function resolveImageUrl(url: string, options: ResizeOptions = {}): string {
  if (!url || url.startsWith('data:')) return url;
  
  const workerUrl = import.meta.env.VITE_THUMBNAIL_WORKER_URL;
  
  if (workerUrl) {
    const width = options.width || 400; // Default
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      return `${workerUrl.replace(/\/$/, '')}${path}?w=${width}&h=${width}`;
    } catch (e) {
      // Fallback if URL parsing fails
      const cleanUrl = url.split('?')[0];
      return `${workerUrl.replace(/\/$/, '')}/${cleanUrl.split('/').pop()}?w=${width}&h=${width}`;
    }
  }

  // Fallback for direct R2 resizing (if for some reason worker is not configured)
  const isResizingSupported = url.includes('r2.dev') || 
                              url.includes('cloudflarestorage.com');
  
  if (!isResizingSupported) {
    return url;
  }
  
  const { width, format = 'auto' } = options;
  const params = new URLSearchParams();
  if (width) params.append('width', width.toString());
  params.append('format', format);

  return `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
}

export function getThumbnailUrl(originalUrl: string, width: number, updatedAt?: string) {
  const workerUrl = import.meta.env.VITE_THUMBNAIL_WORKER_URL;
  if (!workerUrl || !originalUrl) return originalUrl;
  
  try {
    const url = new URL(originalUrl);
    const cacheBuster = updatedAt ? `&t=${new Date(updatedAt).getTime()}` : '';
    return `${workerUrl.replace(/\/$/, '')}${url.pathname}?w=${width}${cacheBuster}`;
  } catch (e) {
    return originalUrl;
  }
}
