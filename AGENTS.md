## Dropdown 組件規範（鎖定）

- ✅ 使用 `useId()` 生成唯一錨點名稱
- ✅ 通過 `style={{ anchorName }}` 和 `style={{ positionAnchor }}` 綁定
- ✅ 父容器使用 `relative` 作為定位參考
- ✅ 浮層使用 `absolute top-full mt-1 z-50`
- ❌ 禁止使用全局錨點名稱
- ❌ 禁止在 CSS 中硬編碼 anchor-name

- ✅ 全屏加載/阻斷遮罩統一使用原生 `<dialog>`
- ❌ 禁止 fixed inset-0 + z-index 模擬全屏遮罩
- ❌ 禁止為全屏遮罩使用 createPortal

## 分類顯示規範（鎖定）

- ✅ 前台分類固定顯示 8 個（「全部」 + 前 7 個分類）
- ✅ 排列方式：2 排 × 4 個
- ✅ 超過 8 個的分類在後台管理，前台不顯示
- ❌ 禁止改為滾動列表或顯示全部分類

## 頁面層級規範（永久鎖定）

- ✅ 所有全屏視圖必須是獨立路由或原生 `<dialog>`
- ❌ 禁止 absolute/fixed inset-0 + z-index 模擬頁面
- ❌ 禁止用彈窗技術承載獨立頁面語義
- ✅ z-index 僅允許用於 Tooltip/Popover 等附著型浮層

## 彈窗與 z-index 規範（鎖定）

### 彈窗元件
- ✅ 所有彈窗統一使用 `src/components/ui/Modal.tsx`
- ✅ Modal 使用原生 `<dialog>` 元素
- ❌ 禁止使用 `createPortal` 手動渲染彈窗
- ❌ 禁止為彈窗設置 z-index

### 佈局
- ✅ 使用 `flex` 隔離固定區域（`shrink-0` + `flex-1 overflow-y-auto`）
- ❌ 禁止使用 `sticky + z-index` 處理頭部

### 清理規範
- ✅ 清理必須遵循「先建後破」原則
- ✅ 舊組件先標記 `@deprecated`，確認無引用後刪除
- ✅ 廢棄 CSS 變數先註釋保留一個版本週期

## 表单管理规范（锁定）

- ✅ 使用 `react-hook-form` + `@hookform/resolvers/arktype`
- ✅ 多语言栏位使用 `<MultilingualInput>`
- ✅ 动态数组使用 `<DynamicArrayField>`
- ✅ 表单提交使用 `useFormWithMutation`
- ✅ 非标准控件使用 `Controller`
- ❌ 禁止使用 `@mantine/form`
- ❌ 禁止手动 `watch + setValue` 同步表单值


### 目錄結構
- ✅ `api/_lib/ai/providerFactory.ts`：唯一 AI 工廠（含模型獲取）
- ✅ `api/_lib/ai/executor.ts`：唯一 AI 執行器
- ✅ `src/services/ai/orchestration.ts`：前端唯一編排入口

### 禁止事項
- ❌ 禁止在 `providerFactory.ts` 之外獲取模型
- ❌ 禁止創建獨立的 `logger.ts`（使用統一 `api/_lib/logger.ts`）
- ❌ 禁止分散 AI 邏輯到多個檔案

## AI 設定面板規範（鎖定）

- ✅ 使用者可配置 API Key
- ✅ 使用者可配置模型型號（儲存到 settings.custom_model）
- ✅ 前端顯示當前使用的模型
- ✅ 提供測試連線按鈕
- ❌ 禁止硬編碼模型名稱
- ❌ 禁止前端決定使用哪個模型

## AI 配置規範（鎖定）

### 儲存位置
- ✅ 所有 AI 配置統一儲存在 `secrets` 表
- ✅ API Key 使用 key: `openrouter`, `gemini`
- ✅ 模型使用 key: `openrouter_model`, `gemini_model`
- ✅ 首選提供商使用 key: `PRIMARY_AI_PROVIDER`

### 前端原則
- ✅ 測試連線時只傳 `provider` 和 `apiKey`
- ❌ 禁止前端傳遞 `model` 參數

### 後端原則
- ✅ 從 `secrets` 表讀取模型配置
- ❌ 禁止硬編碼模型名稱

## API 密钥与安全规范 (256gsm 锁定)
- ✅ **唯一算法标准**：所有保存在数据库中的 API 密钥（如 OpenRouter Key、Gemini Key 均保存在 `secrets` 表）必须且只能使用 `aes-256-gcm` (256gsm) 算法进行高强度加密。
- ✅ **统一存储结构**：加密结果的格式必须严格为 `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`，其中：
  - IV 长度固定为 12 字节 (`crypto.randomBytes(12)`)。
  - AuthTag 与加密串以十六进制 (`hex`) 拼接输出。
  - 禁止将任何敏感密钥以直白明文、低烈度哈希或非标准化（如 CBC、DES 等）形式混入代码库或数据表。
- ✅ **兼容与容错性**：系统加解密模块必须能对历史 CBC 和明文进行优雅兼容和解密降级，但对所有新录入及更改后的密钥，必须同步以 `aes-256-gcm` 进行重新转换及统一落库 (256gsm 化)。

## 核心原则（锁定）
1. 服务端数据 → TanStack Query
2. 前端 UI 状态 → Zustand（只存瞬态）
3. 筛选条件 → URL State
4. ❌ Context 传递业务数据
5. ❌ Props drilling 超过 2 层
6. ❌ 预计算层

## 狀態管理邊界規範（鎖定）

### TanStack Query（服務端狀態）
- ✅ 所有 useQuery/useMutation/prefetchQuery 必須使用 `queryKeys` 工廠
- ✅ 預加載與實際查詢共用同一 Key 生成函數
- ✅ staleTime 必須使用 `STALE_TIMES` 常量
- ❌ 禁止手動拼接 Query Key 字串
- ❌ 禁止在 Zustand Store 中快取服務端數據

### Zustand（客戶端狀態）
- ✅ 僅管理 UI 狀態、表單草稿、批量選擇等純客戶端數據
- ❌ 禁止充當服務端數據的二級快取

### 樂觀更新
- ✅ 優先使用 `useOptimistic` 或 Query 的 `onMutate`
- ❌ 禁止手動 `setQueryData` + Store 雙寫同步

### 預加載規範
- ✅ 使用 `usePrefetch` 通用 Hook
- ✅ 必須加 80ms 防抖
- ✅ 懸浮 + 觸控雙通道

## 搜尋與視圖優化規範（永久鎖定，2026-06-18）

### CQRS 與 Materialized Views
- ✅ **讀寫分離（CQRS）**：對於高頻讀取且跨表關聯複雜的 API（如照片列表），必須使用 Materialized View (`v_photos_list`) 來收斂資料結構，從而避免執行階段的繁重 JOIN。
- ✅ **非同步並發刷新 (Concurrent Refresh)**：寫入操作（增、刪、改、合組、改標籤）完成後，必須透過 `REFRESH MATERIALIZED VIEW CONCURRENTLY` 或類似的非同步背景任務更新視圖，不在主執行緒阻塞使用者。
- ✅ **單一真相源**：Drizzle Schema 中定義實體表，同部使用 Drizzle 定義視圖映射（透過 `pgMaterializedView`），所有查詢端皆以視圖欄位為準。

### 搜尋優化與 GIN 索引
- ✅ 使用 GIN 索引優化 JSONB 欄位（例如 i18n 名字）的搜尋。
- ✅ 針對跨表查詢（例如 Tags, Categories 名字陣列）應該預先拉平儲存在 Materialized View 中的 text array 欄位。
- ✅ 在搜尋時，直接對 Array 使用 `UNNEST()` 和 `ILIKE` 或者對字串進行 `ILIKE` 搜尋，避免對主表進行深層的 EXISTS 或 JOIN 查詢。

## 架構進化規範 (2026-06-12)
- ✅ defineMutation 仅返回纯配置对象，禁止返回 Hook 工厂
- ✅ isDirty 判断禁止使用 JSON.stringify，使用 lodash-es/isEqual 或 RHF formState
- ✅ ArkType Schema 是数据契约唯一真相源
- ✅ Edit Session 封装完整编辑语义

## 四大工廠規範（鎖定）

- ✅ Mutation Factory 接收配置对象，禁止直接接收函数
- ✅ Query Factory 必须绑定 ArkType Schema
- ✅ Form Factory 必须使用集中化 Schema
- ❌ Error Factory 禁止改动
## 命名规范（强制，锁定）

### 组件
| 类型 | 规则 | 示例 |
|------|------|------|
| 页面 | `XxxPage` | `PublicPage`, `AdminPage` |
| 容器 | `XxxContainer` | `PhotoListContainer` |
| 渲染 | `XxxGrid` / `XxxView` | `VirtualPhotoGrid` |
| 弹窗 | `XxxDialog` / `XxxModal` | `GroupDetailDialog` |
| 按钮 | `XxxButton` | `UploadButton` |

### Hooks
- ✅ 自定义 Hook 必须以 `use` 开头，后跟大写字母
- ✅ 工厂生成的 Hook 也必须遵循 `useXxx` 格式
- ❌ 普通函数不要使用 `use` 前缀

| 类型 | 规则 | 示例 |
|------|------|------|
| 服务端数据 | `useXxx`（复数） | `usePhotos`, `useCategories` |
| UI 状态 | `useUIStore` | 替代 `galleryStore` |
| 交互工具 | `useXxx` | `useLongPress`, `useDebouncedSearch` |

### 检查命令
```bash
# 查找 utils 目录下误用的 use 前缀
find src/utils -name "use*.ts" -o -name "use*.tsx"
```

### Store
- UI 瞬态：`useUIStore`（columns, isMultiSelect, selectedIds, lightboxIndex, activeGroupId）
- 筛选条件：URL State（不用 Store）

## 缓存失效规则（锁定）

### 核心原则
- 所有照片写操作（增、删、改、合组、置顶、批量操作）
- 必须使用 `photoKeys.all` 作为失效键
- ❌ 禁止使用 `photoKeys.lists()`、`photoKeys.infinite()` 等分支键进行写后刷新

### 理由
- React Query 的前缀匹配机制 (`photoKeys.all`) 会自动刷新所有子分支（infinite, group, count）
- 性能代价低（仅标记失效，按需触发），且能彻底杜绝因分支键不匹配导致的 UI 不更新 bug

### 标准用法
```typescript
import { useInvalidatePhotos } from "@/hooks";

const invalidatePhotos = useInvalidatePhotos();
// ... 执行 mutation
invalidatePhotos(); // 降维打击，清空全域缓存
```

## 状态管理边界（锁定）

| 状态类型 | 存储位置 | 示例 |
|----------|----------|------|
| 服务端数据 | TanStack Query | 照片列表、分类、标签、合组 |
| URL 持久化 | URL State | 筛选偏好、排序、分页、多选模式 |
| UI 瞬态 | Zustand (`useUIStore`) | 主题、侧边栏开关、全局弹窗、灯箱索引 |
| 组件局部 | `useState` / `useMemo` | 简单的 Input 受控、局部勾选 ID 集合 |

## 数据验证规范（锁定）

- ✅ **唯一方案**：使用 **ArkType** 进行运行时类型校验。
- ✅ **共享定义**：校验 Schema 应在 `api/shared/apiContractSchema.ts` 中定义，由前后端通过 `import type` 共享。
- ❌ **严禁方案**：禁止引入 **Zod**。如果发现项目中有遗留的 Zod 代码，逐步重写为 ArkType。
- ❌ **禁止逻辑混入**：Validator 只负责数据形状校验，禁止在校验阶段混入复杂的业务逻辑。

### 示例
```typescript
import { type } from "arktype";

export const PhotoSchema = type({
  id: "string",
  name: "string",
  "image_url?": "string",
  "group_id?": "string"
});
```

## API 路由架构规范（锁定）

1. **类型共享**：前端必须通过 `import type { AppType } from "../../api/app"` 引用后端路由类型。
2. **RPC 优先**：优先使用 `hono/client` (hc) 进行调用，确保前端参数与后端定义严格对齐。
3. **禁止 Manual URL**：除非是静态资源或第三方链接，禁止在前端手动拼接 `/api/xxx` 字符串。

## React Compiler 决策（锁定，2026-06-11 更新）
- ✅ **重新引入 React Compiler**：对于渲染极重且 Hook 极多的组件（如 `PhotoCard` 与虚拟列表内的各项），手动维护的过度 Props Drilling 和 `React.memo` 成本过高，因此启用 React Compiler 负责细粒度的自动 Memo 化。
- ✅ **规范用法**：
  - 代码不再需要手动编写大量的 `useMemo` 或 `useCallback`。
  - 父子组件无需为了“避免重渲染”而进行极端的 Props Drilling。
  - 直接依赖 Vite 的 `babel-plugin-react-compiler` 实现编译期的优化。
- ❌ 禁止使用极端的 Props Drilling 传递海量数据（例如将顶层大对象逐层传递下去只为绕过 Context/Hook），可以更自然地在组件内部使用 Zustand selector。
- ❌ 禁止盲目添加没必要的 `React.memo` 作为预防；由 Compiler 自行判断。

## 依賴版本規範（鎖定，2026-06-15）

### TanStack Query
- ✅ 最低版本：v5.150+
- ✅ 使用物件參數 `useQuery({ queryKey, queryFn })`
- ✅ 使用 `isPending` 替代 `isLoading`

### TanStack Router
- ✅ 最低版本：v1.100+
- ✅ 滾動恢復使用 `scrollRestoration: true`

## TanStack Router 生產規範（鎖定）

- ✅ 每個路由必須定義 errorComponent 處理 validateSearch 失敗
- ✅ 根路由必須定義 errorComponent 捕獲 beforeLoad 穿透錯誤
- ❌ 禁止在元件中 try/catch validateSearch 錯誤（由 errorComponent 統一處理）

### Hono
- ✅ 最低版本：v4.30+
- ✅ 匯出 `AppType` 供前端使用

### TypeScript
- ✅ 使用 `tsgo` 作为主要編譯器
- ❌ 禁止保留 `typescript` 套件

## 禁止项
- ❌ `forwardRef`（React 19 不需要）
- ❌ `React.FC`
- ❌ 任何未经验证的实验性编译插件
- ❌ `useStaticData` 模式
- ❌ `View` 后缀（用 `Page` 或 `Grid`）

## AI 生成代码时
- 服务端数据 → 直接调 `useXxx` Hook
- UI 状态 → `useUIStore`
- 筛选 → URL State
- 不需要问「数据从哪里来」

## 日志与性能规范（锁定）

### 规则
- ✅ 使用 `logger.debug()` 替代 `console.log`
- ✅ 使用 `logger.info()` 替代 `console.info`
- ✅ `logger.warn()` / `logger.error()` 始终输出
- ❌ 禁止在生产环境输出 debug/info 日志

### 性能监控
- 关键耗时操作使用 `logger.time()` / `logger.timeEnd()`
- 视图渲染监控使用 `usePerformance('ComponentName')`

## 构建工具链规则（锁定，2026-06-02）

### 前端
- 开发/构建 → **Vite**
- ❌ 禁止用 Vite 打包后端代码
- ❌ 禁止引入 Rspack / Rolldown 替代 Vite（除非 Vite 前端 DX 出现不可修复的问题）

### 后端（Vercel Serverless）
- 部署 → **Vercel 原生 TypeScript 编译**
- 本地开发 → `tsx server.ts`
- ❌ 禁止打包后端代码（不产生 createRequire 冲突）
- ⚠️ 若未来必须打包后端（如非 Vercel 部署），仅允许 **esbuild + bundle: false**

### 理由
- 每个工具做自己擅长的事
- 零额外配置，零学习成本
- 与 Vercel 设计理念完美对齐

## 目录结构规则（锁定，2026-06-02）

- `api/` → Vercel Serverless 函数（后端）
  - `api/index.ts` 是入口
  - `api/app.ts` 是 Hono 路由
- `src/` → 前端 React 代码（Vite 构建）
- `server.ts` → 本地开发入口（`tsx server.ts`）

### 禁止事项
- ❌ 禁止从 `api/` 导入 `src/` 下的文件
- ❌ 禁止用 Vite 打包后端代码

## Vercel 函数导出规则（锁定，2026-06-02）

### 标准写法
```typescript
// api/index.ts
import { handle } from "hono/vercel";
import { app } from "./app.js";

export const fetch = handle(app);
```

### 理由
- Vercel 的 Node.js 运行时和 Edge 运行时都支持具名 `fetch` 导出
- Hono 的 `hono/vercel` 适配器专为此设计
- 与本地开发 `serve({ fetch: app.fetch })` 完全一致

### 禁止事项
- ❌ 禁止 `export default handle(app)`（在某些 ES Modules 编译阶段，Vercel 构建可能报错或解析失败）
- ❌ 禁止动态导入 `await import("./app")`

## Virtua 虚拟滚动规范（性能优化版）

### 核心原则
- ✅ **尺寸匹配**：`itemSize` 必须尽可能接近真实渲染高度。对于响应式栅格，建议使用动态计算或 `estimateSize`。
- ✅ **减少抖动**：追加数据时确保稳定的 `key`，避免 `VList` 重新测量所有节点。

### 核心配置
```tsx
<VList
  ref={listRef}
  data={items}
  itemSize={estimatedHeight}               // 响应式或固定高度
  shift={true}                             // 追加数据时保持位置稳定
>
  {(item) => <Component key={item.id} item={item} />}
</VList>
```

### 属性建议
- ✅ `data` - 数据源
- ✅ `itemSize` - 估算高度（推荐根据 columns 动态计算）
- ✅ `shift` - 建议开启，用于平滑处理分页追加
- ✅ `scrollToIndex` - 导航跳转首选
- ❌ `overscanCount` - 已废弃，使用自动缓存策略
- ❌ `index` 作为 key - 严禁

### 返回顶部与恢复滚动标准写法
- ✅ **导航跳转**：使用 `scrollToIndex(0)` 回到顶部
- ✅ **恢复滚动位置**：允许使用 `scrollTo(pixel)` 精确恢复历史位置
- ❌ 禁止使用 `scrollTo(0)` 作为通用的「回到顶部」写法（应使用 `scrollToIndex`）
```typescript
## 錯誤處理與語言規範 (鎖定)

- ✅ **報錯一律只有中文**：所有向使用者展示的錯誤訊息、Toast、診斷標題均必須使用簡體或繁體中文，禁止混入英文。
- ✅ **診斷資訊一鍵複製**：所有錯誤展示組件必須包含「複製診斷資訊」按鈕，格式必須包含：時間戳、錯誤類型、代碼、Trace ID 及原始 Message。
- ✅ **技術細節隔離**：使用者訊息應保持通俗易懂，具體的技術堆棧或 Trace ID 應收納在「診斷資訊」區域。

## 視覺與 UI 規範 (鎖定)

- ✅ **禁止洩露內部程式碼**：在前台 UI 中，禁止顯示任何 UUID 或類似 `[a-f0-9]{8}-...` 的原始庫存 ID。
- ✅ **計數顯示**：左上角或頁首應僅顯示經過格式化的「數量」標籤（例如：`102 张照片`），嚴禁顯示系統內部的 UUID。
- ✅ **封面標識**：「Cover」標識僅限於管理後台顯示，嚴禁穿透到公開前台頁面。
## 類型安全規範（永久鎖定）

### 核心原則

**`any` 是禁止的。** 沒有例外。

### 替代方案

| 情境 | 禁止 | 替代 |
|------|------|------|
| 未知物件 | `any` | `JsonObject` / `Record<string, unknown>` |
| 未知函數 | `any` | `AnyFunction` / `(...args: unknown[]) => unknown` |
| 泛型預設 | `any` | `extends Record<string, unknown>` |
| 第三方類型 | `any` | 使用 `@types/*` 或自行定義 |

### CI 檢查

- ✅ PR 必須通過 `any` 數量檢查
- ✅ `any` 數量只能減少，不能增加
- ❌ `any` 增加的 PR 不得合併

### Snippet 標準

- ✅ 所有 Snippet 禁止使用 `any`
- ✅ 新 Snippet 必須包含 ArKType Schema
- ✅ 所有 `useMutation` / `useQuery` 必須有明確泛型
ual List）渲染项中，**严禁** 在子组件内部调用 `useQuery` 或数据量较大的 Hook（如 `useCategories`, `useTags`）。
- ✅ **共享注入**：必须在父容器中获取数据，并通过 `sharedCategories` / `sharedTags` 等 Props 批量注入子项，以避免数千次重复的数据查找开销。
- ❌ **禁止 Drilling**：Props 路径严禁超过 2 层。如果需要深层传递，考虑使用细粒度的 Zustand Selector。

## 照片上传排重规范（锁定）

### 核心原则
- ✅ 数据库 `image_hash` 字段是**唯一可信来源**
- ✅ 确保 `image_hash` 字段有数据库索引（已存在）
- ✅ 前端仅做同会话快速排重（`name + size + lastModified`）
- ❌ 禁止前端计算大文件哈希（已删除 spark-md5）

## 错误处理规范（锁定）

### 铁律
- ❌ 禁止在 catch 中抛出无上下文的通用错误
- ✅ 必须使用 `ErrorFactory.wrap(originalError, operation, resource?)`
- ✅ 原始错误作为 `cause` 传递，保留完整堆栈

### 示例
```typescript
// ✅ 正确
catch (e) {
  throw ErrorFactory.wrap(e, '上传照片', file.name);
}

// ❌ 错误
catch (e) {
  throw ErrorFactory.create({ code: ErrorCode.UPLOAD_FAILED, ... });
}
```

## 上传稳定性与补全规范（锁定）

### 智能排重与恢复原则
- ✅ **有效性优先**：排重判断必须同时校验 `image_hash` 和 `image_url`。
- ✅ **断点续转支持**：若数据库存在记录但 `image_url` 为空，应允许本次上传覆盖，复用原有 ID 或更新记录，不应拦截。
- ✅ **自动重试机制**：前端上传 R2 时必须包含指数退避重试逻辑（默认 3 次）。
- ✅ **孤本定期清理**：核心维护流程应包含 `cleanUpOrphanRecords`，自动清理数据库中无图片对应的残余记录。

### 事务顺序
1. 前端计算哈希并预校验。
2. 后端获取预签名地址（包含 resume 检查）。
3. 前端执行文件上传（带重试）。
4. 上传成功后落库（或更新记录状态）。
5. 任何阶段失败需解锁前端内存排重缓存。

## 孤本恢复与去重规范（锁定）

### 核心原则
- ✅ **唯一依据**：恢复去重必须基于 `image_url` 的归一化结果（忽略大小写、空格、URL 参数及末尾斜杠）。
- ✅ **全量比对**：数据库查询必须支持分页（`range` 模式），确保比对覆盖所有 1000+ 条记录。
- ✅ **智能过滤**：扫描 R2 时必须自动过滤缩略图（含 `thumb`, `thumbnails/`, `_t.webp` 标识的文件）。
- ✅ **增量导入**：单次恢复导入上限为 50 条，导入后立即将 URL 加入已存在集合，防止同批次内并发重复。
- ✅ **补全哈希**：所有恢复导入的照片必须自动下载并重新计算 `image_hash`。

### 修复流程
1. 使用 `normalizeUrl` 函数处理所有输入/输出 URL。
2. 循环分页获取数据库全量 `image_url` 进入 Set 缓存。
3. 扫描 R2，计算差集（真正缺失的文件）。
4. 先运行「清理冗余 URL」工具修复历史错误。
5. 再次运行「恢复孤儿照片」。

## 缩略图架构规范（锁定，2026-06-03）

### 核心原则
- ✅ **按需生成**：缩略图由 Cloudflare Worker 实时生成，R2 仅存储原图。
- ✅ **移除物理列**：数据库 `furniture_items` 表不再使用 `thumb_url` 列，查询时通过 `image_url` 动态映射。
- ✅ **前端渲染**：使用 `getPathFromUrl` 辅助函数提取路径，并拼接 `VITE_THUMBNAIL_WORKER_URL`。
- ✅ **清理策略**：管理后台审计工具不再扫描 `thumb_` 前缀的文件，恢复脚本必须过滤所有包含 `thumb`, `temp`, `thumbnail` 的 R2 文件。

### 实施标准
- 缩略图参数：`w` 为宽度，`h` 为高度（默认 400x400）。
- 映射位置：`src/services/photo/queries.ts` 中的 `mapSupabasePhoto` 函数。
- 上传逻辑：`uploadService.ts` 移除缩略图压缩与二次上传步骤，仅上传原图。

## 后台维护系统规范（锁定，2026-06-03）

### 核心原则
- ✅ 每个维护操作必须支持预览（Preview before Execute）
- ✅ 危险操作必须二次确认（confirm/alertDialog）
- ✅ 耗时操作必须显示进度反馈
- ✅ 所有执行结果必须记录日志（暂由后端 console 输出保证，未来迁移至 maintenance_logs 表）

### 禁止事项
- ❌ 禁止无预览直接大批量修改数据
- ❌ 禁止无进度反馈的耗时操作
- ❌ 禁止在诊断面板只报错不提供修复入口

### 统一架构
- ✅ 新增维护工具统一使用 `@/components/admin/Diagnostics/MaintenanceTool` 组件
- ✅ 维护逻辑与 API 映射收敛于 `@/features/maintenance/issueActions`
- ✅ 后端业务逻辑保持在 `/api/app.ts` 中封装，由前端 MaintenanceTool 统一调用

## AI Raw 数据架构规范 (永久锁定，2026-06-14)

### 存储策略
- ✅ 单一数据源：所有 AI 审计数据存储于 Supabase `ai_audit_logs` 表
- ✅ 完整 Raw JSON → `raw_output` (JSONB)
- ✅ 结构化摘要 → `cleaned_output` (JSONB)
- ✅ 性能指标 → 独立字段 (latency_ms, cost_est, token_usage, status)
- ❌ 禁止使用 R2 存储 AI 审计日志
- ❌ 禁止双写架构

### R2 历史数据
- ✅ 仅透过 Lifecycle Rule 自动过期清理
- ❌ 禁止在代码中执行 R2 AI 日志删除
- ✅ 照片路径与 AI 日志路径必须物理隔离

### 变更纪律
- ✅ 新增审计字段时，必须同时更新 Migration + 代码 + 本规范
- ❌ 禁止代码先行、Migration 滞后

## 通知与反馈规范（锁定，2026-06-03）

### 核心原则
- ✅ **唯一出口**：所有通知必须使用 `sonner` 的 `toast`。
- ✅ **禁止原生**：严禁使用 `window.alert()` 或 `window.confirm()`（交互请使用 `useUIStore` 的 `alertDialog`）。
- ✅ **可执行建议**：系统级错误通知应尽可能包含修复建議或「查看诊断」按钮。
- ✅ **异步追踪**：所有耗时操作（上传、批量更新、导出）必须显示进度或 Loading 状态。

## 日誌架構規範（鎖定，2026-06-08）

### 核心原則
- ✅ **唯一日誌表**：`system_logs`
- ✅ **唯一寫入路徑**：`logError()` → `/api/log-error` (API 專線，永不直連 DB)
- ✅ **唯一讀取來源**：`/api/admin/error-events` → `system_logs`
- ❌ **禁止使用** `error_events` 表（已廢棄）
- ❌ **禁止客戶端直連** Supabase 寫日誌 (受 RLS 限制且破壞數據一致性)

### 統一用法
```typescript
// 簡單成功
toast.success('操作已完成');

// 带动作的错误
toast.error('发现数据完整性问题', {
  action: {
    label: '去诊断',
    onClick: () => navigate({ to: '/admin/diagnostics' })
  }
});
```

## 任務中心適配規範（鎖定，2026-06-03）
- ✅ **非破坏性更新**：不重写 `useTaskExecutor` 和 `TasksList`，采用适配层聚合数据。
- ✅ **全局入口**：在 `/admin/tasks` 提供所有（前端+后端）任务的统一视图。
- ✅ **自动刷新**：任务页面应具备自动轮询后端 Job 状态的能力。

## AI 合組識別規範（永久鎖定）

### 輸出保障
- ✅ 提示詞必須配合 ArkType/Zod schema 校驗
- ✅ 校驗失敗必須帶錯誤反饋重試至少一次
- ✅ 必須校驗 photoIds 完整性（返回總數 = 輸入總數）
- ❌ 禁止寫入未經 schema 校驗的 AI 輸出

### 代碼與流程規範
- ✅ AI 生成合組直接 confirmed，用戶可編輯修正
- ✅ 修正操作記錄至 group_correction_logs（僅 before/after/type）
- ❌ 禁止評分/反饋 UI，待分析資源就緒後再評估
- ❌ 禁止在 correction_logs 中存儲評分字段

### 前後端對齊
- ✅ 所有 groups 查詢必須包含 status 字段
- ✅ 公開頁面必須過濾 eq('status', 'confirmed')
- ✅ 樂觀發布：AI 結果直接以 confirmed 狀態寫入，無需二次確認
- ❌ 禁止顯式 select 列舉時遺漏 status

## Snippet 架构路径规范（锁定，2026-06-07）

### 核心原则
- ✅ **Snippet 即文档**：`.vscode/photox.code-snippets` 中定义的 Snippet 是项目的「可执行架构文档」。
- ✅ **强制使用**：AI 在编写 Service 函数、Mutation、Query Key 或单元测试时，**必须优先参考 Snippet 定义的结构**。
- ✅ **路径依赖**：任何不符合 Snippet 定义的「手写」架构实现（如手动维护乐观更新快照、直接 throw 錯誤而不使用 `withErrorHandling`）均视为架构违规。

### 关键触发词
- `aresult` → 创建 Service 函数（AppResult 签名）
- `optdsl` → 实现乐观更新（DSL 操作符）
- `cmut` → 脚本化 Mutation Hook
- `qkey` → 链式 Query Key Builder

## 灯箱与合组跳转核心规则（锁定）

### 1. 核心原则
- ✅ **URL 唯一事实来源**：禁用 Zustand 存储页面级 ID，所有显示逻辑必须依赖 URL 参数（`photoId`, `groupId`）。
- ✅ **路由驱动权限**：所有管理操作权限必须前置校验 `pathname.startsWith('/admin')`。

### 2. 点击与导航映射
| 点击目标 | 场景 | 跳转目标 | 预期行为 |
|----------|------|----------|----------|
| 单张照片 | 公开列表 | `/?photoId={id}` | 弹灯箱 |
| 单张照片 | 管理列表 | `/admin?photoId={id}` | 弹灯箱 |
| 合组卡片 | 列表页 | `/group/{id}` 或 `/admin/group/{id}` | **进入详情页**，不弹灯箱 |
| 照片 | 合组详情页 | `/group/{gid}?photoId={id}` | 弹灯箱，支持在组内切换 |

### 3. 灯箱与面板渲染逻辑
- ✅ **自动上下文**：`useLightbox` 必须根据 URL 中的 `groupId` 自动加载对应合组的照片流作为灯箱序列。
- ✅ **面板隔离**：信息面板（`PhotoInfoPanel`）必须严格区分 `mode="group"` 和 `mode="single"`，不混合显示。
- ✅ **编辑权限**：编辑按钮显示必须同时满足 `isAdmin` 且路由匹配当前查看的实体类型。

### 4. 退出逻辑
- ✅ **层级返回**：灯箱关闭时行为区分模式：
  - **单张模式**：回到 `/admin` 或 `/`。
  - **合组模式**：回到 `/admin/group/{groupId}` 或 `/group/{groupId}`，保留合组上下文。
- ✅ **状态清理**：退出合组详情页时需显式清理 `groupId`，导航回根路径。

## 错误处理与降级规范（锁定，2026-06-03）

### 1. 核心原则
- ✅ **全量包裹**：所有主要页面和 App 根组件必须包裹 `ErrorBoundary`。
- ✅ **数据韧性**：所有关键数据查询必须处理 `isLoading` / `isError` 状态，禁止在数据缺失时读取属性。
- ✅ **友好反馈**：发生致命错误时必须提供「刷新」或「返回首页」的交互入口。

### 2. 场景化降级
- ✅ **灯箱缺失**：若 `photoId` 指向的照片不存在或加载失败，必须显示 `LightboxFallback`。
- ✅ **列表空态**：列表页无数据时需使用 `EmptyState` 组件。
- ✅ **网络异常**：`useQueryWithFallback` 钩子必须自动触发错误通知（Toast）。

## 标准加载与错误处理模式（锁定，2026-06-03）

### 列表加载
- ✅ 使用 `PhotoGridSkeleton`
- ❌ 禁止使用 `<Spinner />`

### 表单/提交
- ✅ 使用 Mutation 的 `isPending`
- ❌ 禁止手动 `useState` 管理 loading

### 错误反馈
- ✅ 使用 `toast.error`
- ❌ 禁止 `alert()`

## 缓存持久化规范（锁定）

### IndexedDB 持久化安全 [P0]
- ✅ **唯一方案**：使用 IndexedDB 存储（`idb-keyval`），绕过 localStorage 5MB 限制。
- ✅ **用户隔离**：持久化 Key 必须包含 `userId`（`PhotoX_QueryCache_{userId}`），登出时必须调用 `clearPersistence` 物理清除。
- ✅ **版本控制**：配置 `PERSIST_VERSION`，当 schema 结构发生 Breaking Change 时提升版本号以强制清空旧缓存，防止渲染崩溃。
- ✅ **白名单机制**：仅持久化 `photos`, `groups`, `categories`, `tags`, `manufacturers` 等核心业务数据。
- ❌ **禁止项**：禁止持久化 `mutations`、`tasks`、筛选 URL 状态（URL 已经是事实来源）。

### 生命周期 [P1]
- ✅ 缓存有效期：7 天。
- ✅ 启动加载：不信任持久化数据的新鲜度，应用启动时保持 `staleTime` 触发后台静默刷新。
- ✅ 登出联动：`supabase.auth.signOut` 之前必须同步执行 `clearPersistence`。

## Hook 使用规范（锁定）

### Hook 存放与目录规范

| 目录 | 用途 | 特征 | 範例 |
| :--- | :--- | :--- | :--- |
| `src/hooks/core/` | **核心/通用 Hook** | 无关业务逻辑，可在其他专案复用 | `useAuth`, `useLocalStorage`, `useDisclosure` |
| `src/hooks/` | **业务逻辑 Hook** | 依赖 PhotoX 的型别、API 或特定业务流程 | `usePhotos`, `useLightbox`, `usePhotoUpload` |
| `src/components/xxx/` | **组件私有 Hook** | 仅供单一特定组件使用的逻辑封装 | `usePhotoEditDrawer` |

#### 规则
- ✅ **核心分离**：`core/` 下禁止出现包含业务逻辑或特定领域型别的 Hook。
- ✅ **扁平结构**：主要业务 Hook 应位于 `src/hooks/` 根目录，以便快速索引。
- ✅ **禁止重复**：全域严禁出现同名 Hook（如同时存在 `hooks/useX.ts` 与 `hooks/core/useX.ts`）。

### 通用工具 Hook（优先使用 @mantine/hooks）
- ✅ 弹窗开关：`useDisclosure`
- ✅ 本地存储：`useLocalStorage`
- ✅ 防抖/节流：`useDebouncedValue` / `useThrottledValue` / `useDebouncedCallback`
- ✅ 媒体查询：`useMediaQuery`
- ✅ 悬停/焦点：`useHover` / `useFocus`
- ✅ 剪贴板：`useCopyToClipboard`
- ✅ 窗口滚动：`useWindowScroll`

### 彈窗開關規範（鎖定，2026-06-11 更新）

- ✅ 新元件優先使用 `useState` 管理開關（`[open, setOpen] = useState(false)`）。
- ✅ shadcn/ui 元件必須使用 `open` + `onOpenChange` 受控模式。
- ✅ 核心通用元件（如 `ConfirmDialog`）可繼續使用 `useDisclosure` 封裝。
- ❌ 禁止在新開發的業務組件中引入 `useDisclosure`（除非是為了維持與舊代碼的一致性）。
- ❌ 禁止使用 Mantine 的 `useDisclosure` 來管理複雜的業務流程，優先考慮 URL State。

### 交互與顯示規範（鎖定，2026-06-11 更新）

- ✅ **CSS :hover 僅用於視覺增強**（陰影、背景色、非關鍵 Tooltip）。
- ✅ **關鍵功能必須點擊觸發**：編輯、刪除、提交、導航等功能按鈕必須始終可見（或點擊顯示選單），禁止「僅在 hover 時顯示」。
- ✅ **移動端優先**：所有功能點必須在觸控環境下可操作。
- ❌ 禁止使用 JS 管理僅用於視覺效果的 hover 狀態（除非需要進行複雜的座標計算）。

### 剪貼板使用規範（鎖定，2026-06-11 更新）

- ✅ **唯一出口**：組件內必須使用 `useCopyToClipboard` Hook。
- ✅ **唯一出口（非 Hook）**：底層工具函數必須使用 `src/utils/clipboard.ts` 中的 `copyToClipboard`。
- ✅ **一致性提示**：複製行為必須伴隨 `toast` 反饋（預設已在工具/Hook 中集成）。
- ❌ **絕對禁令**：禁止在各處直接調用 `navigator.clipboard.writeText`。
- ❌ **絕對禁令**：禁止使用 Mantine 的 `useClipboard`（功能過於簡陋）。

### 業務 Hook（保持现状，不迁移）
- 数据获取：`usePhotos`, `useGroups` 等
- 状态管理：`useLightbox`, `useTaskExecutor` 等
- 路由/URL：`useUrlFilters`
- 权限：`useAdminMode`

## 性能优化原则（锁定）
- ✅ **性能优先原则**：性能优化应当建立在真实确认的瓶颈基础上。
- ✅ **数据面优化**：在大数据无限滚动中，优先优化 flatMap / select 下的同步计算。
- ✅ **渲染面优化**：确保虚拟滚动的 itemSize 与实际高度误差 < 10%，减少闪烁与重复测量。
- ❌ **非必要不优化**：除非遇到真实性能瓶颈，否则禁止进行盲目的 bundle 拆分或过度工程。

## useEffect 優化規範（鎖定）

- ✅ 聲明式狀態優先：data-* + CSS 替代命令式 classList
- ✅ DOM 同步副作用使用 useLayoutEffect
- ✅ 滾動鎖定使用 position:fixed + scrollY 記憶
- ❌ 禁止對 body 直接使用 overflow:hidden
- ❌ 禁止在未驗證第三方庫能力前重複實現鎖定

## 错误处理与 Mutation 规范（锁定）
- ❌ 禁止直接 `throw new Error()`，必须用 `ErrorFactory.wrap()`。
- ❌ 禁止在组件中直接使用 `useMutation`，必须用 `mutations/*` 下的工厂生成。
- ✅ 所有 Mutation 必须通过 `createMutationHook` 工厂生成。
- ✅ 声明式失效：必须通过 `invalidateKeys` 配置缓存失效，禁止在 `onSuccess` 中手动调用 `invalidateQueries`（除非有复杂的动态逻辑）。
- ✅ 降维打击：删除/移动操作必须同时失效所有相关实体的 key（例如 `deleteGroup` 必须失效 `groupKeys.all` 和 `photoKeys.all`）。
- ✅ 服务器端错误统一通过工厂 onError 报告（Toast + 上报）。
- ✅ 组件层调用 mutateAsync 时必须包裹 try/catch，仅用于控制 UI 流程（如关闭弹窗），禁止在 catch 中执行任何错误提示操作。


## 异步任务架构规范（锁定）

### 职责分层
- **createMutation 工厂**：原子写操作（API 调用 + 缓存失效 + 错误处理 + Toast）
- **useTaskExecutor**：流程编排（进度追蹤 + 并发控制 + 重试 + 任务队列 UI）

### 组合规则
- ✅ TaskExecutor 内部调用的业务逻辑必须封装为标准 Mutation
- ✅ TaskExecutor 使用 `mutateAsync` 调用 Mutation
- ❌ 禁止在 TaskExecutor 中直接调用 service/API 函数
- ❌ 禁止用 createMutation 替换 TaskExecutor（两者职责不同）

### 错误处理
- Mutation 负责 Toast + 日志
- TaskExecutor 负责更新任务状态 UI（不重复 Toast）

## React 19 Hooks 使用規範（鎖定）

### ❌ 禁止使用

- `useOptimistic`：樂觀更新統一使用 `createMutation` 工廠的 `optimisticUpdate`
- `useActionState`：表單狀態統一使用 `useMutation` + 本地狀態
- `useFormStatus`：表單提交狀態統一使用 `useTaskExecutor` 或元件本地 `useState`

### ✅ 允許使用

- 僅限**與服務器數據完全無關**的純 UI 互動（非常罕見）

### 理由

- 確保 Query Cache 作為單一事實來源
- 保持架構一致性，降低決策成本
- 避免樂觀更新與全局狀態不同步

## 系統模式統一與選擇規範（鎖定，2026-06-05）

為避免「兩套模式」並存造成的混亂，PhotoX 已鎖定以下架構選擇：

| 領域 | 鎖定方案 | 禁用/棄用方案 |
|------|----------|----------------|
| 樂觀更新 | ✅ `createMutation` 工廠 | ❌ `useOptimistic` |
| 表單狀態 | ✅ `useMutation` + 本地狀態 | ❌ `useActionState` |
| 表單提交狀態 | ✅ `useState` 或 `useTaskExecutor` | ❌ `useFormStatus` |
| 數據獲取 | ✅ TanStack `useQuery` | ❌ `useEffect` + `fetch` |
| 跨元件儲存 | ✅ Mantine `useLocalStorage` | ❌ 手寫 `localStorage` (React 內) |
| API 調用 | ✅ Hono RPC (`api.*.$post`) | ❌ 手寫 `fetch('/api/...')` |
| 篩選狀態 | ✅ URL Filters (`useUrlFilters`) | ❌ Zustand filter store |
| 彈窗管理 | ✅ `ConfirmDialog` + `useDisclosure` | ❌ 全域 `alertDialog` |

## 多语言架构规范（锁定）

### 数据库设计
- ✅ `groups` 表：`name` 字段存储 JSON，格式为 `{ zh: string, en: string, ms: string }`
- ✅ `furniture_items` 表：`name` 字段存储 JSON，格式同上
- ❌ 禁止使用 `name_en`、`name_ms` 等独立列

### 代码规范
- ✅ 写入时：`{ name: { zh, en, ms } }`
- ✅ 读取时：`const displayName = group.name[language] ?? group.name.zh`
- ❌ 禁止直接访问 `group.name_en` 或 `group.name_ms`

### 故障排查
- 报错 `Could not find 'name_en' column` → 检查代码是否错误写入了 `name_en`

## 乐观更新规范（锁定）

### ✅ 正确做法

使用 `createMutation` 工厂的 `optimisticUpdate` 参数：

```typescript
const deleteMutation = createMutation({
  mutationFn: (id) => api.deletePhoto(id),
  queryKey: ['photos'],  // 自动快取管理
  optimisticUpdate: (oldData, id) => oldData?.filter(p => p.id !== id),
});
```

工厂自动处理：

· onMutate：保存快照、执行乐观更新
· onError：还原快照、critical 上报、持久化横幅
· onSettled：失效快取

❌ 禁止项

· 禁止手动编写 onMutate / onError 的快照管理逻辑
· 禁止使用 React 19 useOptimistic（破坏 Query Cache 全局一致性）
· 禁止两套乐观更新机制共存

📌 特殊情况

如果 queryKey 需要根据 variables 动态决定（如精确失效单笔资料）：

```typescript
queryKey: (id) => ['photos', id],  // 支持函数形式
optimisticUpdate: (oldData, id) => ({ ...oldData, isDeleted: true }),
```

## 例外情况说明（锁定，2026-06-05）

- **非 React 环境**（如 `errorTracker.ts`、Worker、脚本）：允许使用原生 `localStorage` / `sessionStorage`
- **React 元件 / Hook 内**：必须使用 Mantine 的 `useLocalStorage` / `useSessionStorage`

## 路由与认证规范（锁定）

### 1. 认证状态（唯一来源）

- ✅ 使用 `useAuth.ts` 管理认证状态
- ✅ 监听 `supabase.auth.onAuthStateChange` 即时更新
- ✅ React Query 缓存 `staleTime: Infinity`，手动清除

### 2. 路由守卫（集中管理）

- ✅ 所有守卫逻辑集中在 `router.tsx` 的 `authGuard`
- ❌ 禁止在 `authGuard` 中使用 `redirect` 跳转
- ❌ 禁止在元件内使用 `navigate` 做权限跳转

### 3. 状态桥接（关键！）

- ✅ 在 `App.tsx` 中监听 `user` 变化
- ✅ 变化时调用 `router.invalidate()` 强制路由重新评估

### 4. URL 设计规范（锁定）

- ✅ URL 代表资源，不因登录状态而改变
- ✅ 路径稳定性：登录/登出后在同一 URL 状态下显示不同内容
- ✅ 登入表单：直接内嵌在 `/admin` 路径对应的组件中
- ✅ 公开路径：`/`、`/group/{id}`、`/error-log`
- ✅ 管理路径：`/admin` 开始的路径
- ✅ 登出：訪問 `/logout` 触发登出，后返回 `/`

### 5. 路由结构

- ❌ 禁止使用独立 `/login` 路由，避免 404


## 排序规范（锁定）

### 后端

- ✅ 所有列表查询必须使用 `ORDER BY created_at DESC, id ASC`
- ✅ 原因：确保 `created_at` 相同且在进行分页时，排序结果稳定（deterministic）

### 前端

- ✅ 直接使用后端回传的顺序
- ❌ 禁止对列表资料做任何 `sort()` 操作（除了必须纯前端处理的分组视图内部顺序，但底层列表尽量保持不要重排，如果是在内存里使用 `urlFilters` 可以处理，但从接口进来的不该在组件层重复排）

### 配置

- ✅ 所有分页/滚动加载的 `limit` 必须使用常量或集中配置（推荐 `LIMIT` 定义在 `PHOTO_QUERY_CONFIG`）
- ❌ 禁止在各组件中手写不同的 `limit` 值



## 编码补充（2026-06-06）

### 例外情况：useMemo 可用于稳定 Query Key

- ✅ 当物件作为 `useQuery` 的 `queryKey` 或参数时，可使用 `useMemo`
- ❌ 一般渲染逻辑仍禁止手动记忆化

## 架构极致化规范（锁定）

### Mutation
- ✅ 所有写操作必须使用 `createMutation` 工厂
- ❌ 禁止直接使用 `useMutation`

### 快取更新（铁律）
- ✅ 必须同时使用两种机制：
  1. `setQueryData`：更新当前页面 / 列表 / 明细（避免闪烁）
  2. `invalidateQueries`：同步其他页面 / 其他列表（确保一致性）
- ✅ 优先影响范围：
  - 当前画面：用 `setQueryData`
  - 其他查询：用 `invalidateQueries`
- ❌ 禁止只做其中一种

### Zustand
- ✅ 必须使用 selector 精确订阅
- ❌ 禁止无参调用 `useUIStore()`

### TanStack Query
- ✅ 列表页使用 `select` 缩小订阅字段
- ✅ 使用 `placeholderData: keepPreviousData`

### Virtua
- ✅ 生产环境配置 `overscan`、`shift`、`estimateSize`

## 弹窗与工具列协调规范（锁定，2026-06-06）

- ✅ 所有全域弹窗（ConfirmDialog / PromptDialog）必须上报 `useUIStore`
- ✅ 工具列订阅 `activeDialogCount`， >0 时自动隐藏
- ❌ 禁止直接调 `z-index` 解决弹窗与工具列冲突
- ❌ 禁止在全域层级观察 DOM（MutationObserver）

## 文件命名與目錄規範（鎖定）

### 一、目錄職責

- ✅ `src/hooks/core/`：通用、可跨專案複用的 Hook（如 `useAuth`、`useDebounce`、`useLocalStorage`）
- ✅ `src/hooks/`：與 PhotoX 業務邏輯相關的 Hook（如 `usePhotos`、`useGroups`、`useLightbox`）
- ✅ `src/services/[domain]/commands.ts`：所有寫入邏輯（Mutation、RPC）
- ✅ `src/services/[domain]/queries.ts`：所有讀取邏輯（TanStack Query）
- ❌ 禁止新增 `src/actions/` 目錄或類似 `*Actions.ts` 檔案
- ❌ 禁止在 `src/hooks/` 根目錄新建非業務 Hook

### 二、文件命名規則

| 類型 | 範例 | 規則 |
| --- | --- | --- |
| 通用 Hook | `useDisclosure.ts` | 駝峰式，`use` 前綴，放在 `core/` |
| 業務 Hook | `usePhotoMutations.ts` | 駝峰式，`use[Domain][Purpose]`，範圍為 PhotoX |
| UI 組件 | `ConfirmDialog.tsx` | PascalCase，放在 `components/ui/` |
| 業務組件 | `PhotoCard.tsx` | PascalCase，按領域分目錄 |
| 頁面 | `AdminPageContent.tsx` | PascalCase，按功能模塊分目錄 |
| 工具函數 | `formatters.ts` | 小寫 kebab-case，按功能域聚合 |
| 類型定義 | `photo.ts` | 小寫 kebab-case，按領域命名，禁止 `Types` 後綴 |
| 服務層 | `uploadService.ts` | 駝峰式，名稱包含具體動作，放在 `services/[domain]/` |

### 三、禁止事項

- ❌ 禁止文件名使用 `utils.ts`、`helpers.ts`、`index.ts` 以外的模糊名稱
- ❌ 禁止同一層級混用 `AdminXxx` / `XxxAdmin` / `xxx-admin`
- ❌ 禁止不同目錄下出現同名檔案（如兩個 `useLightbox.ts`）
- ❌ 禁止空檔案或僅數行的殘留檔案（< 10 行）

### 四、驗收標準

- ✅ 每次重構後必須執行 `find src -name "*.ts" -exec basename {} \; | sort | uniq -c | sort -rn | head -20` 檢查同名檔案
- ✅ AGENTS.md 中的規範作為 PR 審查依據，不符合即退回

---

## 鉤子工廠 (Hook Factories)
- ✅ `mutationFactory.ts`：所有寫操作 Mutation 的唯一來源。
- ✅ `queryFactory.ts`：標準化查詢 (Query/InfiniteQuery) 的封裝。
- ❌ 禁止在組件中手動拼接 `onMutate` 等樂觀更新邏輯，必須封裝入工廠。

---

## React Compiler 使用規範（鎖定）

### 必須刪除
- ✅ 組件內部的 `useMemo`（如 `const filtered = useMemo(() => data.filter(...), [data])`）
- ✅ 組件內部的 `useCallback`（如 `const handleClick = useCallback(() => {...}, [dep])`）
- ✅ 簡單的派生狀態

### 必須保留
- ✅ 傳遞給子組件的物件 props（`options={useMemo(() => ({...}), [deps])}`）
- ✅ Query Key 參數物件（避免無限請求）
- ✅ `useEffect` 依賴的函數（使用 `useCallback`）
- ✅ `React.memo`（Compiler 不處理組件級 memo）

### 可選刪除
- 📝 穩定不變的函數（Compiler 會處理，但保留也無害）

---

## 错误处理规范（严格锁定）

### Service 层（src/services/）
- ✅ 所有公开函数必须返回 `AppResult<T>`
- ✅ 使用 `withErrorHandling` 包裝器消除样板代碼
- ❌ 禁止 `throw new Error()`（包括参数校验）
- ❌ 禁止在同一函數中混用 throw 和 return
- ⚠️ `withErrorHandling` 唯一职责：显式转换 `throw` 为 `AppResult`。严禁在其中进行业务检查、批处理等逻辑。

### Hook 层（src/hooks/）
- ✅ 在 Mutation 工厂中检查 `result.ok`，失败时触发 onError
- ❌ 禁止对 Service 层調用使用 try/catch

### 基础设施层（api/lib/, src/utils/）
- ✅ 允许 throw（网络错误、JSON 解析失败等非预期错误）
- ✅ Service 层通过 withErrorHandling 捕獲並轉換為 AppResult

---

## 目錄結構演進記錄

- 2024 Q3: 引入 `features/` 目錄，嘗試 Vertical Slice 架構
- 2025 Q2: 移除 `features/`，回歸技術分層
- 原因: 項目規模未達 Vertical Slice 閾值（團隊<3人，Feature<8個），features/ 退化為冗餘間接層
- 重新評估條件: 團隊 ≥ 3人 AND Feature ≥ 8個 AND 每個 Feature 有完整四層（UI/Hook/Service/Type）

## Hooks 目錄規範（鎖定）

### 結構
- `hooks/core/` — 通用 Hook，零業務依賴，禁止 import `services/` 或其他 `hooks/`
- `hooks/[domain]/` — 業務 Hook，按實體組織（photo/group/admin）
- 每個 domain 目錄必須有 `index.ts` 統一導出（強制配置 JSDoc 註釋）

### 依賴矩陣（鎖定）

| Hook | 依賴 services/ | 依賴 store | 被哪些組件使用 |
|------|---------------|-----------|--------------|
| `usePhotoEdit` | ❌ | ❌ | `PhotoEditDrawer` |
| `usePhotoSelection` | `photo/commands` | `useUIStore(selectedIds)` | `AdminGridContainer` |
| `usePhotoFilter` | ❌ | ❌ | `PublicGridContainer`, `FilterPanel` |
| `usePhotoGallery` | `photo/queries` | `useUrlFilters` | 所有網格列表組件 |
| `useGroupView` | `group/queries` | ❌ | `GroupDetailPage` |
| `useAdminPhotos` | `photo/queries` | ❌ | `AdminPageContent` |

### 依賴規則（嚴格單向）
- `core/` → ❌ 禁止 import `[domain]/` 或 `services/`
- `[domain]/` → ✅ 可 import `services/` + `store/` + `core/`
- `[domain]/` → ❌ 禁止 import 其他 `[domain]/`
- `components/` → ✅ 可 import `hooks/` | ❌ 禁止直接 import `services/`

### 合併原則
- 同一交互流程的多個 Hook 應合併為單一文件
- 判斷標準：是否總被同一組件同時使用
- 禁止為每個小功能創建獨立 Hook 文件

## 架構決策原則

- 架構決策沒有「永遠正確」，只有「當前規模下的最優解」
- 當實際反饋證明某個抽象是多餘的，果斷移除
- 所有架構演進必須記錄到本文件，包含引入原因和移除條件

## 上传架构规范（锁定）

- ✅ R2 预签名直传为主路径（无大小限制）
- ✅ 服务端中转仅作为 < 4MB 文件的 fallback
- ✅ ≥ 4MB 文件直传失败时提示用户重试，禁止走中转
- ❌ 禁止设置全局文件大小上限来规避基础设施限制
- ❌ 禁止将 Vercel body limit 等技术约束暴露为产品规格

## 日志写入规范（锁定）

- ✅ 所有错误日志通过 POST /api/log-error 写入
- ✅ 该端点使用 supabaseAdmin，不受 RLS 限制
- ✅ 前端 logErrorToSupabase() 内部封装此 API 调用
- ❌ 禁止在任何前端代码中直接 supabase.from('system_logs').insert()
- ❌ 禁止日志写入依赖用户认证状态

## Supabase 关联查询规范（锁定）

- ✅ photo_tags 与 tags 的 JOIN 必须显式指定外键：
  `tags!photo_tags_tag_id_fkey(id, name)`
- ❌ 禁止使用模糊关联 `photo_tags(tags(...))`

## 照片映射规范（锁定）

- ✅ 所有照片查询必须通过 `mapSupabasePhoto` 转换，严格使用 `photo.tags` 获取标签数据。
- ❌ 禁止在组件或 Hook 中手写 `photo_tags` JOIN 查询或进行标签数据的二次加工（如 `map(t => t.name)`）。
- ✅ 照片对象中禁止存在 `tagNames` 冗余字段。

## 孤本照片防護規範（鎖定）

### 預防
- ✅ 上傳流：先上傳 R2，成功後且獲得 URL 後再回寫 DB 記錄。
- ✅ 刪除流：先標記為刪除中（is_deleting），非同步或分步清理 R2，最後刪除 DB。
- ✅ 事務順序：R2 Success -> DB Payload -> Tag Sync.

### 自動修復
- ✅ 數據庫約束：`image_url` 不允許為空且必須以 http 開頭。
- ✅ 定期清理：管理後台提供「清理孤本照片」按鈕，執行 R2 與 DB 的深度比對。

## 實體刪除規範（鎖定）

- ✅ **關聯優先**：刪除任何被引用的實體（如組、分類、標籤）時，必須先解除所有引用關係。
- ✅ **手動清理**：即使 DB 有 `ON DELETE SET NULL`，Service 層也必須顯式執行 `update({ ref_id: null })` 以確保前端寫入快取失效。
- ✅ **緩存聯動**：刪除操作的 Mutation 必須失效所有相關實體的緩存（例如刪組時需失效 `photoKeys.all`）。
- ❌ 禁止要求用戶通過刷新頁面來解決刪除後的數據殘留。

## AI 分析服务层规范（锁定，2026-06-09）

- ✅ 唯一编排入口：`analyzeAndSavePhoto()` in `src/services/ai/orchestration.ts`
- ✅ 标签写入必须通过 `syncPhotoTags()`，禁止在 `updatePhoto` 中包含 `tag_ids`
- ✅ 翻译仅针对文本字段（name/description），标签名称不翻译
- ❌ 禁止在 Hook 层直接组合 AI 调用 + 翻译 + 保存
- ❌ 禁止在任何 AI 相关代码中使用 `tag_ids` 字段

### 非原子性说明
- `updatePhoto` 和 `syncPhotoTags` 是两次独立调用
- 照片保存成功但标签同步失败时，照片仍会保存，标签需手动重试
- 未来可考虑引入 Supabase RPC 实现事务原子性

## 自动诊断规范（锁定，2026-06-09）

- ✅ **核心原则**：主动预防性发现高风险数据问题，利用低成本检测降低维护压力。
- ✅ **检测项目**：
  - **孤本照片**：数据库中 `image_url` 缺失或格式错误的记录。
  - **孤儿引用**：照片 `group_id` 指向已不存在的分组实体。
  - **AI 服务健康**：验证 `settings` 中 `gemini_api_key` 是否配置。
- ✅ **执行机制**：每 6 小时自动执行一次，结果写入 `system_logs` (level: 'info'/'warning'/'error', context: 'auto_diagnose')。
- ✅ **资源复用**：无。复用 `system_logs` 表，不建立新表，不引入第三方库。
- ✅ **手动联动**：诊断日志集成于 `DiagnosticsDashboard` 的日志面板。
- ❌ **禁止项**：
  - 禁止在无用户介入的情况下自动执行破坏性写操作（如自动物理删除 R2 文件）。
  - 禁止高频率（如每分钟）检测，避免不必要的数据库 IO 开销。

## AI 审计与生命周期规范（锁定，2026-06-09）

- ✅ **核心原则**：所有 AI 任务必须可回跳、可对账、可审计。
- ✅ **唯一出口**：所有 AI 写入管道必须集成 `saveAIAuditLog()`。
- ✅ **核心字段**：必须记录 `task`, `model`, `latency_ms`, `token_usage`, `status`。
- ✅ **存储策略**：

## OptimizedImage + Lightbox 規範（P4 鎖定）

### OptimizedImage
- ✅ decoding="async" 永遠啟用
- ✅ eager 僅用於 LCP / 首屏可見圖片
- ❌ 禁止在 Virtua 內使用 loading="lazy"

### Lightbox（YARL）
- ✅ srcSet 必須配合 sizes="100vw"
- ✅ 縮略圖設置 key={src} 防止殘影
- ✅ 僅引入 Captions/Zoom 等必要插件
- ✅ carousel.preload 移動端 ≤1，桌面端 ≤2
- ❌ 禁止移動端 preload > 1

## 圖片組件規範（鎖定）

- ✅ OptimizedImage 用於單一 src 場景
- ✅ ContractedImage 保留用於需要 srcSet/picture 的響應式場景
- ❌ 禁止在 OptimizedImage 未支援 srcSet 前強行合併
- 📝 圖片組件收斂條件：OptimizedImage 支援 srcSet + ContractedImage 引用數 ≤3

## 技術債清理規範

- ✅ 刪除零引用模組前必須 grep 確認
- ✅ 替換核心邏輯前必須行為等價驗證
- ❌ 禁止跳過驗證直接批量替換
  - Hot Storage: `ai_audit_logs` 表（保留 30 天）。
  - Cold Storage: R2 JSON 归档（长期保留，用于成本审计）。
- ❌ **禁止项**：禁止在 AI 失败时静默重试而不留日志。

## 多语言三层防护规范（锁定，2026-06-09）

### 第一层：后端清洗 (Sanitization)
- ✅ 所有入库的 name/description 必须经过 `normalizeI18n()`。
- ✅ 即使 AI 返回纯字符串，也必须封装为 `{ zh, en, ms }`。

### 第二层：SQL 修复 (Repair)
- ✅ 管理后台必须提供 `repair_i18n_names` 工具，用于修复存量 string 数据。
- ✅ 定期扫描并归一化非标准 JSON 字段。

### 第三层：前端降级 (Safe Access)
- ✅ 渲染层必须使用 `getSafeText()` 或 `safeText()` 助手。
- ✅ 渲染逻辑：`requested -> zh -> en -> ms -> "-"`。
- ❌ 禁止在组件内直接使用 `photo.name.en` 等不安全路径。

## 诊断中心路由规范（锁定，2026-06-09）

- ✅ **核心原则**：诊断中心状态必须由 URL 驱动，禁用 Zustand 管理 activeTab。
- ✅ **路由映射**：
  - `/admin/diagnose` → 诊断概览
  - `/admin/tasks` → 任务列表
  - `/admin/error-logs` → 错误日志
- ✅ **跳转逻辑**：所有诊断面板间的切换必须使用 `navigate()`。

## 错误处理贯穿系统规范（锁定，2026-06-09）

## 错误对象架構邊界（鎖定）

- ✅ 後端 AppError 定義在 `api/lib/error/AppError.ts`，為 class
- ✅ 前端 StandardError 定義在 `src/lib/types/error.ts`，為 interface
- ❌ 禁止後端 import 前端的錯誤類型
- ❌ 禁止前端 import 後端的錯誤類別
- ✅ 兩者通過字段契約對齊，而非代碼共享
- ✅ traceId 僅通過 Response Header 傳輸，Mutation 工廠為唯一注入點

## 錯誤追蹤貫通規範（鎖定）

- ✅ 所有後端錯誤響應必須附帶 `X-Trace-Id` Header
- ✅ Trace ID 由後端生成，前端僅提取與傳遞
- ✅ 複製錯誤內容必須包含 Trace ID
- ✅ 後端日誌必須記錄同一 Trace ID

## TypeScript 7.0 規範（鎖定）

### 配置要求
- ✅ `types` 必須包含 `["node", "vite/client"]`
- ✅ `rootDir` 必須顯式設定
- ✅ 使用 `paths` 替代 `baseUrl`
- ✅ 使用 `tsgo` 替代 `tsc`

### 禁止事項
- ❌ 禁止使用已棄用的 `baseUrl`
- ❌ 禁止假設 `@types/node` 會自動載入
- ✅ 去重 ID 基於 `context + errorCode`
- ❌ 禁止使用動態 message 作為去重 key
- ❌ 禁止前端自行生成 Trace ID
- ❌ 禁止前端額外發送 `/api/log-error` 請求

## 錯誤工廠規範（鎖定）

- ✅ 使用 `errorFactory.create()` 創建新錯誤
- ✅ 使用 `errorFactory.wrap()` 包裝外部錯誤
- ✅ 使用 `errorFactory.success()` 返回成功結果
- ✅ 使用 `errorFactory.fail()` 返回失敗響應

## 合組模組規範（鎖定）

### 決策標準
- ✅ 權限敏感的邏輯 → 物理拆分（查詢 Hook、Mutation）
- ✅ 權限無關的邏輯 → 安全合併（照片網格、Header）
- ✅ Service 層可合併，但需用 `mode` 參數區分

### 共享組件原則
- ✅ 共享組件必須是純展示，不包含數據獲取
- ✅ 共享組件透過 props 接收所有數據
- ❌ 禁止在共享組件內部進行權限檢查


## L3 Web Worker 規範（鎖定，2026-06-09）

- ✅ **核心原則**：耗時的 `processPhotos`（篩選、分組、排序）必須在 Worker 中執行，以保證主線程 60fps 滾動。
- ✅ **降級策略**：Worker 失敗時必須自動降級到主線程同步執行，並通過 `logger.warn` 記錄。
- ✅ **唯一出口**：所有照片網格容器必須通過 `useProcessedPhotos` 獲取處理後的數據。
- ✅ **異步感知**：當 Worker 正在處理時，`isLoading` 應反映此狀態以顯示骨架屏（Skeleton）。
- ❌ **禁止項**：禁止在主線程直接調用 `processPhotos`（除非是降級路徑或數據量極小的情況）。

## AI 識別系統規範（鎖定）

### 模型配置
- ✅ 模型名稱從資料庫讀取，作為純變數傳遞
- ❌ 禁止硬編碼模型名稱

### 審計日誌
- ✅ AI 原始響應統一寫入 `system_logs.metadata`
- ❌ 禁止使用 `photo_ai_results` 表

### 標籤處理
- ✅ 標籤數量限制（最多 3 個）只在 `syncPhotoTags` 執行
- ✅ 限制方式：取前 3 個（slice(0, 3)）
- ✅ 無論來源（AI / 手動）都走同一條邏輯
- ❌ 禁止在其他地方做限制

### 翻譯
- ✅ 只翻譯 `name` 和 `description`
- ❌ 禁止翻譯 `tags`

### 前端 UI
- ✅ 只負責顯示和發送請求
- ❌ 禁止做數量限制、過濾判斷

## AI 識別兜底規範（鎖定）

- ✅ 強化 JSON 解析：支援 Markdown 移除、片段提取
- ✅ 自動重試：最多 3 次，指數退避（1s, 2s, 4s）
- ✅ 降級輸出：失敗時返回預設值，不中斷流程
- ✅ 審計記錄：所有失敗寫入 `system_logs`
- ❌ 不新增額外表單或管理頁面（使用現有功能重試）

## 翻譯分工作業與規範（鎖定）

- ✅ 只翻譯 `name` 和 `description` 欄位
- ❌ 禁止翻譯 `tags`（標籤）
- ❌ 禁止翻譯 `category_id`（分類 ID）
- ✅ AI Prompt 要求返回 `category_id`（ID），而非分類名稱
- ✅ 中文（zh）由 Gemini 直接產出
- ✅ 英文（en）由 Agnes 翻譯補全
- ✅ 馬來文（ms）由 Agnes 翻譯補全
- ✅ AI 分析後，檢查 en/ms 是否缺失，缺失則調用 Agnes
- ❌ 禁止 Gemini 處理英文/馬來文翻譯
- ❌ 禁止 Agnes 處理中文識別

## 長期穩定性規範（鎖定，2026-06-10）

### Supabase 客戶端
- ✅ 使用單例模式，禁止每次請求新建。
- ✅ 後端 API 使用 `getSupabaseAdmin()` 單例。

### 背景任務
- ✅ 只有登入用戶才啟動背景診斷（`startAutoDiagnose`）。
- ✅ 訪客模式下不發送任何需要認證的請求。

### 診斷工具
- ✅ 使用 React Query 緩存（`staleTime >= 30s`）。
- ✅ 避免頻繁重複請求。

### 審計日誌
- ✅ 統一走 POST `/api/log-error`。
- ❌ 禁止前端直連 Supabase 寫日誌。

### 標籤處理
- ✅ 數量限制（最多 3 個）只在 `syncPhotoTags` 和 `syncBatchPhotoTags` 執行。
- ❌ 禁止在前端做限制。

## Vercel Serverless 約束（鎖定，2026-06-10）

- ✅ 使用 Hono `.route()` 合併多個 handler 到單一入口（如 `api/admin.ts`）
- ✅ 入口檔案僅做路由掛載，禁止包含業務邏輯
- ❌ 禁止為減少 Function 數量而合併業務代碼
- ✅ 適配 Vercel Hobby 12 Functions 限制

## AI 審計日誌規範（鎖定）

- ✅ AI 原始輸出儲存到 R2（冷儲存）
- ✅ 資料庫 `ai_audit_logs` 只存 `raw_storage_path`
- ✅ 先上傳 R2，成功後再寫資料庫
- ✅ 資料庫寫入失敗時刪除 R2 檔案（防止孤本）
- ❌ 禁止將 AI 原始輸出存入 `system_logs`
- ❌ 禁止 AI 日誌寫入失敗時留下孤本

## 剪貼板使用規範（鎖定，2026-06-11）

- ✅ **唯一出口**：組件內必須使用 `useCopyToClipboard` Hook。
- ✅ **唯一出口（非 Hook）**：底層工具函數必須使用 `src/utils/clipboard.ts` 中的 `copyToClipboard`。
- ✅ **一致性提示**：複製行為必須伴隨 `toast` 反饋（預設已在工具/Hook 中集成）。
- ❌ **絕對禁令**：禁止在各處直接調用 `navigator.clipboard.writeText`。
- ❌ **絕對禁令**：禁止使用 Mantine 的 `useClipboard`（功能過於簡陋）。

## z-index 與燈箱規範（鎖定）

- ✅ z-index 統一使用 CSS 變數管理，禁止硬編碼
- ✅ 層級順序：Lightbox > Tooltip > Toast > Dialog > Drawer > Loading > Sticky > Dropdown
- ✅ 燈箱開啟時必須鎖定 body 滾動（使用鎖計數器）
- ✅ Lightbox 配置中的 z-index 必須引用 CSS 變數
- ❌ 禁止 Toast z-index 高於 Lightbox
- ❌ 禁止在燈箱狀態中使用 useUIStore

### 層級對照表
| 元件 | 變數 | 數值 |
|------|------|------|
| 燈箱內容 | `--z-lightbox-content` | 1002 |
| 燈箱主體 | `--z-lightbox-container` | 1001 |
| 燈箱背景 | `--z-lightbox-backdrop` | 1000 |
| Tooltip | `--z-tooltip` | 600 |
| Toast | `--z-toast` | 500 |
| Popover | `--z-popover` | 400 |
| Dialog | `--z-dialog` | 300 |
| Drawer | `--z-drawer` | 200 |
| Loading | `--z-loading` | 150 |
| Sticky | `--z-sticky` | 100 |
| Dropdown | `--z-dropdown` | 50 |

## 通知與載入規範（鎖定）

- ✅ **唯一出口**：所有通知必須使用 `src/lib/ui/toast.ts` 中的 `showToast`
- ✅ **全屏載入**：全屏載入狀態必須使用 `LoadingOverlay` 元件
- ✅ **層級一致**：`LoadingOverlay` 必須使用 `--z-loading` 層級
- ❌ 禁止直接調用 `sonner` 的 `toast` (除非是在 `showToast` 內部)
- ❌ 禁止在 AI 分析等耗時操作中不顯示 `LoadingOverlay`

## 合組詳情頁規範（終局鎖定）

- ✅ GroupDetailPage / GroupAdminShell 是獨立路由頁面，非彈窗
- ✅ 使用 flex 佈局隔離，禁止 fixed/z-index/Modal/dialog
- ✅ 頁面切換使用 View Transitions API 保持視覺連續
- ✅ 列表頁必須支援滾動位置恢復
- ❌ 禁止用彈窗技術承載獨立頁面語義

## 自研 UI 組件規範（2026-06-13 最終鎖定）

### 核心原則
- ✅ **零 shadcn/ui 依賴**：完全移除解決方案中對外部組件庫的依賴。
- ✅ **現代 CSS 優先**：浮層（Dropdown/Popover）必須優先使用 **CSS Anchor Positioning**。
- ✅ **原生語義**：所有彈窗/遮罩統一使用原生 `<dialog>` 元素。
- ✅ **ARIA 完整性**：所有交互組件必須具備完整的語義標籤與鍵盤導航支援（Home/End/Arrows）。

### 技術方案
- **Dropdown**：CSS Anchor Positioning + `@supports` fallback + `motion` 動畫。
- **Tabs**：`AnimatePresence` + `LayoutId` 運動導向 + 完整 ARIA 鍵盤劫持（focusTab）。
- **Table**：`@tanstack/react-table` 作為唯一邏輯引擎，手動編寫原生 `<table>` 樣式。

### 禁止事項
- ❌ **禁止 z-index 濫用**：在現代瀏覽器（支援 Anchor）的路徑下，禁止為下拉選單設置 z-index。
- ❌ **禁止 z-index 污染**：在 fallback 路徑中使用 z-index 時，必須添加 `FALLBACK ONLY` 註釋。
- ❌ **禁止混合模式**：禁止在同一專案中同時使用 shadcn/ui 元件與對應功能的自研元件。
- ❌ **禁止配置殘留**：刪除 `components.json` 及所有 `@/components/ui` 下的舊套件代碼。

## 動畫技術棧終局規範（永久鎖定）

### 動畫分層
- ✅ L1: CSS 原生（Tailwind transition/animation、View Transitions、@starting-style）
- ✅ L2: @dnd-kit/core（僅拖拽排序）
- ✅ L3: Framer Motion（僅 Lightbox 手勢、複雜物理彈簧、CSS 無法實現的狀態機）

### 使用限制
- ❌ 禁止對 fade/slide/hover/tap 使用 Motion
- ❌ 禁止對滾動驅動動畫使用 Motion
- ❌ 禁止使用其他動畫庫（react-spring、gsap 等）
- ✅ 新增 Motion 使用點必須在 PR 中說明「CSS/dnd-kit 為何無法實現」

### 驗證標準
- 📝 每季度執行 `npm why framer-motion` 檢查體積
- 📝 Lighthouse 動畫相關評分 ≥ 95

## React Hook Form 效能規範（鎖定）

### 禁止（會導致全表單重渲染）
- ❌ `watch()` 無參數 → 改用 `useWatch({ name: 'field' })`
- ❌ 頂層讀取 `formState.errors` → 改用 `<ErrorMessage />`
- ❌ 頂層讀取 `formState.isDirty/isValid` → 僅在提交按鈕處讀取

### 必須（結構優化）
- ✅ Tab 內容必須條件渲染 `{active === 'x' && <Component />}`
- ✅ 昂貴計算使用 `useMemo`
- ✅ 選項列表 >50 使用 Combobox（Headless UI / CmdK）

### 診斷
- ✅ 優化前必須使用 `useRenderCount` 定位瓶頸
- 📝 StrictMode 下計數會翻倍，使用防護版本

### Combobox + RHF
- ✅ 必須使用 `useController` 綁定，禁止手動 `register`

## ErrorFactory 使用規範（永久鎖定）

### 錯誤創建
- ✅ 必須使用 `ErrorCode` 枚舉，禁止魔法字串
- ✅ 優先使用語義化快捷方法（validation/notFound/network/fatal）
- ✅ 捕獲底層錯誤時必須通過 `cause` 參數傳遞

### 錯誤上報
- ✅ 使用 `reportError()` 統一上報
- ✅ INFO 級別不上報遠程，僅本地調試
- ❌ 禁止在 `reportError` 的 catch 中再次調用 `reportError`

### 序列化安全
- ✅ 使用 `toJSON()` 方法輸出日誌
- ❌ 禁止在 `context` 中放入 DOM 節點、函數
- ❌ 禁止手動拼接錯誤日誌字串

### 測試要求

- 📝 新增錯誤類型必須補充單元測試

## 彈出式組件技術棧規範（永久鎖定）

### 技術選型
- ✅ 統一使用 @base-ui/react 作為唯一彈出層基礎庫
- ✅ 所有 Dropdown/Popover/Modal/Tooltip 必须通過 Base UI 實現
- ❌ 禁止自研彈出層組件（含 Portal/FocusTrap/碰撞檢測/鍵盤導航）
- ❌ 禁止新增 Radix UI / Headless UI / Floating UI 依賴
- 📝 現有舊庫組件在重構時逐步遷移至 Base UI

### 層級管理
- ✅ Base UI 內建 Portal + <dialog> Top Layer，無需手動處理
- ✅ 固定定位輸入欄位容器必須設定 pointer-events: none
- ❌ 禁止使用 z-index 解決彈出組件遮擋問題
- ❌ 禁止在 Header/Sticky 容器內使用 CSS absolute 實現下拉菜單

### 樣式規範
- ✅ Base UI 為零樣式 Headless，所有視覺通過 className + Tailwind 控制
- ✅ 使用 data-[highlighted] / data-[disabled] 等屬性選擇器驅動狀態樣式
- ❌ 禁止覆蓋 Base UI 內部 DOM 結構的默認行為

## 燈箱受控模式規範（鎖定）

- ✅ 使用 `apiRef` 獲取 `ReelApi` 實例
- ✅ 點擊縮圖時調用 `apiRef.current.goTo(idx)`
- ✅ 同時更新父層 `currentIndex` 狀態
- ✅ 縮圖軌道使用 CSS Scroll Snap 實現自動滾動
- ❌ 禁止不使用 `apiRef` 而依賴 `currentIndex` prop
- ❌ 禁止在組件中直接操作 DOM 滾動

## 認證狀態管理規範（鎖定）

- ✅ 使用 Zustand + 原生 Supabase 管理認證狀態
- ❌ 禁止使用 TanStack Query 管理認證狀態
- ✅ 全域監聽僅初始化一次
- ✅ 登入按鈕必須有本地原子鎖

## 動畫技術棧規範（鎖定）

- ✅ 優先使用 CSS 動畫（`animate-fade-in`、`transition`）
- ✅ 僅共享佈局動畫（`layoutId`）或拖拽場景可使用 Motion
- ❌ 禁止對 fade-in / slide-up / hover / tap 使用 Motion
- ❌ 禁止新組件引入 Motion
- 📝 現有 Motion 使用逐步替換為 CSS

## 認證狀態規範（鎖定）

- ✅ Zustand Store 只儲存 `user` 和 `isLoading`
- ✅ `isAdmin` 從 `!!user` 推導，禁止另外儲存
- ✅ 使用 selector 讀取狀態，避免不必要的重渲染

## Z-index 警告（重要）
如果你再用zindex不遵守规范，就要赔偿我一百万。

## 客戶端快取規範（永久鎖定）

### 核心原則
- ✅ 服務端狀態統一由 TanStack Query 記憶體快取管理
- ✅ 使用者偏好統一由 storage.ts (localStorage) 管理
- ❌ 禁止引入 IndexedDB 相關依賴（idb, dexie, query-persist-client-core）
- ❌ 禁止自建 CacheService 或 IndexedDB Adapter

### 重新評估觸發條件（必須同時滿足）
1. 實測證明：Chrome DevTools Performance 顯示記憶體快取導致 OOM 或嚴重卡頓
2. 規模達標：單頁持久化數據量 > 1MB（約 2000+ 張照片元數據）

### 理由
PhotoX 當前單頁數據 < 100KB，IndexedDB 收益為零且增加 Bundle Size 與調試複雜度。

## 架構紅線（永久鎖定）

### 型別安全
- ✅ 所有 API Schema 必須與 Drizzle Schema 同步（CI 自動檢查）
- ✅ 所有路由必須有 `beforeLoad` 型別安全 Guard
- ✅ 所有 `useOptimisticMutation` 必須有回滾測試

### 禁止事項
- ❌ 禁止重新引入 `member_count` 冗餘欄位
- ❌ 禁止引入邊緣快取（除非 PV > 10K/天）
- ❌ 禁止為低頻調試需求建立專用 UI
- ❌ 禁止未經實測的假設性優化

## 資料庫變更規範（永久鎖定）

- ✅ 所有變更透過 Migration
- ❌ 禁止手動修改資料庫

## Ref 型別規範（永久鎖定）

- ✅ 使用 `toMutableRef(ref)` 處理第三方元件的 mutable ref 需求
- ✅ `toMutableRef` 必須用 overload 簽名實現，禁止內部使用 `as`
- ✅ 自訂元件統一用 `React.forwardRef` 暴露 ref
- ❌ 禁止在元件中直接寫 `ref as MutableRef`
- ❌ 禁止用 `@ts-ignore` 繞過 ref 型別
- 📝 React 19 升級後若 RefObject 原生 mutable，則廢棄此工具

## 物化視圖現狀（2026-06-18）

### 手動建立的物件
- `v_photos_list` 物化視圖（在 Supabase SQL Editor 手動建立）
- `idx_v_photos_list_id` 唯一索引
- `idx_v_photos_list_group_id` 索引
- `idx_v_photos_list_category_id` 索引
- `idx_v_photos_list_pinned` 索引

### 後續行動
- 當 Drizzle Kit 修復後，補上 Migration 檔案
- 驗證 Migration 與資料庫一致

## 物化視圖規範（永久鎖定）

### 核心原則
- ✅ 物化視圖定義必須在 `src/db/views.ts` (及 `api/_lib/db/views.ts`) 中聲明
- ✅ Migration 檔案必須納入 `supabase/migrations/` 目錄
- ✅ 所有視圖必須有唯一索引以支援 `REFRESH CONCURRENTLY` 或背景手動刷新
- ✅ 寫入操作必須觸發視圖刷新 (CQRS 機制)
- ❌ 禁止在 Supabase SQL Editor 中手動建立視圖（除非緊急情況）
- ❌ 禁止繞過 Drizzle Migration 管理視圖

### 緊急情況處理
- 若 Drizzle Kit 無法執行，可在 SQL Editor 或 scripts 中手動建立
- 手動建立後必須補上 Migration 檔案
- 手動操作必須記錄在 AGENTS.md 的「物化視圖現狀」區塊
