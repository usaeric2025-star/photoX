import { logger } from '../logger.js';

/**
 * Normalizes an image URL to ensure it is fully qualified for external API (like Gemini) access.
 */
export function normalizeImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';

    const r2Base = process.env.R2_PUBLIC_URL_PREFIX || 'https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev';
    const cleanBase = r2Base.endsWith('/') ? r2Base.slice(0, -1) : r2Base;

    let finalUrl = imageUrl;

    // 1. Handle relative paths
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        const cleanPath = finalUrl.startsWith('/') ? finalUrl.slice(1) : finalUrl;
        finalUrl = `${cleanBase}/${cleanPath}`;
    } 
    // 2. Handle legacy /products/ paths
    else if (finalUrl.includes('/products/')) {
        finalUrl = finalUrl
            .replace('/products/', '/')
            .replace(/\/(\d+-[a-z0-9]+\.webp)$/i, '/temp-$1');
    }

    // 3. Ensure Photox specific path alignment
    const match = finalUrl.match(/photox\/(public|thumb|original)\/(.+)/);
    if (match) {
        const pathAndFilename = match[0];
        finalUrl = `${cleanBase}/${pathAndFilename}`;
    }

    return finalUrl;
}
