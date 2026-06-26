#!/bin/bash
echo "=== 檢查是否有 base64 流入 image_url ==="
psql $DATABASE_URL -c "
  SELECT COUNT(*) as base64_count 
  FROM furniture_items 
  WHERE image_url LIKE 'data:image/%';
" | grep -q "0" || echo "❌ 發現 base64 資料！"

echo "=== 檢查是否有超長標題 ==="
psql $DATABASE_URL -c "
  SELECT COUNT(*) as long_title_count 
  FROM furniture_items 
  WHERE char_length(name->>'zh') > 200 
     OR char_length(name->>'en') > 200 
     OR char_length(name->>'ms') > 200;
" | grep -q "0" || echo "❌ 發現超長標題！"
