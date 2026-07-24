import { Hono } from 'hono';
import * as v from 'valibot';
import { CategoryReqSchema } from '../../shared/apiContractSchema.js';
import { successResponse } from '../_lib/response.js';
import { errorFactory } from '../_lib/error/factory.js';
import { 
    getAllCategories, 
    seedCategories, 
    clearPhotosFromCategory, 
    createCategory, 
    updateCategory, 
    deleteCategory 
} from '../_lib/db/queries/categories.js';

interface FormattedCategory {
    id: number;
    name: string;
    code: string;
    description: {
        zh: string;
        en?: string;
        ms?: string;
    };
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
    const activeData = data.filter(c => c.isActive !== false);

    const formatted: FormattedCategory[] = activeData.map((item) => {
        const desc = (item.description as any) || {};
        return {
            id: item.id,
            name: item.name || '',
            description: {
                zh: desc.zh || item.name || '',
                en: desc.en || '',
                ms: desc.ms || ''
            },
            code: item.code || '',
            sortOrder: item.sortOrder || 0,
        };
    });

    categoriesCache = formatted;
    cacheTime = now;
    return successResponse(c, formatted);
  })
  .post('/seed', async (c) => {
    const seedData = [
      { id: 1, code: 'chair', name: '椅子', sortOrder: 1, description: { zh: '椅子', en: 'Chair', ms: 'Kerusi' } },
      { id: 2, code: 'table', name: '桌子', sortOrder: 2, description: { zh: '桌子', en: 'Table', ms: 'Meja' } },
      { id: 3, code: 'bed', name: '床具', sortOrder: 3, description: { zh: '床具', en: 'Bed', ms: 'Katil' } },
      { id: 4, code: 'cabinet', name: '柜子', sortOrder: 4, description: { zh: '柜子', en: 'Cabinet', ms: 'Almari' } },
      { id: 5, code: 'office', name: '办公', sortOrder: 5, description: { zh: '办公', en: 'Office', ms: 'Pejabat' } },
      { id: 6, code: 'sofa', name: '沙发', sortOrder: 6, description: { zh: '沙发', en: 'Sofa', ms: 'Sofa' } },
      { id: 7, code: 'others', name: '其他', sortOrder: 7, description: { zh: '其他', en: 'Others', ms: 'Lain-lain' } }
    ];

    await seedCategories(seedData);
    categoriesCache = null;
    return successResponse(c, { message: 'Database seeded successfully' });
  })
  .post('/clear-photos', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ categoryId: v.number() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { categoryId } = check.output;
    const updatedIds = await clearPhotosFromCategory(categoryId);
    
    return successResponse(c, updatedIds.map(i => i.id));
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ categoryData: CategoryReqSchema }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { categoryData } = check.output;
    const data = await createCategory(categoryData);
    
    categoriesCache = null;
    return successResponse(c, data);
  })
  .put('/:id{[0-9]+}', async (c) => {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const check = v.safeParse(v.object({ updates: v.omit(CategoryReqSchema, ["id"]) }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { updates } = check.output;
    
    await updateCategory(id, updates);
    
    categoriesCache = null;
    return successResponse(c, null);
  })
  .delete('/:id{[0-9]+}', async (c) => {
    const id = parseInt(c.req.param('id'));
    await deleteCategory(id);
    
    categoriesCache = null;
    return successResponse(c, null);
  });
