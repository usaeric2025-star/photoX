import { encode, decode } from '@thi.ng/blurhash';

/**
 * Generates a BlurHash from a File object.
 * Uses a temporary canvas to resize the image for efficient encoding.
 */
export async function generateBlurhash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Could not get canvas context');

                // Small size is sufficient for BlurHash (4x4 components)
                canvas.width = 32;
                canvas.height = 32;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const hash = encode(imageData.data, canvas.width, canvas.height, 4, 4);
                resolve(hash);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Decodes a BlurHash to a base64 data URL.
 * Useful for setting as a background image or img src.
 */
export function blurhashToDataUrl(hash: string, width = 32, height = 32): string {
    try {
        if (!hash || hash.length < 6) return '';
        
        const pixels = decode(hash, width, height);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        const imageData = ctx.createImageData(width, height);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);

        return canvas.toDataURL('image/jpeg', 0.5);
    } catch (err) {
        console.warn('[BlurHash] Decode failed:', err);
        return '';
    }
}

/**
 * Basic validation for BlurHash strings.
 */
export function isValidBlurhash(hash: string | null | undefined): boolean {
    if (!hash) return false;
    // BlurHash strings are usually at least 6 characters and start with a specific character set
    return hash.length >= 6;
}
