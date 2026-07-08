#!/bin/bash
# scripts/check-all.sh

echo "=== 1. TypeScript 類型檢查 (前端) ==="
npx tsc --noEmit || exit 1

echo "=== 2. TypeScript 類型檢查 (後端) ==="
npx tsc --noEmit -p tsconfig.api.json || exit 1

echo "=== 3. Drizzle Schema 檢查 ==="
npx drizzle-kit check || exit 1

echo "=== 4. ESLint 檢查 ==="
npm run lint || exit 1

echo "=== 5. Knip 死代碼檢查 ==="
npx knip || exit 1

echo "=== 6. Bundle 分析（僅警告不阻止） ==="
npx vite build --mode analyze

echo "✅ 所有檢查通過！"
