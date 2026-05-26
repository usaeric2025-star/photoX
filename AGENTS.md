---
description: PhotoX 项目 AI 编码强制规范。所有代码生成、修改、审查必须严格遵守此文件。违反红线的代码将被拒绝。
globs: ["src/**/*.{ts,tsx}"]
alwaysApply: true
version: "3.0"
lastSynced: "2026-05-26"
sourceOfTruth: "ARCHITECTURE.md"
---

# PhotoX AI Coding Rules v3.0

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

### ⚠️ 圖片渲染契約

-   ✅ 所有圖片必須使用 loading="lazy" decoding="async" fetchpriority="low"
-   ✅ 圖片尺寸必須用 CSS aspect-ratio 控制，嚴禁 JS 計算
-   ✅ 圖片容器必須啟用 content-visibility: auto + contain-intrinsic-size
-   ✅ R2 圖片 URL 必須通過數據管道生成，嚴禁字符串拼接

### ⚠️ 數據管道契約

-   **QueryKey 工廠化**：所有資源 Key 必須通過 `src/lib/queryKeys.ts` 中的工廠函數生成，嚴禁裸字符串拼接。
-   ** Selector 模組化**：Selector 必須是模塊級純函數（`src/lib/selectors/*.ts`），禁止在組件內定義或依賴組件狀態。
-   **數據歸一化防線**：所有進入 VirtualGrid 的數據（如通過 `flattenPhotoInfiniteQueryPages`）必須進行去重與 ID 合法性校驗，嚴禁髒數據穿透。
-   **數據歸一化路由契約** 🆕：分頁數據與扁平數據必須使用不同的歸一化函數（`flattenPhotoInfiniteQueryPages` vs `normalizeAdminPhotos`）。禁止將扁平數組傳入分頁歸一化函數。新增歸一化函數必須通過結構一致性測試。

### ⚠️ 全域 ErrorBoundary 安全契約

-   ✅ ErrorBoundary fallback 必須是純靜態 JSX，嚴禁任何動態內容
-   ✅ componentDidCatch 嚴禁 setState / 副作用 / 組件渲染
-   ✅ 所有新增 ErrorBoundary 必須通過隔離測試驗收

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
