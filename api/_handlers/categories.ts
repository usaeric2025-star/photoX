import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import * as v from 'valibot';
import { db, categories as categoriesTable, furnitureItems } from '../_lib/db/index.js';
import { eq, sql } from 'drizzle-orm';
import { CategoryReqSchema } from '../../shared/apiContractSchema.js';
import { errorResponse, successResponse } from '../_lib/response.js';
import { getAllCategories } from '../_lib/db/queries/categories.js';

interface FormattedCategory {
    id: number;
    name: string;
    code: string;
    zh: string;
    en: string;
    ms: string;
    sortOrder: number;
}

let categoriesCache: FormattedCategory[] | null = null;
let cacheTime = 0;

export const categories = new Hono()
  .get('/', async (c) => {
    const now = Date.now();
    if (categoriesCache && now - cacheTime < 5 * 60 * 1000) {
        return successResponse(c, categoriesCache);
    }
    
    const data = await getAllCategories();
    const activeData = data.filter(c => c.isActive);

    const formatted: FormattedCategory[] = activeData.map((item) => ({
        id: item.id,
        name: item.nameZh || '',
        zh: item.nameZh || '',
        en: item.nameEn || '',
        ms: item.nameMs || '',
        code: item.code || '',
        sortOrder: item.sortOrder || 0,
    }));

    categoriesCache = formatted;
    cacheTime = now;
    return successResponse(c, formatted);
  })
  .post('/seed', async (c) => {
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
    categoriesCache = null;
    return successResponse(c, { message: 'Database seeded successfully' });
  })
  .post('/clear-photos', sValidator('json', v.object({ categoryId: v.number() })), async (c) => {
    const { categoryId } = c.req.valid('json');
    const updated = await db
        .update(furnitureItems)
        .set({ categoryId: null })
        .where(eq(furnitureItems.categoryId, categoryId))
        .returning({ id: furnitureItems.id });
    
    return successResponse(c, updated.map(i => i.id));
  })
  .post('/', sValidator('json', v.object({ categoryData: CategoryReqSchema })), async (c) => {
    const { categoryData } = c.req.valid('json');
    const [data] = await db
        .insert(categoriesTable)
        .values([categoryData as any])
        .returning();
    
    categoriesCache = null;
    return successResponse(c, data);
  })
  .put('/:id{[0-9]+}', sValidator('json', v.object({ updates: v.omit(CategoryReqSchema, ["id"]) })), async (c) => {
    const id = parseInt(c.req.param('id'));
    const { updates } = c.req.valid('json');
    
    await db
        .update(categoriesTable)
        .set(updates as any)
        .where(eq(categoriesTable.id, id));
    
    categoriesCache = null;
    return successResponse(c, null);
  })
  .delete('/:id{[0-9]+}', async (c) => {
    const id = parseInt(c.req.param('id'));
    await db
        .delete(categoriesTable)
        .where(eq(categoriesTable.id, id));
    
    categoriesCache = null;
    return successResponse(c, null);
  });
