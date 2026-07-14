const fs = require('fs');
let content = fs.readFileSync('src/features/ai/AICommands.ts', 'utf8');
content = content.replace("  // \n     context: 'analyzePhoto',\n    originalError: lastError\n  });", "");
fs.writeFileSync('src/features/ai/AICommands.ts', content);
