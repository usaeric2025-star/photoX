#!/bin/bash
echo "=========================================="
echo "Zustand / getState 殘留全面盤點"
echo "=========================================="

# ============================================
# 1. getState 調用
# ============================================
echo ""
echo "=== 1. getState 調用 ==="
grep -rn "getState" src/ --include="*.ts" --include="*.tsx" 2>/dev/null

# ============================================
# 2. setState 調用（Zustand 風格）
# ============================================
echo ""
echo "=== 2. setState 調用 ==="
grep -rn "setState" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "React\|useState"

# ============================================
# 3. Zustand 導入語句
# ============================================
echo ""
echo "=== 3. Zustand 導入 ==="
grep -rn "from ['\"]zustand" src/ --include="*.ts" --include="*.tsx" 2>/dev/null

# ============================================
# 4. Zustand 風格的 Selector
# ============================================
echo ""
echo "=== 4. Zustand 風格 Selector ((state) => state.xxx) ==="
grep -rn "(state) => state\." src/ --include="*.ts" --include="*.tsx" 2>/dev/null

# ============================================
# 5. useStore / useUIStore / useAuthStore（Zustand 風格）
# ============================================
echo ""
echo "=== 5. Zustand 風格 Hook 使用 ==="
grep -rn "useStore\|useUIStore\|useAuthStore\|useTaskStore" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "lib/store"

# ============================================
# 6. package.json 中的 zustand
# ============================================
echo ""
echo "=== 6. package.json Zustand 依賴 ==="
grep -n "zustand" package.json 2>/dev/null

# ============================================
# 7. 直接導入 store/uiStore（繞過 @/lib/store）
# ============================================
echo ""
echo "=== 7. 直接導入 Store 檔案 ==="
grep -rn "from.*store/uiStore\|from.*store/authStore\|from.*store/taskStore" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "lib/store"

# ============================================
# 8. .state 模式（Zustand 遺留風格）
# ============================================
echo ""
echo "=== 8. .state 存取模式 ==="
grep -rn "\.state\." src/ --include="*.ts" --include="*.tsx" 2>/dev/null

echo ""
echo "=========================================="
echo "盤點完成"
echo "=========================================="
