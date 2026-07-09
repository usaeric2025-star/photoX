import { Hono } from 'hono';
import { db } from '../../_lib/db/index.js';
import { furnitureItems } from '../../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { errorResponse, successResponse } from '../../_lib/response.js';

export const checkHashRoutes = new Hono()
  .get('/check-hash', async (c) => {
    const hash = c.req.query('hash');
    if (!hash) {
      return errorResponse(c, '缺少 hash 參數', 400);
    }

    const existing = await db
      .select()
      .from(furnitureItems)
      .where(eq(furnitureItems.imageHash, hash))
      .limit(1);

    return successResponse(c, {
      exists: existing.length > 0,
      photo: existing[0] || null,
    });
  })
  .post('/check-hash', async (c) => {
    const { hash } = await c.req.json();
    if (!hash) {
      return errorResponse(c, '缺少 hash 參數', 400);
    }

    const existing = await db
      .select()
      .from(furnitureItems)
      .where(eq(furnitureItems.imageHash, hash))
      .limit(1);

    return successResponse(c, {
      exists: existing.length > 0,
      photo: existing[0] || null,
    });
  });
