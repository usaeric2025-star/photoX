const fs = require('fs');

function replaceInFile(path, oldStr, newStr) {
  if (fs.existsSync(path)) {
    let code = fs.readFileSync(path, 'utf8');
    code = code.replace(new RegExp(oldStr, 'g'), newStr);
    fs.writeFileSync(path, code);
  }
}

replaceInFile('src/components/admin/FormShared.tsx', '"#src/services/category/utils.js"', '"#src/utils/category.js"');
replaceInFile('src/features/photo-edit/CategorySelect.tsx', '"#src/services/category/utils.js"', '"#src/utils/category.js"');
replaceInFile('src/features/filters/CategoryGrid.tsx', "'#src/services/category/utils.js'", "'#src/utils/category.js'");

