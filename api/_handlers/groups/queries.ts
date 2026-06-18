import { Hono } from 'hono';
import { db, groups as groupsTable } from '../../_lib/db/index.js';
import { eq, and, asc } from 'drizzle-orm';

export const groupQueries = new Hono()
  .get('/', async (c) => {
    try {
      const isAdminByQuery = c.req.query('isAdminMode') === 'true';
      let query = db.select().from(groupsTable).orderBy(asc(groupsTable.name));
      if (!isAdminByQuery) {
          query = db.select().from(groupsTable)
            .where(and(eq(groupsTable.status, 'confirmed')))
            .orderBy(asc(groupsTable.name)) as any;
      }
      const data = await query;
      return c.json({ success: true, data });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const data = await db.query.groups.findFirst({
        where: eq(groupsTable.id, id)
      });
      if (!data) return c.json({ success: false, error: 'Not found' }, 404);
      return c.json({ success: true, data });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });
