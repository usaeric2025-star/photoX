const fs = require('fs');
const file = 'api/_handlers/photos/list.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\.post\('\/list', sValidator\('json', PhotoListReqSchema, \(result\) => \{[\s\S]*?\}\), async \(c\) => \{[\s\S]*?const params = c\.req\.valid\('json'\);/,
  `.post('/list', async (c) => {\n    const body = await c.req.json();\n    const check = v.safeParse(PhotoListReqSchema, body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const params = check.output;`
);

fs.writeFileSync(file, content);
