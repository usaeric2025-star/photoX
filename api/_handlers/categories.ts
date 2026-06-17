import { Hono } from 'hono';
import { type } from 'arktype';
import { db, categories as categoriesTable, furnitureItems } from '../_lib/db/index.js';
import { eq, asc, ne } from 'drizzle-orm';
import { CategoryReqSchema } from '../_shared/apiContractSchema.js';

export const categories = new Hono()
  .get('/', async (c) => {
    try {
      const data = await db
          .select({
              id: categoriesTable.id,
              code: categoriesTable.code,
              name_zh: categoriesTable.nameZh,
              name_en: categoriesTable.nameEn,
              name_ms: categoriesTable.nameMs,
              sort_order: categoriesTable.sortOrder,
          })
          .from(categoriesTable)
          .where(eq(categoriesTable.isActive, true))
          .orderBy(asc(categoriesTable.sortOrder));

      // Transform to frontend format: { id, name, code, zh, en, ms, sort_order }
      const formatted = data.map((item) => ({
          id: item.id,
          name: item.name_zh,
          zh: item.name_zh,
          en: item.name_en,
          ms: item.name_ms,
          code: item.code,
          sort_order: item.sort_order,
      }));

      return c.json({ success: true, data: formatted });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  })
  .post('/seed', async (c) => {
    try {
      // Clean up using Drizzle
      await db.delete(categoriesTable).where(ne(categoriesTable.id, '00000000-0000-0000-0000-000000000000'));
      
      const seedData = [
        { code: 'chair', nameZh: '椅子', nameEn: 'Chair', nameMs: 'Kerusi', sortOrder: 1 },
        { code: 'table', nameZh: '桌子', nameEn: 'Table', nameMs: 'Meja', sortOrder: 2 },
        { code: 'bed', nameZh: '床具', nameEn: 'Bed', nameMs: 'Katil', sortOrder: 3 },
        { code: 'cabinet', nameZh: '柜子', nameEn: 'Cabinet', nameMs: 'Almari', sortOrder: 4 },
        { code: 'office', nameZh: '办公', nameEn: 'Office', nameMs: 'Pejabat', sortOrder: 5 },
        { code: 'sofa', nameZh: '沙发', nameEn: 'Sofa', nameMs: 'Sofa', sortOrder: 6 },
        { code: 'others', nameZh: '其他', nameEn: 'Others', nameMs: 'Lain-lain', sortOrder: 7 }
      ];

      await db.insert(categoriesTable).values(seedData);
      
      return c.json({ success: true, message: 'Database seeded successfully' });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  })
  .post('/clear-photos', async (c) => {
    const body = await c.req.json();
    const check = type({ categoryId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { categoryId } = check;
    try {
      const updated = await db
          .update(furnitureItems)
          .set({ categoryId: null })
          .where(eq(furnitureItems.categoryId, categoryId))
          .returning({ id: furnitureItems.id });
      
      return c.json({ success: true, data: updated.map(i => i.id) });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = type({ categoryData: CategoryReqSchema })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { categoryData } = check;
    try {
      // Map frontend fields (snake_case) to Drizzle fields (camelCase)
      const mappedData = {
        code: categoryData.code,
        nameZh: categoryData.name_zh,
        nameEn: categoryData.name_en,
        nameMs: categoryData.name_ms,
        sortOrder: categoryData.sort_order,
        isActive: categoryData.is_active,
      };

      const [data] = await db
          .insert(categoriesTable)
          .values(mappedData)
          .returning();
      
      return c.json({ success: true, data });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = type({ updates: CategoryReqSchema.omit("id") })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { updates } = check;
    try {
      const mappedUpdates: Record<string, unknown> = {};
      if (updates.code !== undefined) mappedUpdates.code = updates.code;
      if (updates.name_zh !== undefined) mappedUpdates.nameZh = updates.name_zh;
      if (updates.name_en !== undefined) mappedUpdates.nameEn = updates.name_en;
      if (updates.name_ms !== undefined) mappedUpdates.nameMs = updates.name_ms;
      if (updates.sort_order !== undefined) mappedUpdates.sortOrder = updates.sort_order;
      if (updates.is_active !== undefined) mappedUpdates.isActive = updates.is_active;

      await db
          .update(categoriesTable)
          .set(mappedUpdates)
          .where(eq(categoriesTable.id, id));
      
      return c.json({ success: true });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      await db
          .delete(categoriesTable)
          .where(eq(categoriesTable.id, id));
      
      return c.json({ success: true });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  });
