import { execSync } from 'child_process';

const result = execSync(
  'grep -r "from \'\\\\./[^\']*[^\\\\.js]\'" api/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null || echo ""',
  { encoding: 'utf-8' }
);

if (result.trim()) {
  console.error('❌ 以下导入缺少 .js 扩展名：');
  console.error(result);
  process.exit(1);
} else {
  console.log('✅ 所有导入都有 .js 扩展名');
}
