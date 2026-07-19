const fs = require('fs');
let file = 'api/_handlers/tags.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\.put\('\/:id\{\[0-9\]\+\}', async \(c\) => \{\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(v\.object\(\{ updates: v\.omit\(TagReqSchema, \["id"\]\) \}\), \(result\) => \{\n    if \(!result\.success\) throw errorFactory\.validation\(\(result as any\)\.error\?\.issues \|\| \[\]\);\n  \}\), async \(c\) => \{\n    const id = parseInt\(c\.req\.param\('id'\)\);\n    const \{ updates \} = c\.req\.valid\('json'\);/,
  `.put('/:id{[0-9]+}', async (c) => {\n    const id = parseInt(c.req.param('id'));\n    const body = await c.req.json();\n    const check = v.safeParse(v.object({ updates: v.omit(TagReqSchema, ["id"]) }), body);\n    if (!check.success) throw errorFactory.validation(check.issues);\n    const { updates } = check.output;`
);

fs.writeFileSync(file, content);
