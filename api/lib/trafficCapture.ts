import { logger } from './logger.js';

export function logTraffic(req: any, res: any) {
  if (req.method === 'GET') {
    const rawHeaders = typeof req.header === 'function' ? req.header() : (req.headers || {});
    const { authorization, cookie, ...headers } = rawHeaders;
    logger.debug('[TRAFFIC-CAPTURE]', {
      method: req.method,
      path: typeof req.path === 'string' ? req.path : (req.url || ''),
      headers,
    });
  }
}
