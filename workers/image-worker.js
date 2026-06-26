// Cloudflare Worker for R2 Image Resizing and Caching
// Handles fetching images from Cloudflare R2 and optionally resizing them using Cloudflare Images Resizing.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Extract the R2 object key from the pathname (remove leading slash)
    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key) {
      return new Response('Not Found: Key is empty', { status: 404 });
    }

    // Get width and height query parameters (supports both 'width'/'height' and 'w'/'h')
    const widthParam = url.searchParams.get('width') || url.searchParams.get('w');
    const heightParam = url.searchParams.get('height') || url.searchParams.get('h');
    const format = url.searchParams.get('format') || 'auto';
    const quality = parseInt(url.searchParams.get('quality') || '85', 10);

    const width = widthParam ? parseInt(widthParam, 10) : null;
    const height = heightParam ? parseInt(heightParam, 10) : null;

    // Use Cloudflare Cache API to cache images and avoid R2 read class A/B operation costs
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try to retrieve the object from R2 bucket
    // Note: 'MY_BUCKET' must be bound to your R2 bucket in wrangler.toml or Cloudflare dashboard
    const bucket = env.MY_BUCKET || env.BUCKET || env.furniture_images;
    if (!bucket) {
      return new Response('Worker Configuration Error: R2 Bucket binding not found', { status: 500 });
    }

    const object = await bucket.get(key);
    if (object === null) {
      return new Response('Object Not Found', { status: 404 });
    }

    // Build base headers from R2 object metadata
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');

    // If resizing is requested, and we have Cloudflare Image Resizing active on the zone
    if ((width || height) && request.cf && request.cf.image) {
      // Cloudflare Image Resizing can be triggered by fetching the raw R2 URL with resizing options
      // Build options for Cloudflare Image Resizing
      const resizeOptions = {
        cf: {
          image: {
            width: width || undefined,
            height: height || undefined,
            fit: 'cover',
            format: format,
            quality: quality,
          }
        }
      };

      // Fetch the object through Cloudflare's image resizing proxy using a public prefix or a loopback
      const publicPrefix = env.R2_PUBLIC_URL_PREFIX || env.VITE_R2_PUBLIC_URL_PREFIX;
      if (publicPrefix) {
        const rawImageUrl = `${publicPrefix.replace(/\/$/, '')}/${key}`;
        try {
          const resizedResponse = await fetch(rawImageUrl, resizeOptions);
          if (resizedResponse.ok) {
            const finalResponse = new Response(resizedResponse.body, resizedResponse);
            finalResponse.headers.set('Access-Control-Allow-Origin', '*');
            finalResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
            ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
            return finalResponse;
          }
        } catch (err) {
          // Fall back to original image on error
        }
      }
    }

    // Return the original file if no resizing was requested or if resizing failed/unsupported
    const response = new Response(object.body, { headers });
    
    // Only cache successful R2 retrievals
    if (response.status === 200) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  }
};
