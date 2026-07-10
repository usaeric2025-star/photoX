import { Hono } from 'hono';

import { successResponse } from '../../_lib/response.js';

export const cronRefreshView = new Hono();

cronRefreshView.get('/', async (c) => {
  // Standard view is fully dynamic, real-time and requires no manual refreshing.
  // We keep this route active as a fast success no-op to ensure backwards compatibility with external cron callers.
  return successResponse(c, { 
    message: 'View is fully dynamic and real-time. Refresh skipped.' 
  });
});
