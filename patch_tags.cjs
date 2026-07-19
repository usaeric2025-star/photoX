const fs = require('fs');
const file = 'api/_handlers/tags.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { sValidator } from '@hono/standard-validator';\n", "");

content = content.replace(
  /\.put\('\/:id\{\[0-9\]\+\}', sValidator\('json', v\.object\(\{ updates: v\.omit\(TagReqSchema, \["id"\]\) \}\)\), async \(c\) => \{[\s\S]*?const id = parseInt\(c\.req\.param\('id'\)\);[\s\S]*?const \{ updates \} = c\.req\.valid\('json'\);/,
  `.put('/:id{[0-9]+}', async (c) => {\n    const id = parseInt(c.req.param('id'));\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ updates: v.omit(TagReqSchema, ["id"]) }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { updates } = check.output;`
);

content = content.replace(
  /\.post\('\/', sValidator\('json', v\.object\(\{ tagData: TagReqSchema \}\)\), async \(c\) => \{[\s\S]*?const \{ tagData \} = c\.req\.valid\('json'\);/,
  `.post('/', async (c) => {\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ tagData: TagReqSchema }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { tagData } = check.output;`
);

content = content.replace(
  /\.post\('\/batch', sValidator\('json', v\.object\(\{ tags: v\.array\(TagReqSchema\) \}\)\), async \(c\) => \{[\s\S]*?const \{ tags: tagsData \} = c\.req\.valid\('json'\);/,
  `.post('/batch', async (c) => {\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ tags: v.array(TagReqSchema) }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { tags: tagsData } = check.output;`
);

fs.writeFileSync(file, content);
console.log('Tags patched');
