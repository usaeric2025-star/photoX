# PhotoX 核心开发规范 (2026-07 最終鎖定)

## 1. 核心技术栈
- **状态管理**: 
  - URL 状态 (唯一真相来源): `nuqs`
  - 全局/UI 状态: `Jotai` (Atom)
  - Server State: `TanStack Query` (`useAppQuery`), 写入通过 `queryClient` 处理。
  - 选择状态: `SelectionService` (使用 `useIsMultiSelect`, `useSelectionActions` 等)
- **表单**: `@tanstack/react-form` + `Valibot` (取代 Zod/ArkType)
- **动画**: `lite-sleek` (进出场/交错) + 纯 CSS (悬停/淡入)
- **路由**: `wouter`
- **后端**: Vercel Serverless + Hono (RPC)
- **数据库**: PostgreSQL + Drizzle ORM (严禁手动写 SQL)

## 2. 数据流与架构边界
- **原子化管理**: 
  - 所有全局/UI 状态必须定義為 Jotai 原子。
  - 嚴禁使用 `@preact/signals-react`、`Signal` 或 `useSyncExternalStore` 等舊有方案。
  - **扁平化原則**: 相近領域的原子應整合在單一檔案內（如 `uiAtoms.ts`, `appAtoms.ts`），嚴禁為單個變量建立微型檔案。
- **Hook 導入**: 統一從 `src/hooks/` 導入，按領域分類。
- **API 路由**: 必须通过 Hono RPC (`hc`) 呼叫，严禁手动拼接 `/api/xxx`。

## 3. UI 与错误处理
- **性能控制**: 
  - **严禁使用 backdrop-blur**: 在灯箱 (Lightbox)、长列表、照片网格 (Photo Grid) 等性能敏感区域，严禁使用 `backdrop-blur` (毛玻璃) 滤镜。统一使用带透明度的实色背景 (如 `bg-black/80`)。
  - **动画控制**: 复杂列表动画必须使用 `lite-sleek` 或纯 CSS，禁止在大规模 DOM 节点上使用高开销的 JS 动画。
- **错误处理**: 所有错误统一使用 `ErrorFactory.handle`，禁止 `console.error` 散落各处。
- **Toast**: 统一使用 `sonner` (`toast.success` 等)。
- **弹窗**: 使用 `src/components/ui/Modal.tsx` (基于原生 `<dialog>`)，严禁 createPortal 或 z-index 模拟。
- **UI 结构与导航规范**: 严禁未经批准擅自增加侧边栏 (Sidebar) 或底层导航栏等新结构。如有新增功能或跳转链接的需求，**必须**统一整合进右上角的菜单 (Top-right menu / Header actions) 内，除非获得用户的明确批准。

## 4. 图片载入 (Worker 唯一来源)
- **尺寸标准 (严格遵循)**:
  - **主图 (灯箱/全屏)**: `getThumbnailUrl(key, 800)`
  - **中图 (网格 MD 变体)**: `getThumbnailUrl(key, 400)`
  - **缩图 (网格 SM 变体/轨道/卡片)**: `getThumbnailUrl(key, 120)`
- **加载策略**:
  - **优先级 (Priority)**: 视图首屏前 12 张图片、灯箱当前/相邻图片，必须设置 `priority={true}` 以优化 LCP。
  - **缓存一致性**: 必须传入 `imageHash` 给 `getThumbnailUrl` 以支持 CDN 缓存刷新。
- **禁止直接使用 R2 原始 URL** (`image_url`) 作为缩图。
- **组件规范**: 统一使用 `Image` 组件，利用其内置的骨架屏与渐进淡入效果。

## 5. ES Module 导入规范 (后端)
- 导入时**必须指定具体档案与 `.js` 结尾** (如 `import { db } from '../_lib/db/index.js'`)。
- **禁止**导入目录而不指定 `index.js`，以避免 `ERR_UNSUPPORTED_DIR_IMPORT`。

## 6. 清理与 Knip 规则 (严禁删除入口文件)
- **严禁删除关键入口**：在使用 `knip` 或进行任何档案/代码清理时，**绝对禁止**删除 `api/index.ts`、`server.ts` 等平台关键 Entry Points，即使清理工具误将其判定为无效或未使用的文件。
- **Vercel 签名规范**：`api/index.ts` 必须采用 Vercel 推荐的 Named 导出（例如：`GET`, `POST`, `PUT`, `DELETE` 等，调用 `app.request(request)`），以防出现 Vercel 函数签名警告及 504 请求挂起超时。
- **减少高频请求**：尽可能避免添加额外的全量 `/count` 单独高频轮询请求，应优先使用 list API 内含的 `total` 或本地/UI 状态中的计数。

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

## 7. 模块化、过度拆分与状态管理规范 (避免过度设计与碎片化)

### 规则 1：拒绝微型文件与无意义的多层包装
- **拒绝微型 Hook 文件**：严禁为单一的 Query 或 Mutation 建立独立的 React Hook 文件。例如：分类（Category）的增、删、改应统一合并至 `useCategoryMutations.ts`（或直接整合在 `useCategories.ts`）中，严禁拆分成 `useCategoryCreate.ts`、`useCategoryEdit.ts` 与 `useCategoryDelete.ts` 等多个微型文件。
- **减少包装转发层级**：避免为了包装而包装。例如：`useSettingsManagement` 直接包装 `useAdminCategory`，而 `useAdminCategory` 又包装了多个微型的 `useCategory*` / `useTag*` 钩子，这导致了极深的调用栈和碎片化。未来应将相近领域的逻辑在适当的领域 Hook（如 `useSettingsManagement`）内直接进行扁平化整合。

### 规则 2：三大状态体系的严格边界
- **URL 状态 (唯一的视图真相来源 - `nuqs`)**：
  - 适用场景：搜寻、筛选、分页、多选 IDs (`selected`)、批量模式开关 (`batch`)。
  - 核心原则：禁止使用 `useEffect` 将 URL 状态与本地 State / Store 进行二次同步。
- **UI 瞬态 (跨组件临时交互 - `Jotai` Atoms)**：
  - 适用场景：全局 Dialog 开关、目前 Lightbox 幻灯片数据、主题、语系。
  - 核心原则：组件与 Hook 订阅时，**必须**通过 `useAtom`, `useAtomValue` 或 `useSetAtom` 进行。
- **Server State (服务端状态 - `TanStack Query`)**：
  - 适用场景：所有向后端 Hono RPC 请求的数据（分类、照片列表、标签等）。
  - 核心原则：统一使用 `useAppQuery` 与 `useAppMutation` 管理，并通过 `useInvalidatePhotos` 统一调度缓存失效。
  - **资料结构规范 (锁定)**: 
    - `name` 字段必须始终为**纯字符串 (String)**，严禁改为多语对象。
    - `description` 字段必须为**多语对象 (Object)**，包含 `zh`, `en`, `ms` 屬性。
    - 所有 API 传输与数据库存储必须严格遵守此结构。

### 规则 3：Hook 整合与扁平化原则
- 鼓励「就近整合」而非「跨模块过度拆分」。如果某个 Hook 仅在单一功能（如 `PhotoEditDialog`）内部使用，且不具备全局通用性，应将其移入该 Feature 的子目录（如 `src/features/photo-edit/hooks/`）或直接与组件放在一起，严禁随意塞入全局 `src/hooks/` 目录。

## 8. 数据库连接与超时规范 (2026-07 最终锁定)

### 规则 1：连接超时与查询超时配置
为配合保活 YML（避免冷启动）并确保高并发请求（如批量上传）下的服务器稳定性，数据库连接与查询超时时间必须严格锁定为以下最优解：
- **`statement_timeout` (查询语句超时)**: 必须设置为 `15000` 毫秒 (15秒)。任何 SQL 语句如果执行超过 15 秒必须强制中断，防止僵尸连接和行/表锁卡死数据库。
- **`connect_timeout` (连接建立超时)**: 必须设置为 `10` 秒。由于项目配有保活工作流，正常连接在 500ms 内即可建立，10秒连接建立时间已留有充足安全余量。当连接异常时应「快速失败」(Fail Fast)，避免请求长时间挂起导致网关/代理超时返回 504，或被客户端拦截为 404。
- **`idle_timeout` (空闲连接释放)**:
  - Serverless 环境下设置为 `5` 秒。
  - Container 容器环境下设置为 `10` 秒。
  - 保证空闲连接能被迅速回收，不占用数据库连接池资源。

### 规则 2：连接池大小限制 (防止连接数耗尽)
- **Serverless 环境** (如 Vercel Function): 限制 `max: 3`。
- **Container 容器环境** (如 Cloud Run/本地 dev): 限制 `max: 10`。
- 严禁擅自调大最大连接数。过大的连接数在 Serverless 突发并发时，极易因瞬间实例增加而直接塞满 Supabase/PostgreSQL 的连接数上限导致全局服务崩溃。

### 规则 3：持久性防范与错误边界
- Hono 的全局错误拦截器中，必须显式区分「数据库/网络连接类系统异常」与「普通业务 404 (Not Found)」。
- 严禁将数据库超时、连接断开、建连失败 (如 DrizzleQueryError / PostgresError / timeout / canceling / ENOTFOUND 等) 误判定为 404 返回。这类系统/连通性异常必须原样抛出，以便前端 React Query 可以拦截并执行自动退避重试 (Exponential Backoff Retry)，提供更友好的渐进式恢复体验。

