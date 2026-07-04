#!/bin/bash
# 檢查 ES Module 目錄導入
echo "=== 檢查 ES Module 目錄導入 ==="
if grep -rn "import .* from '..[^']*[^.][^j][^s]';" src/server/ 2>/dev/null; then
  echo "❌ 發現缺少 .js 結尾的導入"
  exit 1
else
  echo "✅ 無目錄導入"
  exit 0
fi
