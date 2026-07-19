const fs = require('fs');
const file = 'api/_handlers/manufacturers.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { sValidator } from '@hono/standard-validator';\n", "");
content = content.replace("import { errorResponse, successResponse } from '../_lib/response.js';", "import { errorResponse, successResponse } from '../_lib/response.js';\nimport { errorFactory } from '../_lib/error/factory.js';");

content = content.replace(
  /\.post\('\/clear-photos', sValidator\('json', v\.object\(\{ manufacturerId: v\.string\(\) \}\)\), async \(c\) => \{[\s\S]*?const \{ manufacturerId \} = c\.req\.valid\('json'\);/,
  `.post('/clear-photos', async (c) => {\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ manufacturerId: v.string() }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { manufacturerId } = check.output;`
);

content = content.replace(
  /\.post\('\/', sValidator\('json', v\.object\(\{ manufacturerData: ManufacturerReqSchema \}\)\), async \(c\) => \{[\s\S]*?const \{ manufacturerData \} = c\.req\.valid\('json'\);/,
  `.post('/', async (c) => {\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ manufacturerData: ManufacturerReqSchema }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { manufacturerData } = check.output;`
);

content = content.replace(
  /\.put\('\/:id\{.*?\}', sValidator\('json', v\.object\(\{ updates: v\.omit\(ManufacturerReqSchema, \["id"\]\) \}\)\), async \(c\) => \{[\s\S]*?const id = c\.req\.param\('id'\);[\s\S]*?const \{ updates \} = c\.req\.valid\('json'\);/,
  `.put('/:id{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}', async (c) => {\n    const id = c.req.param('id');\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ updates: v.omit(ManufacturerReqSchema, ["id"]) }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { updates } = check.output;`
);

fs.writeFileSync(file, content);
console.log('Manufacturers patched');
