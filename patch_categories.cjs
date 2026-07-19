const fs = require('fs');
const file = 'api/_handlers/categories.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { sValidator } from '@hono/standard-validator';\n", "");
content = content.replace("import { errorResponse, successResponse } from '../_lib/response.js';", "import { errorResponse, successResponse } from '../_lib/response.js';\nimport { errorFactory } from '../_lib/error/factory.js';");

content = content.replace(
  /\.post\('\/clear-photos', sValidator\('json', v\.object\(\{ categoryId: v\.number\(\) \}\)\), async \(c\) => \{[\s\S]*?const \{ categoryId \} = c\.req\.valid\('json'\);/,
  `.post('/clear-photos', async (c) => {\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ categoryId: v.number() }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { categoryId } = check.output;`
);

content = content.replace(
  /\.post\('\/', sValidator\('json', v\.object\(\{ categoryData: CategoryReqSchema \}\)\), async \(c\) => \{[\s\S]*?const \{ categoryData \} = c\.req\.valid\('json'\);/,
  `.post('/', async (c) => {\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ categoryData: CategoryReqSchema }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { categoryData } = check.output;`
);

content = content.replace(
  /\.put\('\/:id\{\[0-9\]\+\}', sValidator\('json', v\.object\(\{ updates: v\.omit\(CategoryReqSchema, \["id"\]\) \}\)\), async \(c\) => \{[\s\S]*?const id = parseInt\(c\.req\.param\('id'\)\);[\s\S]*?const \{ updates \} = c\.req\.valid\('json'\);/,
  `.put('/:id{[0-9]+}', async (c) => {\n    const id = parseInt(c.req.param('id'));\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ updates: v.omit(CategoryReqSchema, ["id"]) }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { updates } = check.output;`
);

fs.writeFileSync(file, content);
console.log('Categories patched');
