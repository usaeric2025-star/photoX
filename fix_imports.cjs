const fs = require('fs');
const execSync = require('child_process').execSync;

const files = execSync('grep -rl "useRouterSafe()" src/ --include="*.tsx" --include="*.ts"').toString().split('\n').filter(Boolean);

files.forEach(file => {
   if (file === 'src/hooks/core/useRouterSafe.ts') return;
   let content = fs.readFileSync(file, 'utf8');
   if (!content.includes("import { useRouterSafe }")) {
      content = "import { useRouterSafe } from '@/hooks/core/useRouterSafe';\n" + content;
      fs.writeFileSync(file, content);
      console.log("Fixed import: " + file);
   }
});
