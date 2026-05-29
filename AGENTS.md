---
description: PhotoX 项目 AI 编码强制规范。所有代码生成、修改、审查必须严格遵守此文件。违反红线的代码将被拒绝。
globs: ["src/**/*.{ts,tsx}"]
alwaysApply: true
version: "3.5"
lastSynced: "2026-05-27"
sourceOfTruth: "ARCHITECTURE.md"
---

# PhotoX AI Coding Rules v3.5 (v2.7 AI-Native Validator Edition)

> ⚠️ 本文件是 `ARCHITECTURE.md` 的執行層精簡版。詳細設計原理請參閱原文档。
> 🔄 更新 `ARCHITECTURE.md` 後，必須同步更新本文件，并在 commit 中标注 `[rules-sync]`。

## 🔴 绝对红线（违反即阻断）

### 数据与命名
- 数据库映射字段 **必须** `snake_case`（`is_hidden`, `group_id`, `category_id`）
- **严禁** camelCase（`isHidden`, `groupId`）
- 数据匹配/过滤 **仅允许** 使用 `id`，**严禁** 使用 `name`

### 异步与状态
- 异步操作 **必须** `runTask('名称', asyncFn, options)`
- **严禁** `useState(loading)` + `try/catch` + `toast/console.error` 手动组合
- UI 状态用 Zustand（**必须** `useShallow`），**严禁** 存业务数据或函数
- 业务数据 **必须** TanStack Query，**严禁** Zustand 存储

### 写入与删除
- 写操作 **仅允许** 通过 `photoMutationService` / `groupMutationService`
- **严禁** 组件/Hook 中直接调用 `supabase.from(...)`
- 删除确认 **必须** `<AlertDialog>`，输入弹窗 **必须** `<PromptDialog>`
- **严禁** 原生 `confirm()` / `alert()` / `setConfirmDialog`

### 反馈与配置
- 反馈 **必须** `useFeedback()` 导出的方法（`showSuccess` / `showError` / `handleError`）
- **严禁** 直接调用 `toast.success()` / `toast.error()`
- 用户可配置项 **必须** 从 settings/DB 读取，**严禁** 硬编码或设默认值

### 渲染与布局
- Virtuoso 内图片 **必须** `loading="eager" decoding="async"`，**严禁** `lazy`
- 浮动工具栏/弹窗 **必须** `fixed bottom-0 left-0 right-0 flex justify-center` + z-index token
- **严禁** `absolute inset-0`（Virtuoso 内会随滚动丢失）
- **严禁** 使用 `transform: translateX(-50%)` 进行居中（避免层叠上下文与模糊问题）
- Admin/Public 差异 **必须** variant prop，**严禁** 两套独立组件
- Hook < 150 行，组件 < 250 行

### 任务静默性分级与双模错误治理规范 🆕
- **Light 任务行为规范**：非上传/批量 AI 识别等属于 Light 任务。
  - ❌ 严禁弹出任务面板 / 进度条。
  - ✅ 成功必须完全静默（无 Sonner、无 Toast，直接展现乐观更新）。
  - ✅ 失败通过单条 Sonner + 详细原因回馈（直接从 backend 提取或映射字典，非模糊提示）。
  - ✅ 所有操作结果全量写入后台日志（`logResult`, `logError`）。
- **Heavy 任务行为规范**：上传、批量 AI 识别、管理员导入等属于 Heavy 任务。
  - ✅ 保留任务面板与進度展示。
  - ✅ 完成后使用单量 Sonner 面板汇总（e.g. "批量识别完成：成功 X 张，失败 Y 张"）。
  - ✅ 全量结果均记录至后台。

### AI 批量任务容错与降級规范 🆕
- 必须实现**指数退避重试**：基础延迟 1s，最大重试 3 次，抖动 ±500ms。
- 连续 429 超过 2 次时自动降级并发数（如由 Concurrency 3 降级为 2 → 1），保证有限网络下服务可用。
- 单张重试耗尽后在后台标记 `ai_failed` 并保留错误提示，**绝不阻断整体批次**。
- ❌ 严禁无限重试或固定硬编码延迟。

### 图片尺寸分级规范（纯 R2 预生成）🆕
- 照片墙：thumbnail_sm (w=300 WebP)
- 合组/详情：thumbnail_md (w=800 WebP)
- ✅ 必须通过 ResponsivePhoto 组件加载
- ❌ 严禁使用 next/image / Vercel Image Optimization
- ❌ 严禁缺失尺寸时回源原图或触发实时优化
- 缺失中间档时直接 fallback 至小缩略图

### Virtuoso 防死循環剛性契約（永久生效，v3.0 升級）
- ✅ **全员强制**：所有虚拟滚动必须使用 `@/components/virtualizer/VirtualGrid`。
- ✅ **嚴禁** 直接 import `react-virtuoso`，ESLint 已配置強制攔截。
- ✅ ResponsivePhoto 必須接收固定 width/height，渲染剛性容器
- ✅ 圖片通過 CSS object-fit 自適應，嚴禁觸發佈局重排
- ✅ Virtuoso 配置：單列 <Virtuoso> 可配置 skipAnimationFrameInResizeObserver；<VirtuosoGrid> 嚴禁使用此屬性
- ❌ 嚴禁在 Virtuoso 子元素中使用 onLoad/onError 改變容器尺寸
- ❌ 嚴禁在 Virtuoso 子元素中使用漸顯/過渡動畫改變佈局屬性
- ❌ 嚴禁對 Virtuoso 子元素啟用 ResizeObserver 動態測量
- ❌ 嚴禁圖片失敗時回退原圖或動態尺寸資源
- 違反此契約即視為 P0 架構違規，PR 必須阻斷

### ErrorBoundary 智能診斷與自動恢復契約 (v3.0) 🆕
- ✅ **智能診斷**：ErrorBoundary 必須結構化輸出 `[EB-DIAG]` 日誌，包含精確 source 與 trigger。
- ✅ **自動恢復**：ErrorBoundary 必須提供「重試 / Retry」按鈕，支持組件級局部恢復。
- ✅ **靜態 Fallback**：Fallback 必須是純靜態 JSX，嚴禁使用任何 Hook、Context 或業務組件。
- ✅ **主動上報**：支持 `ErrorBoundary.report(error, context)` 靜態方法進行非組件異常上報。

### AI 紀律與幻覺防禦契約 (v3.0) 🆕
- ✅ **降級優先**：當人類下達「降級/隔離」指令時，AI 禁止任何形式的「修復嘗試」，必須優先執行物理隔離。
- ✅ **自動隔離觸發**：連兩次違抗指令或修復失敗後，AI 必須主動提議或執行路由級/組件級物理隔離。
- ✅ **恢復權限歸人類**：所有手動隔離措施（如 `ADMIN_GALLERY_DISABLED`）必須由人類明確解除，AI 無權自主恢復。
- ✅ **幻覺防禦**：任何聲稱「修復完成」的輸出必須附帶人類可驗證的證據（如 [EB-DIAG] 日誌、tsc 通過截圖、邏輯映射）。
- ✅ **人類錨點模式**：連續兩次修復失敗後，強制切換至「降級 + 人類錨點」模式，禁止自主診斷。
- ❌ **嚴禁自主恢復**：在未提供驗證證據的情況下，禁止 AI 宣稱問題已解決。

### ⚠️ VirtualGrid 封裝純度與測試契約

-   **嚴禁業務注入**：`VirtualGrid` 僅作協議統一載體，嚴禁注入任何業務邏輯、狀態或副作用（如 groupId、isAdminMode、photos 過濾等）。所有業務適配必須在調用方完成。
-   **測試與文檔同步**：修改 `VirtualGrid` 時必須同步更新 vitest 測試與 JSDoc `@remarks` 契約標註。無測試覆蓋的變更不予合併。
-   **AI 生成約束**：AI 生成的 `VirtualGrid` 相關代碼必須通過 ESLint + tsc + vitest 三重校驗，任一失敗即視為違規。
-   **適配層使用規範**：必須遵守 `VirtualGrid` 定義的props契約，嚴禁使用未導出的底層實現。原子文件（interactionTypes 等）職責單一。
-   **交互狀態契約**：所有交互狀態必須存儲於 interactionBus Ref，嚴禁 useState/useContext；視覺反饋必須用 CSS data 屬性，嚴禁條件 className。
-   ✅ 移除 useContext 後，必須全局搜索該 Context 提供的所有字段名，確保無殘留引用
-   **行渲染器結構化封包 (v2.5)**：`VirtualGrid` 的行渲染邏輯必須封裝在 `VirtualGridRow` 內部組件中，禁止將行內計算及列索引對齊邏輯提取為獨立導出或在行容器外使用。任何重構必須保持 `VirtualGridRow` 的原子性。

### ⚠️ 圖片渲染契約

-   ✅ 所有圖片必須使用 loading="lazy" decoding="async" fetchpriority="low"
-   ✅ 圖片尺寸必須用 CSS aspect-ratio 控制，嚴禁 JS 計算
-   ✅ 圖片容器必須啟用 content-visibility: auto + contain-intrinsic-size
-   ✅ R2 圖片 URL 必須通過數據管道生成，嚴禁字符串拼接

### ⚠️ 數據管道契約

-   **QueryKey 工廠化與新鮮度契約 (v2.11) 🆕**：所有資源 Key 必須通過 `src/lib/queryKeys.ts` 中的工廠函數生成，嚴禁裸字符串拼接。所有新查詢必須強制使用 `createQueryKey` / 內置函數 + `createStaleTime(policy)`，嚴禁硬編碼 `staleTime` 數字。 [AI-FRESHNESS-CONTRACT-ANCHORED]
-   ** Selector 模組化**：Selector 必須是模塊級純函數（`src/lib/selectors/*.ts`），禁止在組件內定義或依賴組件狀態。
-   **數據歸一化防線**：所有進入 VirtualGrid 的數據（如通過 `flattenPhotoInfiniteQueryPages`）必須進行去重與 ID 合法性校驗，嚴禁髒數據穿透。
-   **[NEW] APF (AI-Protocol-Friendly) 驗證契約**: 
    - 數據寫入/修改前 **必須** 通過 `Validator<T>` 協議進行驗證。
    - Validator 必須實現 `serialize()` 方法以向 AI 暴露元數據（fields, hints）。
    - 對於複雜 schema，必須使用工廠函數（如 `createPhotoValidator`）生成，嚴禁在業務邏輯中裸寫驗證規則。
-   **數據歸一化路由契約** 🆕：分頁數據與扁平數據必須使用不同的歸一化函數（`flattenPhotoInfiniteQueryPages` vs `normalizeAdminPhotos`）。禁止將扁平數組傳入分頁歸一化函數。新增歸一化函數必須通過結構一致性測試。

### ⚠️ 樣式與交互預算契約 (v2.7) 🆕

- ✅ **clsx + tw-merge 整合**：所有類名拼接 **必須** 通過 `@/lib/utils.ts` 中的 `cn()` 函數，嚴禁裸寫模板字符串或 `+` 號拼接。
- ✅ **Sonner 統一調度**：所有 Toast 通知 **必須** 通過 `@/lib/ui/toast.ts` 入口，嚴禁直接 import `sonner`。
- ✅ **Light Task 靜默法則**：成功操作嚴禁彈出 Toast，僅在失敗時顯示帶診斷按鈕的 Error Toast。

### ⚠️ AI-Native Validator 協議與元數據契約 (v2.7) 🆕

- ✅ **APF 核心**：數據寫入前 **必須** 通過 `Validator<T>` 接口驗證。
- ✅ **元數據驅動**：AI 應主動調用 `serialize()` 獲取字段約束與維護提示（aiHints），確保生成代碼與 DB 映射 100% 一致。
- ✅ **分區隔離**：Validator 實現（如 ArkType）必須封裝在 `src/lib/validators/engines/` 中，業務代碼僅感知協議。
- ✅ **契約測試**：任何 Schema 變動必須同步更新 `validatorParity.test.ts` 並確保 32/32 Diagnostics PASSED。

### ⚠️ 全域 ErrorBoundary 安全契約

-   ✅ ErrorBoundary fallback 必須是純靜態 JSX，嚴禁任何動態內容
-   ✅ componentDidCatch 嚴禁 setState / 副作用 / 組件渲染
-   ✅ 同一渲染鏈路禁止多層 EB 嵌套
-   ✅ 所有新增 ErrorBoundary 必須通過隔離測試驗收
-   ✅ Admin Diagnostics 檢測項必須覆蓋所有 P1 審計發現
-   ✅ 新增檢測項時必須同步更新 diagnosticRegistry
-   ✅ Semua Admin Diagnostics Panel 必須保持 Lazy Loaded + 三層安全鎖
-   ✅ 禁止在生產構建中包含診斷面板代碼
-   ✅ [已完成] P2-2 Admin Diagnostics 基礎設施已集成
-   ✅ 後續所有 P2/P3 修復項必須補充對應 diagnosticRegistry 檢測項
-   ✅ VirtualGrid 任何重構前必須先通過 Lanes 專項基準測試
-   ✅ P2-3 Step 1 基準測試確認：11/11 測試通過，維持 JV v3 + 原生 computeLaneIndex，暫不升級 v5
-   ✅ P2-3 最終決策：維持 JV v3，自研 computeLaneIndex 封裝，11/11 基準測試通過
-   ✅ VirtualGrid lanes 已標記為「已知技術債，待 JV v5 穩定後重新評估」
-   ✅ 升級 JV 前必須先通過 Admin Diagnostics 11/11 基準測試
-   ✅ [已完成] P2-4 Detail Fix (v2.5) 自研組件防禦加固與細節修復已完工
-   ✅ [CONTRACT] 自研組件契約：自研組件（如 VirtualGrid / computeLaneIndex）必須使用 JSDoc @contract 標記不變量，測試用例全數加註 [CONTRACT] 前綴，並在 DOM 加 data-contract 屬性錨點
-   ✅ [CONTRACT] AI 行為規範：AI 在修改或重構自研組件前，必須先讀取並嚴格驗證其 @contract 聲明的不變量不被破壞
-   ✅ 視覺對齊優化：對 PhotoCard 文字區追加固定高度容器，並以 align-content: end 完成物理基線一致，修復次像素裂縫
-   ⏳ 儲存治理標記：Storage 寫入治理與進階查詢優化留待明日執行，已在 store.ts 建立 @storage-contract 標記作為 AI 可識別錨點
-   ✅ P2-4 基準測試：註冊檢測項及 [CONTRACT] 基準測試全數通過（14/14 項目）

### ⚠️ AI-Native Hook 剛性化契約 (v2.5) 🆕

1. ❌ **禁止動態依賴**：useEffect/useMemo 的 deps 必須是靜態字面量或稳定引用，嚴禁將 props/state 直接放入 deps。
2. ❌ **禁止隱式返回值**：Hook 必須返回具名對象 `{ data, status, actions }` 等具名欄位，嚴禁返回元組 `[value, setValue]`。
3. ✅ **強制狀態機模式**：複雜狀態必須用 useReducer + 明確 Action Type，嚴禁多個 useState 聯動。
4. ✅ **強制純函數提取**：所有計算邏輯必須抽離為獨立純函數並附帶 `@contract`，Hook 僅負責膠水調度。
5. ✅ **強制 JSDoc @hook-contract**：引進新 Hook 或修改現有 Hook 前必須先生成或更新 `@hook-contract` 聲明（包括 inputs, outputs, invariants 和 ai_maintenance_rule）。
6. ✅ **React Compiler (Babel Plugin) 共存策略**：
    - 新模塊首選啟用 Compiler 以減少手動記憶化工作量。
    - **嚴禁** 對已有 `@deps-contract` 或手動優化的核心 Hook 移除 `useMemo` / `useCallback`。
    - 衝突時以 `@deps-contract` 手動管理為準。
7.  *現有違規 Hook 的重構留待明日專項處理，今日不改業務代碼*

### ⚠️ 聲明式路由創建權限規範 (v2.10/v2.13 升級) 🆕

1. **強制 RouteAccessContract 聲明**：所有新路由 **必須** 在 `beforeLoad` 中顯式聲明 `RouteAccessContract`（含 `permission` 精確至 `'public' | 'authenticated' | 'admin'`，與 `fallbackRedirect`）。
2. **安全驗證調用**：必須調用 `@/shared/permissionsSchema` 中的 `validateAccess(contract, context)` 進行聲明式安全攔截，嚴禁在路由中編寫原生 `throw redirect` 與手寫 BeforeLoad 安全邏輯。
3. **無遺留安全防禦**：已徹底刪除 legacy/deprecated `useRouteGuard` 及其所有調用點與文件，全面依賴 `validateAccess` 進行路由守衛。
4. **[AI-PERMISSION-CONTRACT-ANCHORED]** [DEP-HYGIENE-HOOK-CLEANUP]

### ⚠️ 認知同步術語及契約化術語對照表 (v2.13) 🆕

為確保 AI 開發時語意精確度、避免語意模糊，禁止使用以下過時的前端描述词汇，必須全數替換為對應的「契約化語意」：

- **「權限檢查」** ➡️ 替換為：**「路由 beforeLoad 契約聲明」**
- **「狀態管理」** ➡️ 替換為：**「URL Params / Query Key 契約流動」**
- **「錯誤處理」** ➡️ 替換為：**「Schema aiDebugHint 結構化診斷」**
- **「Hook 邏輯」** ➡️ 替換為：**「契約執行器管道接口」**

[TERMINOLOGY-SYNCED]

## 🚨 常见错误 → 正确做法

| ❌ 错误 | ✅ 正确 |
| :--- | :--- |
| `import { VirtuosoGrid } from 'react-virtuoso'` | `import { VirtualGrid } from '@/components/virtualizer/VirtualGrid'` |
| `const { photos } = useStore()` | `const { photos } = useStore(useShallow(s => ({ photos: s.photos })))` |
| `confirm('确定删除？')` | `<AlertDialog>...</AlertDialog>` |
| `toast.success('完成')` | `const { showSuccess } = useFeedback(); showSuccess('完成')` |
| `supabase.from('photos').update(...)` | `photoMutationService.update(...)` |
| `loading="lazy"` | `loading="eager" decoding="async"` |
| `position: absolute; inset: 0` (工具栏) | `className="fixed bottom-0 left-0 right-0 flex justify-center"` |
| `left-1/2 -translate-x-1/2` (居中) | `left-0 right-0 flex justify-center` |
| `catch (e) { console.error(e) }` | `catch (e) { handleError(e, '操作上下文') }` |

## ✅ 修改前静默自检清单

每次输出代码前，必须在内部验证以下事项（无需输出检查过程）：
- [ ] 字段全部 snake_case？
- [ ] 异步任务接入 runTask？无手动 loading？
- [ ] 写操作经 MutationService？
- [ ] 弹窗为 AlertDialog / PromptDialog？
- [ ] 反馈经 useFeedback？
- [ ] 浮动元素用 fixed + flex 居中？无 transform？
- [ ] 配置项无硬编码？
- [ ] 匹配仅用 id？
- [ ] 文件体积合规？

## 📎 核心文件索引

| 用途 | 路径 |
| :--- | :--- |
| 虚拟滚动基建 | `src/components/virtualizer/VirtualGrid.tsx` |
| 查询 Hooks | `src/hooks/queries/usePhotos.ts` |
| 变更 Service | `src/services/photoMutationService.ts` |
| 删除 Hook | `src/hooks/useDelete.ts` |
| 任务执行器 | `src/hooks/core/useTaskExecutor.ts` |
| 反馈 Hook | `src/hooks/uiFeedback.ts` |
| UI 状态 | `src/store.ts` |
| 错误处理 | `src/utils/errorHandler.ts` |
| Virtuoso 配置 | `src/config/virtuoso.config.ts` |

### ⚠️ 全域化與重構安全規範 (v2.12) 🆕

- ✅ **強制 AST 安全重構**：任何跨多個文件的全局性代碼轉換、i18n 更新或重構，**必須** 使用 AST 語法樹解析器（如 `jscodeshift` / `ts-morph`）分批安全執行，並在每次運行後即時進行 `tsc --noEmit` 驗證。**嚴禁** 使用 Regex/sed 執行全局非結構化文本替換。
- ❌ **嚴禁單字母語義變量**：除了極少數公認的語法學慣例（如 `for` 循環索引 `i`，泛型參數 `<T>`）外，變量/對象/函數命名長度必須 $\ge 2$。**嚴禁** 引入 `t`, `x`, `e`, `p` 等單字母變量作為核心語義（例如：用 `t` 代表 `translate`，或用 `p` 代表 `photo`）。
  - **推薦替代命名方案**：
    - 代替單字母 `t`：`translate`, `dict`, `langDict`
    - 代替單字母 `e` / `err`：`error`, `exception`
    - 代替單字母 `p`：`photo`, `item`
- ✅ **沙盒先行驗證**：所有全局轉換腳本、AST 插件或自定義 Codemod，必須先在 `sandbox/` 目錄中的測試樣本上驗證通過，確保 100% 語法樹完備且不破壞原有 JSX/對象屬性（如同名屬性 `t.id` 不被改為 `translate.id`），方能實施於 `src/`。

### ⚠️ R2 Audit Report 消費規範 (v2.17)
- ✅ **Schema 消費約束**：必須調用 `StorageAuditResSchema` 進行數據校验，嚴禁裸對象讀取。
- ✅ **診斷探針義務**：新增存儲功能時必須同步更新 `storageHealth.test.ts`，確保 AVIF/WebP 佔比達標。
- ✅ **視覺反饋隔離**：Audit 數據異常時，必須通過 `useFeedback` 彈出結構化錯誤，嚴禁將底層技術棧錯誤（如 R2 403）直接拋給用戶。

[STORAGE-AUDIT-CONSUMPTION-ANCHORED]

### ⚠️ Traffic Replay 探針運用規範 (v2.19) 🆕
- ✅ **最小特權原则**：探針採集必須僅限於 GET 請求，嚴禁採集任何寫入交互。
- ✅ **脫敏審計**：採集前必須通過 `trafficCapture.ts` 移除所有敏感 Header。
- ✅ **性能閾值**：回放測試結果若導致生產響應延遲 >50ms，必須優先暫停探針。

[TRAFFIC-REPLAY-CONTRACT-ANCHORED]


### ⚠️ v2.15 已知错误模式库（Anti-Patterns，严禁复现）

1. **Schema 污染模式**：严禁在 `photoBatchUpdateSchema` 中混入 `price` / `item_code`（如果不是批量操作所需），跨领域耦合校驗會導致不可預期的驗證失敗。
2. **虚假成功模式**：严禁在批量 API 路由中简单返回 `{ success: true }`，必须在 `BatchResult` 正确类型接口下返回 `processed` / `skipped` / `failed` 明细，供前端渲染三态 UI。
3. **HTTP 异常抛错模式**：严禁在 Hono 中直接抛出未经包装的 Error 对象，客户端无法结构化解析。必须使用全局 onError 中间件，并确保 RPC 客户端预检能拦截非 JSON 响应。

4. **回放探针风险模式**：严禁在未做脱敏的情况下开启生产环境流量回放採集，严禁在回放测试中执行任何非 GET 请求以免污染生产数据库。生產環境必須嚴格遵循 1% 採樣率。
 
 ### ⚠️ Hono Request 適配與 Header 讀取規範 (v2.22) 🆕
- ✅ **Header 讀取義務**: 在 Hono 路由/適配層讀取 Header 時，必須優先使用 `c.req.header('name')`，嚴禁解構 `c.req.raw.headers`。
- ✅ **解構防禦**: 嚴禁在未檢查 `c.req` 是否存在的情況下進行解構（如 `const { authorization } = c.req.header('authorization')` 的語法），正確做法是 `c.req.header('authorization')` 直接獲取。
- ✅ **Adapter 穩定性**: 所有針對 Node Server 的適配必須通過 `getRequestListener(app.fetch)` 轉發，確保 Request 對象生命週期完整。

### ⚠️ 第三方庫適配規範 (v2.18) 🆕
- 嚴禁業務組件直接引用第三方庫層級（如 `@radix-ui/*`, `react-query` hooks 等）。
- 必須通過 `src/lib/adapters/*` 進行封裝與轉發。
- 新增 Adapter 前必須在 `docs/ecosystem-watchlist.md` 登記。

### ⚠️ P3-A 拖曳分組 (v2.6)
- ✅ 31/31 Diagnostics PASSED
- ✅ 拖曳操作必須通過 `useDragGrouping` Hook，嚴禁原生 drag 事件綁定
- ✅ **[NEW] 防禦式編碼**: 複雜狀態切換必須使用 `ts-pattern` 確保窮盡性；異步 Mutation 返回值必須封裝為 `neverthrow` 的 `Result` 類型。
- ✅ 所有拖曳相關 mutation 具備樂观更新回滾機制
- 🚧 技術債：多選拖曳邊緣 case、移動端觸控適配 (留待 P3 後續)

### 🗺️ P4 技術演進路線圖
- ✅ **Vite 8 升級 (Next Gen)**：[TRIGGER] Vite 8.0 穩定版發布 + Rollup 6 兼容（已完成）。
- 🚀 **Zustand v5 / React 19 / TanStack Router / date-fns-tz**：已從預研轉入 P4 正式清單。
- 🚀 **Vite 8 觸發信號**：已達成。
- 🚀 **升級防禦卡**：5 項破壞性測試卡（已通過）。
- ✅ **中亞/東南亞多時區適配**：正式引入 `date-fns-tz` 解決 server-client 渲染偏差。 [VITE8-UPGRADE-COMPLETE]

### 🔭 P5 技術雷達 (Future Radar)
| 技術項 | 評估 | 關注點 |
| :--- | :--- | :--- |
| **TS Runtime Types** | 觀望 | ArkType 穩定性與自研協議成熟度 |
| **Bun Test** | 實驗 | 測試並行化與 Vitest 平替可能 |
| **CSS Anchor Positioning** | 觀望 | 瀏覽器兼容性 > 90% 時替換 Floating UI |
| **WebGPU Compute** | 預研 | 瀏覽器端純本地圖片相似度計算 |

[FUTURE-RADAR-UPDATED]

### ⚠️ 反偷懶與命名契約 (v2.22+) 🆕

#### 1. 命名契約 (Naming Contract)
- ✅ **拒絕弱語義**: 所有變量名長度 $\ge 2$（循環索引除外）。
- ✅ **禁止通用詞**: 嚴禁在業務組件中使用 `data`, `item`, `res`, `error` 作為頂層具名變量。必須帶上資源前綴（如 `photoData`, `groupItem`, `apiResponse`, `uploadError`）。
- ✅ **顯式解構**: 路由參數必須通過 `use*Params` 獲取，嚴禁模糊解構。

#### 2. 反偷懶契約 (Anti-Laziness Contract)
- ✅ **類型嚴格化**: 嚴禁在 Schema 定義中使用 `type.any()` 或 `type.unknown()`，除非附帶 `@allow-any` 註釋說明物理限制理由。
- ✅ **錯誤處理語義化**: ErrorBoundary 必須消費 `StandardError` 結構，禁止僅展示硬編碼文案。
- ✅ **設計令牌強制化**: 嚴禁在樣式中使用魔法數字 `w-[...]`, `mt-[...]`。所有數值必須來自配置好的設計令牌或基於 4px 網格的 Tailwind 工具類。

#### 3. 靜態掃描剛性約束
- 任何違反上述契約的代碼將在 Diagnostics 面板中標記為 [FAIL]，並阻斷生產環境發布。

[LAZINESS-CONTRACT-ENFORCED]

### ⚠️ 魯棒性契約 (v2.23) 🆕

1. ✅ **DB-Schema 對齊**: 新增 Select 字段前 **必須** 驗證 DB 物理列存在性，或在 `photoService.ts` 中聲明為 `VIRTUAL_FIELDS`。
2. ✅ **查詢錯誤顯式化**: 所有 Supabase `select` 調用 **必須** 檢查 `error`，若失敗 **必須** 拋出 `StandardError` 以供 EB-DIAG 結構化診斷。
3. ✅ **緩存版本防護**: `SCHEMA_VERSION` 變更時 **必須** 自動失效舊緩存，確保物理 Schema 與緩存數據一致。
4. ✅ **字段級 Fallback**: 非關鍵 UI 字段（如 `description`, `title`）缺失時，組件 **必須** 內置降級渲染邏輯，嚴禁佈局塌陷或報錯。

### ⚠️ 視覺層級與防抖契約 (v2.24/v2.25) 🆕

1. ✅ **防擠壓約定**: 所有視圖頂部 Sticky 標題（Header）必須聲明 `flex-shrink-0`，確保佈局在內容過長時不被壓縮或覆蓋。
2. ✅ **DOM 一致性**: Skeleton 骨架屏的容器嵌套層級與 CSS Token（如 Padding, Margin, z-index）必須與真實渲染 DOM 嚴格對齊，消除切換時的 Layout Shift。
3. ✅ **狀態連續性**: Swapping UI（如合組切換）時必須對 Query 配置 `placeholderData: keepPreviousData`，嚴禁觸發中間態 Loading。
4. ✅ **文檔流約束**: 嚴禁用 z-index hack 修復層級問題，主視圖核心模塊必須遵從自上而下的 flex-col 文檔流佈局。

### ⚠️ Agent 自主學習規範 (v2.20) 🆕
- ✅ **提議機制**：AI 僅允許通過 `scripts/propose-anti-pattern.ts` 輸出提議，禁止直接修改 `AGENTS.md` 或 Schema定義。
- ✅ **審核流程**：所有提議必須由人類開發者在 `sandbox/anti-pattern-proposals/` 中審核並合併。
- ✅ **格式約束**：提議必須包含明確的「根因」「觸發條件」「修復路徑」，並經由 `DiagnosticResult` 的 `healthReport` 數據支持。

## 迁移期铁律（2026-06 至 2026-12）

- ✅ 新 feature 可读旧 store（只读，用于过渡）
- ❌ 旧组件禁止调用新 service
- ❌ 新 feature 禁止写入旧 store
- 每完成一个 feature 迁移，立即删除对应的"只读旧 store"引用

## 🔄 Cosmetic Refactor Final Specs (v3.6) 🆕 [COSMETIC-SYNCED]

### 1. 服务层规范 (Service Naming)
- ✅ **复数化命名**: 所有数据服务文件已重命名为复数形式并移除 `Service` 后缀。
  - `photos.ts`, `groups.ts`, `categories.ts`, `tags.ts`, `manufacturers.ts`
- ✅ **禁止单数**: 严禁在业务逻辑中直接 import 单数命名的 Service 文件。
- ✅ **别名推荐**: 推荐使用 `import * as photos from '@/services/photos'` 模式。

### 2. Hook 命名规范 (Hook Naming)
- ✅ **去 Query 化**: 对齐 XState 风格，主数据查询 Hook 已移除 `Query` 后缀。
  - `usePhotoCount`, `useGroupPhotos`
- ✅ **一致性**: 必须通过 `@/hooks` 统一导出，禁止跨层级深层引用 `queries/*.ts`。

### 3. 组件命名规范 (Component Naming)
- ✅ **管理端主入口**: 固定命名为 `AdminScreen.tsx` (原 `MainAdminScreen.tsx`)。
- ✅ **路径归并**: 已移动至 `src/components/AdminScreen.tsx`，保持页面逻辑与 UI 容器分离。

### 4. 状态管理规范 (State Management)
- ✅ **全局滤镜**: 强制使用 `useFilters` (XState Actor) 作为唯一真相来源。
- ✅ **静默更新**: 滤镜切换必须完全静默且触发乐观更新，严禁出现中间 Loading。

[PROJECT-REFACTOR-COMPLETE]
