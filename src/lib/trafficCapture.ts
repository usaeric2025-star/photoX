
export function logTraffic(req: any, res: any) {
  // Only capture READ requests (GET) for safety, and strip sensitive headers
  if (req.method === 'GET') {
    const rawHeaders = typeof req.header === 'function' ? req.header() : (req.headers || {});
    const { authorization, cookie, ...headers } = rawHeaders;
    console.log('[TRAFFIC-CAPTURE]', {
      method: req.method,
      path: typeof req.path === 'string' ? req.path : (req.url || ''),
      headers,
    });
  }
}
