# PhotoX 核心開發規範 (2026-06 最終鎖定)

## 1. 核心技術棧
- **狀態管理**: 
  - URL 狀態 (唯一真相來源): `nuqs`
  - UI 瞬態 (如主題): `@preact/signals-react` (Signal)
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
- **UI 結構與導航規範**: 嚴禁未經批准擅自增加側邊欄 (Sidebar) 或底層導航欄等新結構。如有新增功能或跳轉連結的需求，**必須**統一整合進右上角的菜單 (Top-right menu / Header actions) 內，除非獲得用戶的明確批准。

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

## 路由配置规范（锁定）

### 规则 1：Admin 路径统一
- Admin 所有子路由用 `/:subpath*`（wouter 语法）
- 不要用 `/*`，不要用 `:subpath`（不带 `*`）
- 不要在 Admin 路由里写具体的子路径（如 `/admin/settings`），由内部路由处理

### 规则 2：新增页面
- 新增 Admin 子页面，在 AdminPage 内部添加，不要改 RouterOrchestrator
- 新增公开页面，在 PublicPage 内部添加

### 规则 3：禁止改动
- RouterOrchestrator.tsx 的路由配置部分 **禁止修改**
- 除非变更需要经过团队 review 并更新本规范

### 规则 4：测试验证
- 任何路由改动，必须测试：
  1. `/admin` 能打开
  2. `/admin/settings` 能打开
  3. `/admin/任意子路径` 都能打开
  4. `/` 能打开

## 7. 模組化、過度拆分與狀態管理規範 (避免過度設計與碎片化)

### 規則 1：拒絕微型文件與無意義的多層包裝
- **拒絕微型 Hook 檔案**：嚴禁為單一的 Query 或 Mutation 建立獨立的 React Hook 檔案。例如：分類（Category）的增、刪、改應統一合併至 `useCategoryMutations.ts`（或直接整合在 `useCategories.ts`）中，嚴禁拆分成 `useCategoryCreate.ts`、`useCategoryEdit.ts` 與 `useCategoryDelete.ts` 等多個微型檔案。
- **減少包裝轉發層級**：避免為了包裝而包裝。例如：`useSettingsManagement` 直接包裝 `useAdminCategory`，而 `useAdminCategory` 又包裝了多個微型的 `useCategory*` / `useTag*` 鉤子，這導致了極深的調用棧和碎片化。未來應將相近領域的邏輯在適當的領域 Hook（如 `useSettingsManagement`）內直接進行扁平化整合。

### 規則 2：三大狀態體系的嚴格邊界
- **URL 狀態 (唯一的視圖真相來源 - `nuqs`)**：
  - 適用場景：搜尋、篩選、分頁、多選 IDs (`selected`)、批量模式開關 (`batch`)。
  - 核心原則：禁止使用 `useEffect` 將 URL 狀態與本地 State / Store 進行二次同步。
- **UI 瞬態 (跨組件臨時交互 - `@preact/signals-react` via `useUI`)**：
  - 適用場景：全域 Dialog 開關、目前 Lightbox 投影片數據、主題、語系。
  - 核心原則：組件與 Hook 訂閱時，**必須**透過 `useUI(selector)` 或 `useSignal` 進行，嚴禁在元件內手動呼叫原始 Signal 的 `.subscribe()`，也嚴禁在元件 Render 流程中直接讀寫 `signal.value` 以防失去 React 的響應追蹤。
- **Server State (服務端狀態 - `TanStack Query`)**：
  - 適用場景：所有向後端 Hono RPC 請求的數據（分類、照片列表、標籤等）。
  - 核心原則：統一使用 `useAppQuery` 與 `useAppMutation` 管理，並透過 `useInvalidatePhotos` 統一調度快取失效。

### 規則 3：Hook 整合與扁平化原則
- 鼓勵「就近整合」而非「跨模組過度拆分」。如果某個 Hook 僅在單一功能（如 `PhotoEditDialog`）內部使用，且不具備全域通用性，應將其移入該 Feature 的子目錄（如 `src/features/photo-edit/hooks/`）或直接與組件放在一起，嚴禁隨意塞入全域 `src/hooks/` 目錄。

