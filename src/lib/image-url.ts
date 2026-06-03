export interface ResizeOptions {
  width?: number;
  format?: 'auto' | 'webp' | 'avif';
}

export function resolveImageUrl(url: string, options: ResizeOptions = {}): string {
  if (!url || url.startsWith('data:')) return url;
  
  const workerUrl = import.meta.env.VITE_THUMBNAIL_WORKER_URL;
  const isWorkerUrl = workerUrl && url.startsWith(workerUrl);

  // If it's already a worker URL, it likely has ?w=... already. 
  // We can choose to update it or leave it. 
  // ContractedImage calls this with width.
  if (isWorkerUrl) {
    if (!options.width) return url;
    const cleanUrl = url.split('?')[0];
    return `${cleanUrl}?w=${options.width}&h=${options.width}`;
  }

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
