const fs = require('fs');

let file = 'api/_handlers/categories.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /\.put\('\/:id\{\[0-9\]\+\}', sValidator\('json', v\.object\(\{ updates: v\.omit\(CategoryReqSchema, \["id"\]\) \}\), \(result\) => \{[\s\S]*?\}\), async \(c\) => \{[\s\S]*?const \{ updates \} = c\.req\.valid\('json'\);/,
  `.put('/:id{[0-9]+}', async (c) => {\n    const id = parseInt(c.req.param('id'));\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ updates: v.omit(CategoryReqSchema, ["id"]) }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { updates } = check.output;`
);
fs.writeFileSync(file, content);

file = 'api/_handlers/manufacturers.ts';
content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /\.put\('\/:id\{\[0-9a-fA-F\]\{8\}\-\[0-9a-fA-F\]\{4\}\-\[0-9a-fA-F\]\{4\}\-\[0-9a-fA-F\]\{4\}\-\[0-9a-fA-F\]\{12\}\}', sValidator\('json', v\.object\(\{ updates: v\.omit\(ManufacturerReqSchema, \["id"\]\) \}\), \(result\) => \{[\s\S]*?\}\), async \(c\) => \{[\s\S]*?const \{ updates \} = c\.req\.valid\('json'\);/,
  `.put('/:id{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}', async (c) => {\n    const id = c.req.param('id');\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ updates: v.omit(ManufacturerReqSchema, ["id"]) }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { updates } = check.output;`
);
fs.writeFileSync(file, content);

file = 'api/_handlers/tags.ts';
content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /\.post\('\/', sValidator\('json', v\.object\(\{ tagData: TagReqSchema \}\), body\);\n\s*if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n\s*const \{ tagData \} = check\.output;/,
  `.post('/', async (c) => {\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ tagData: TagReqSchema }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { tagData } = check.output;`
);
// In case the tags.ts regex above doesn't match perfectly, let's just write a more robust one or see how it looks.

fs.writeFileSync(file, content);
