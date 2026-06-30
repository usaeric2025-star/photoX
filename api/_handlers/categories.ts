import { Hono } from 'hono';
import * as v from 'valibot';
import { db, categories as categoriesTable, furnitureItems } from '@/api/_lib/db/index.js';
import { eq, sql } from 'drizzle-orm';
import { CategoryReqSchema } from '@/shared/apiContractSchema.js';
import { errorResponse } from '@/api/_lib/response.js';
import { getAllCategories, getCategoryById } from '@/api/_lib/db/queries/categories.js';

interface FormattedCategory {
    id: number;
    name: string;
    code: string;
    zh: string;
    en: string;
    ms: string;
    sort_order: number;
}

let categoriesCache: FormattedCategory[] | null = null;
let cacheTime = 0;

export const categories = new Hono()
  .get('/', async (c) => {
    const now = Date.now();
    if (categoriesCache && now - cacheTime < 5 * 60 * 1000) {
        return c.json({ success: true, data: categoriesCache });
    }
    
    const data = await getAllCategories();
    const activeData = data.filter(c => c.isActive);

    // Transform to frontend format: { id, name, code, zh, en, ms, sortOrder }
    const formatted = activeData.map((item) => ({
        id: item.id,
        name: item.nameZh || '',
        zh: item.nameZh || '',
        en: item.nameEn || '',
        ms: item.nameMs || '',
        code: item.code || '',
        sortOrder: item.sortOrder || 0,
    }));

    categoriesCache = formatted as any;
    cacheTime = now;
    return c.json({ success: true, data: formatted });
  })
  .post('/seed', async (c) => {
    // Clean up using Drizzle
    await db.delete(categoriesTable).where(sql`true`);
    
    const seedData = [
      { id: 1, code: 'chair', nameZh: '椅子', nameEn: 'Chair', nameMs: 'Kerusi', sortOrder: 1 },
      { id: 2, code: 'table', nameZh: '桌子', nameEn: 'Table', nameMs: 'Meja', sortOrder: 2 },
      { id: 3, code: 'bed', nameZh: '床具', nameEn: 'Bed', nameMs: 'Katil', sortOrder: 3 },
      { id: 4, code: 'cabinet', nameZh: '柜子', nameEn: 'Cabinet', nameMs: 'Almari', sortOrder: 4 },
      { id: 5, code: 'office', nameZh: '办公', nameEn: 'Office', nameMs: 'Pejabat', sortOrder: 5 },
      { id: 6, code: 'sofa', nameZh: '沙发', nameEn: 'Sofa', nameMs: 'Sofa', sortOrder: 6 },
      { id: 7, code: 'others', nameZh: '其他', nameEn: 'Others', nameMs: 'Lain-lain', sortOrder: 7 }
    ];

    await db.insert(categoriesTable).values(seedData);
    
    categoriesCache = null; // Clear cache
    
    return c.json({ success: true, message: 'Database seeded successfully' });
  })
  .post('/clear-photos', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ categoryId: v.number() }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { categoryId } = check.output;
    const updated = await db
        .update(furnitureItems)
        .set({ categoryId: null })
        .where(eq(furnitureItems.categoryId, categoryId))
        .returning({ id: furnitureItems.id });
    
    return c.json({ success: true, data: updated.map(i => i.id) });
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ categoryData: CategoryReqSchema }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { categoryData } = check.output;
    const [data] = await db
        .insert(categoriesTable)
        .values([categoryData as typeof categoriesTable.$inferInsert])
        .returning();
    
    categoriesCache = null; // Clear cache
    
    return c.json({ success: true, data });
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = v.safeParse(v.object({ updates: v.omit(CategoryReqSchema, ["id"]) }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { updates } = check.output;
    await db
        .update(categoriesTable)
        .set(updates)
        .where(eq(categoriesTable.id, parseInt(id)));
    
    categoriesCache = null; // Clear cache
    
    return c.json({ success: true });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    await db
        .delete(categoriesTable)
        .where(eq(categoriesTable.id, parseInt(id)));
    
    categoriesCache = null; // Clear cache
    
    return c.json({ success: true });
  });
