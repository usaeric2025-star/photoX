import * as thumbhash from 'thumbhash';

/**
 * Generates a ThumbHash from a File or Image element
 */
export async function generateThumbHash(source: File | string): Promise<string | null> {
  try {
    const img = new Image();
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      if (typeof source === 'string' && source.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // We only need a small version for ThumbHash (max 100x100 is plenty)
    const maxSize = 100;
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > maxSize) {
        height *= maxSize / width;
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width *= maxSize / height;
        height = maxSize;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const binaryThumbHash = thumbhash.rgbaToThumbHash(imageData.width, imageData.height, imageData.data);
    
    if (typeof source !== 'string') {
      URL.revokeObjectURL(url);
    }

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...binaryThumbHash));
  } catch (e) {
    console.error('[ThumbHash] Generation failed:', e);
    return null;
  }
}

const thumbHashCache = new Map<string, string>();

/**
 * Converts a ThumbHash base64 string to a Data URL
 */
export function thumbHashToDataURL(hash: string | undefined): string | undefined {
  if (!hash) return undefined;
  if (thumbHashCache.has(hash)) {
    return thumbHashCache.get(hash);
  }
  try {
    const binary = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
    const dataUrl = thumbhash.thumbHashToDataURL(binary);
    if (dataUrl) {
      thumbHashCache.set(hash, dataUrl);
    }
    return dataUrl;
  } catch (e) {
    console.error('[ThumbHash] Conversion failed:', e);
    return undefined;
  }
}
