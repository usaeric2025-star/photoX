const fs = require('fs');
let code = fs.readFileSync('src/features/ai/orchestration.ts', 'utf8');

code = code.replace(
  "if (tagsRes.ok) allTags = (await tagsRes.json()) as Tag[];",
  "if (tagsRes.ok) { const json = await tagsRes.json() as any; allTags = (json.data || json) as Tag[]; }"
);

code = code.replace(
  "if (catsRes.ok) categories = (await catsRes.json()) as Category[];",
  "if (catsRes.ok) { const json = await catsRes.json() as any; categories = (json.data || json) as Category[]; }"
);

fs.writeFileSync('src/features/ai/orchestration.ts', code, 'utf8');
