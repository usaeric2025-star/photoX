# PhotoX 核心開發規範 (2026-06 最終鎖定)

## 1. 核心技術棧
- **狀態管理**: 
  - URL 狀態 (唯一真相來源): `nuqs`
  - UI 瞬態 (如主題): `Storve (Signal)`
  - Server State: `SWR` (`useAppQuery`)，寫入必須透過 mutate 處理樂觀更新。
  - 選擇狀態: `SelectionService` (使用 `useIsMultiSelect`, `useSelectionActions` 等)
- **表單**: `@tanstack/react-form` + `Valibot` (取代 Zod/ArkType)
- **動畫**: `lite-sleek` (進出場/交錯) + 純 CSS (懸停/淡入)
- **路由**: `Chicane`
- **後端**: Vercel Serverless + Hono (RPC)
- **數據庫**: PostgreSQL + Drizzle ORM (嚴禁手動寫 SQL)

## 2. 數據流與架構邊界
- **單向數據流**: URL → Hook → Component。禁止 `useEffect` 同步 URL ↔ Store。禁止使用 `useURLSync`。
- **Hook 導入**: 統一從 `src/hooks/` 導入，按領域分類 (`photo/`, `category/`, `tag/`, `group/`)。
- **API 路由**: 必須透過 Hono RPC (`hc`) 呼叫，嚴禁手動拼接 `/api/xxx`。

## 3. UI 與錯誤處理
- **錯誤處理**: 所有錯誤統一使用 `ErrorFactory.handle`，禁止 `console.error` 散落各處。
- **Toast**: 統一使用 `sonner` (`toast.success` 等)。
- **彈窗**: 使用 `src/components/ui/Modal.tsx` (基於原生 `<dialog>`)，嚴禁 createPortal 或 z-index 模擬。

## 4. 圖片載入 (Worker 唯一來源)
- 圖片 URL 必須透過 `getThumbnailUrl(key, width)` 產生：
  - 主圖 (如燈箱): `getThumbnailUrl(key, 800)`
  - 縮圖 (如軌道/卡片): `getThumbnailUrl(key, 120)`
- **禁止**直接使用 R2 原始 URL (`image_url`) 作為縮圖。
- 圖片元件統一使用 `Image` 組件 (支援骨架屏漸進淡入)。

## 5. ES Module 導入規範 (後端)
- 導入時**必須指定具體檔案與 `.js` 結尾** (如 `import { db } from '../_lib/db/index.js'`)。
- **禁止**導入目錄而不指定 `index.js`，以避免 `ERR_UNSUPPORTED_DIR_IMPORT`。
