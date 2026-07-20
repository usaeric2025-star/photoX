const fs = require('fs');
let file = 'api/_handlers/photos/detail.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const results = await db\.query\.furnitureItems\.findMany/,
  `console.log('Querying DB...');\n    const results = await db.query.furnitureItems.findMany`
);

content = content.replace(
  /return successResponse\(c, formatted\);/,
  `console.log('Query done, returning...');\n    return successResponse(c, formatted);`
);

fs.writeFileSync(file, content);
