#!/bin/bash
# 检查禁止使用的样式 (护栏机制)

echo "=== 检查禁止使用的样式 (护栏机制) ==="

# 检查 backdrop-blur (性能敏感)
if grep -rn "backdrop-blur" src/ | grep -v "OverlayLayer.tsx" | grep -v "index.css"; then
  echo "❌ 发现禁止使用的 'backdrop-blur'! 请使用 OverlayLayer 组件或实色背景。"
  exit 1
fi

# 检查 glass-header / glass-morphism (已弃用)
if grep -rnE "glass-header|glass-morphism" src/ | grep -v "index.css"; then
  echo "❌ 发现已弃用的 'glass-header' 或 'glass-morphism'! 请使用 sticky-header-surface 或 surface-overlay-solid。"
  exit 1
fi

echo "✅ 样式检查通过"
exit 0
