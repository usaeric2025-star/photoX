const fs = require('fs');

function replaceInFile(path, oldStr, newStr) {
  if (fs.existsSync(path)) {
    let code = fs.readFileSync(path, 'utf8');
    code = code.replace(new RegExp(oldStr, 'g'), newStr);
    fs.writeFileSync(path, code);
  }
}

replaceInFile('src/hooks/photo/usePhotoAI.ts', "'#src/services/tag/completion.js'", "'#src/features/ai/tagCompletion.js'");
replaceInFile('src/features/ai/orchestration.ts', "'#src/services/tag/completion.js'", "'./tagCompletion.js'");

