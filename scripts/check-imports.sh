#!/bin/bash
echo "=== 檢查 ES Module 目錄導入 ==="

# We search for imports ending with a directory (no trailing .js / specific file)
if grep -rn "from.*_lib/[^']*$" api/ --include="*.ts" 2>/dev/null | grep -v "index\.js" | grep -v "client\.js"; then
  echo "❌ 發現目錄導入，請修正為具體檔案路徑 (例如: ../_lib/db/index.js)"
  exit 1
fi

echo "✅ 無目錄導入"
