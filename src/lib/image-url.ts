export interface ResizeOptions {
  width?: number;
  format?: 'auto' | 'webp' | 'avif';
}

export function resolveImageUrl(url: string, options: ResizeOptions = {}): string {
  if (!url || url.startsWith('data:')) return url;
  
  const workerUrl = import.meta.env.VITE_THUMBNAIL_WORKER_URL;
  
  if (workerUrl) {
    const cleanUrl = url.split('?')[0];
    const width = options.width || 400; // Default
    return `${workerUrl.replace(/\/$/, '')}${cleanUrl.replace(/^.*\.dev/, '')}?w=${width}&h=${width}`;
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

export function getContractedImageUrl(url: string, width: number): string {
  return resolveImageUrl(url, { width });
}
