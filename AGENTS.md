# PhotoX 核心開發規範 (2026-06 精簡版)

## 核心技術棧 (嚴格鎖定)
- 狀態管理：Storve (UI 瞬態), URL State (篩選), SWR (Server State)
- 表單：@tanstack/react-form + Valibot
- 動畫：lite-sleek (進出場) + CSS (懸停/淡入)
- 路由：Chicane
- 後端：Vercel Serverless + Hono (RPC)
- 數據庫：PostgreSQL + Drizzle ORM

## 動畫與過渡 (2026-06 鎖定)
- ✅ 懸浮/點擊反饋 (Hover/Active) & 圖片載入淡入: **使用純 CSS** (如 `hover:scale-105`, `transition-opacity`)，因為簡單高效。
- ✅ 進出場控制 & 複雜交錯動畫: **使用 lite-sleek** (如燈箱、彈窗的 `AnimatePresence`, 照片牆交錯)。

## 狀態管理邊界 (鎖定)
1. **SWR (`useAppQuery`)**: 唯一負責 Server State。寫入操作必須透過 SWR 的 `mutate` 處理樂觀更新。
2. **Storve (`createStore`)**: 僅負責 UI 瞬態 (如主題、燈箱索引)。**嚴禁**雙寫 Server State。
3. **URL State**: 負責所有篩選條件與視圖模式。

## 資料庫與驗證 (鎖定)
- 唯一驗證源：Valibot Schema (取代 Zod/ArkType)。
- 數據表變更：**必須**透過 Drizzle schema 變更並 `drizzle-kit generate`，**嚴禁**手動寫 SQL。

## UI 組件規範
- 彈窗：使用 `src/components/ui/Modal.tsx` (基於原生的 `<dialog>`)。**嚴禁**使用 createPortal 或 z-index 模擬。
- 圖片：統一使用 `Image` 組件 (骨架屏 -> 漸進淡入)。

## API 路由
- 必須透過 Hono RPC (`hc`) 呼叫，嚴禁手動拼接 `/api/xxx`。
