export interface ResizeOptions {
  width?: number;
  format?: 'auto' | 'webp' | 'avif';
}

export function resolveImageUrl(url: string, options: ResizeOptions = {}): string {
  if (!url || url.startsWith('data:')) return url;
  
  // R2 identification: If it contains 'r2' in the domain or matches common R2 patterns
  // Alternatively, we can check if it DOES NOT contain 'supabase.co' (Supabase) 
  // and DOES NOT contain 'localhost' (Dev). 
  // Let's use a more explicit check for R2 or custom CDN domains that support CF resizing.
  const isResizingSupported = url.includes('r2.dev') || 
                              url.includes('cloudflarestorage.com') ||
                              url.includes('cdn.') || // Common for custom CDNs
                              url.includes('photo-static'); // Hypothetical app specific domain

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
