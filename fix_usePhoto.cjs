const fs = require('fs');
let file = 'src/hooks/photo/usePhotos.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const res = await api\.photos\['by-ids'\]\.\$post\(\{ json: \{ ids: \[id\] \} \}\);\s*if \(\!res\.ok\) throw new Error\("Fetch failed"\);\s*const data = await res\.json\(\) as any;\s*console\.log\("Fetched photo data", data\);\s*return data\.success && data\.data\[0\] \? mapSupabasePhoto\(data\.data\[0\]\) : null;/m,
  `const rawData = await ErrorFactory.unwrap<any>(\n        api.photos['by-ids'].$post({ json: { ids: [id] } }),\n        'Failed to fetch photo details'\n      );\n      return rawData && rawData[0] ? mapSupabasePhoto(rawData[0]) : null;`
);

fs.writeFileSync(file, content);
