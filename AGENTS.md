# PhotoX 核心開發規範 (2026-06 最終鎖定)

## 1. 核心技術棧
- **狀態管理**: 
  - URL 狀態 (唯一真相來源): `nuqs`
  - UI 瞬態 (如主題): `Storve (Signal)`
  - Server State: `TanStack Query` (`useAppQuery`), 寫入透過 `queryClient` 處理。
  - 選擇狀態: `SelectionService` (使用 `useIsMultiSelect`, `useSelectionActions` 等)
- **表單**: `@tanstack/react-form` + `Valibot` (取代 Zod/ArkType)
- **動畫**: `lite-sleek` (進出場/交錯) + 純 CSS (懸停/淡入)
- **路由**: `wouter`
- **後端**: Vercel Serverless + Hono (RPC)
- **數據庫**: PostgreSQL + Drizzle ORM (嚴禁手動寫 SQL)

## 2. 數據流與架構邊界
- **單向數據流**: URL → Hook → Component。禁止 `useEffect` 同步 URL ↔ Store。禁止使用 `useURLSync`。
- **Hook 導入**: 統一從 `src/hooks/` 導入，按領域分類 (`photo/`, `category/`, `tag/`, `group/`)。
- **API 路由**: 必須透過 Hono RPC (`hc`) 呼叫，嚴禁手動拼接 `/api/xxx`。

## 3. UI 與錯誤處理
- **效能控制**: 
  - **嚴禁使用 backdrop-blur**: 在燈箱 (Lightbox)、長列表、照片網格 (Photo Grid) 等效能敏感區域，嚴禁使用 `backdrop-blur` (毛玻璃) 濾鏡。統一使用帶透明度的實色背景 (如 `bg-black/80`)。
  - **動畫控制**: 複雜列表動畫必須使用 `lite-sleek` 或純 CSS，禁止在大規模 DOM 節點上使用高開銷的 JS 動畫。
- **錯誤處理**: 所有錯誤統一使用 `ErrorFactory.handle`，禁止 `console.error` 散落各處。
- **Toast**: 統一使用 `sonner` (`toast.success` 等)。
- **彈窗**: 使用 `src/components/ui/Modal.tsx` (基於原生 `<dialog>`)，嚴禁 createPortal 或 z-index 模擬。

## 4. 圖片載入 (Worker 唯一來源)
- **尺寸標準 (嚴格遵循)**:
  - **主圖 (燈箱/全屏)**: `getThumbnailUrl(key, 800)`
  - **中圖 (網格 MD 變體)**: `getThumbnailUrl(key, 400)`
  - **縮圖 (網格 SM 變體/軌道/卡片)**: `getThumbnailUrl(key, 120)`
- **加載策略**:
  - **優先級 (Priority)**: 視圖首屏前 12 張圖片、燈箱當前/相鄰圖片，必須設置 `priority={true}` 以優化 LCP。
  - **緩存一致性**: 必須傳入 `imageHash` 給 `getThumbnailUrl` 以支持 CDN 緩存刷新。
- **禁止直接使用 R2 原始 URL** (`image_url`) 作為縮圖。
- **組件規範**: 統一使用 `Image` 組件，利用其內置的骨架屏與漸進淡入效果。

## 5. ES Module 導入規範 (後端)
- 導入時**必須指定具體檔案與 `.js` 結尾** (如 `import { db } from '../_lib/db/index.js'`)。
- **禁止**導入目錄而不指定 `index.js`，以避免 `ERR_UNSUPPORTED_DIR_IMPORT`。

## 6. 清理與 Knip 規則 (嚴禁刪除入口檔案)
- **嚴禁刪除關鍵入口**：在使用 `knip` 或進行任何檔案/代碼清理時，**絕對禁止**刪除 `api/index.ts`、`server.ts` 等平台關鍵 Entry Points，即使清理工具誤將其判定為無效或未使用的檔案。
- **Vercel 簽名規範**：`api/index.ts` 必須採用 Vercel 推薦的 Named 導出（例如：`GET`, `POST`, `PUT`, `DELETE` 等，調用 `app.request(request)`），以防出現 Vercel 函數簽名警告及 504 請求掛起超時。
- **減少高頻請求**：盡可能避免添加額外的全量 `/count` 單獨高頻輪詢請求，應優先使用 list API 內含的 `total` 或本地/UI 狀態中的計數。
