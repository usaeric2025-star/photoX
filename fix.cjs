const fs = require('fs');

function fixList() {
  const file = 'api/_handlers/photos/list.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = "import { sValidator } from '@hono/standard-validator';\n" + content;
  content = content.replace(
    /\.post\('\/list', async \(c\) => \{\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(PhotoListReqSchema, body\);\n    if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n    const params = check\.output;/,
    `.post('/list', sValidator('json', PhotoListReqSchema, (result) => {\n    if (!result.success) {\n      const err = (result as any).error;\n      throw errorFactory.validation(err?.issues || []);\n    }\n  }), async (c) => {\n    const params = c.req.valid('json');`
  );
  fs.writeFileSync(file, content);
}
fixList();

function fixCategories() {
  const file = 'api/_handlers/categories.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = "import { sValidator } from '@hono/standard-validator';\n" + content;
  
  content = content.replace(
    /\.post\('\/clear-photos', async \(c\) => \{\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(v\.object\(\{ categoryId: v\.number\(\) \}\), body\);\n    if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n    const \{ categoryId \} = check\.output;/,
    `.post('/clear-photos', sValidator('json', v.object({ categoryId: v.number() }), (result) => {\n    if (!result.success) throw errorFactory.validation((result as any).error?.issues || []);\n  }), async (c) => {\n    const { categoryId } = c.req.valid('json');`
  );

  content = content.replace(
    /\.post\('\/', async \(c\) => \{\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(v\.object\(\{ categoryData: CategoryReqSchema \}\), body\);\n    if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n    const \{ categoryData \} = check\.output;/,
    `.post('/', sValidator('json', v.object({ categoryData: CategoryReqSchema }), (result) => {\n    if (!result.success) throw errorFactory.validation((result as any).error?.issues || []);\n  }), async (c) => {\n    const { categoryData } = c.req.valid('json');`
  );

  content = content.replace(
    /\.put\('\/:id\{\[0-9\]\+\}', async \(c\) => \{\n    const id = parseInt\(c\.req\.param\('id'\)\);\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(v\.object\(\{ updates: v\.omit\(CategoryReqSchema, \["id"\]\) \}\), body\);\n    if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n    const \{ updates \} = check\.output;/,
    `.put('/:id{[0-9]+}', sValidator('json', v.object({ updates: v.omit(CategoryReqSchema, ["id"]) }), (result) => {\n    if (!result.success) throw errorFactory.validation((result as any).error?.issues || []);\n  }), async (c) => {\n    const id = parseInt(c.req.param('id'));\n    const { updates } = c.req.valid('json');`
  );
  
  fs.writeFileSync(file, content);
}
fixCategories();

function fixManufacturers() {
  const file = 'api/_handlers/manufacturers.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = "import { sValidator } from '@hono/standard-validator';\n" + content;
  
  content = content.replace(
    /\.post\('\/clear-photos', async \(c\) => \{\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(v\.object\(\{ manufacturerId: v\.string\(\) \}\), body\);\n    if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n    const \{ manufacturerId \} = check\.output;/,
    `.post('/clear-photos', sValidator('json', v.object({ manufacturerId: v.string() }), (result) => {\n    if (!result.success) throw errorFactory.validation((result as any).error?.issues || []);\n  }), async (c) => {\n    const { manufacturerId } = c.req.valid('json');`
  );

  content = content.replace(
    /\.post\('\/', async \(c\) => \{\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(v\.object\(\{ manufacturerData: ManufacturerReqSchema \}\), body\);\n    if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n    const \{ manufacturerData \} = check\.output;/,
    `.post('/', sValidator('json', v.object({ manufacturerData: ManufacturerReqSchema }), (result) => {\n    if (!result.success) throw errorFactory.validation((result as any).error?.issues || []);\n  }), async (c) => {\n    const { manufacturerData } = c.req.valid('json');`
  );

  content = content.replace(
    /\.put\('\/:id\{\[0-9a-fA-F\]\{8\}\-\[0-9a-fA-F\]\{4\}\-\[0-9a-fA-F\]\{4\}\-\[0-9a-fA-F\]\{4\}\-\[0-9a-fA-F\]\{12\}\}', async \(c\) => \{\n    const id = c\.req\.param\('id'\);\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(v\.object\(\{ updates: v\.omit\(ManufacturerReqSchema, \["id"\]\) \}\), body\);\n    if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n    const \{ updates \} = check\.output;/,
    `.put('/:id{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}', sValidator('json', v.object({ updates: v.omit(ManufacturerReqSchema, ["id"]) }), (result) => {\n    if (!result.success) throw errorFactory.validation((result as any).error?.issues || []);\n  }), async (c) => {\n    const id = c.req.param('id');\n    const { updates } = c.req.valid('json');`
  );
  
  fs.writeFileSync(file, content);
}
fixManufacturers();

function fixTags() {
  const file = 'api/_handlers/tags.ts';
  let content = fs.readFileSync(file, 'utf8');
  content = "import { sValidator } from '@hono/standard-validator';\n" + content;

  content = content.replace(
    /\.put\('\/:id\{\[0-9\]\+\}', async \(c\) => \{\n    const id = parseInt\(c\.req\.param\('id'\)\);\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(v\.object\(\{ updates: v\.omit\(TagReqSchema, \["id"\]\) \}\), body\);\n    if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n    const \{ updates \} = check\.output;/,
    `.put('/:id{[0-9]+}', sValidator('json', v.object({ updates: v.omit(TagReqSchema, ["id"]) }), (result) => {\n    if (!result.success) throw errorFactory.validation((result as any).error?.issues || []);\n  }), async (c) => {\n    const id = parseInt(c.req.param('id'));\n    const { updates } = c.req.valid('json');`
  );

  content = content.replace(
    /\.post\('\/', async \(c\) => \{\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(v\.object\(\{ tagData: TagReqSchema \}\), body\);\n    if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n    const \{ tagData \} = check\.output;/,
    `.post('/', sValidator('json', v.object({ tagData: TagReqSchema }), (result) => {\n    if (!result.success) throw errorFactory.validation((result as any).error?.issues || []);\n  }), async (c) => {\n    const { tagData } = c.req.valid('json');`
  );

  content = content.replace(
    /\.post\('\/batch', async \(c\) => \{\n    const body = await c\.req\.json\(\);\n    const check = v\.safeParse\(v\.object\(\{ tags: v\.array\(TagReqSchema\) \}\), body\);\n    if \(!check\.success\) throw errorFactory\.validation\(check\.issues\);\n    const \{ tags: tagsData \} = check\.output;/,
    `.post('/batch', sValidator('json', v.object({ tags: v.array(TagReqSchema) }), (result) => {\n    if (!result.success) throw errorFactory.validation((result as any).error?.issues || []);\n  }), async (c) => {\n    const { tags: tagsData } = c.req.valid('json');`
  );

  fs.writeFileSync(file, content);
}
fixTags();

console.log('Fixed all.');
