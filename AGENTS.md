# PhotoX 架构规则（永久锁定）

## 核心原则
1. 服务端数据 → TanStack Query
2. 前端 UI 状态 → Zustand（只存瞬态）
3. 筛选条件 → URL State
4. ❌ Context 传递业务数据
5. ❌ Props drilling 超过 2 层
6. ❌ 预计算层

## 命名规范（强制）

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

## API 契约层（锁定）

1. **类型共享**：前端必须通过 `import type { AppType } from "../../api/app"` 引用后端路由类型。
2. **RPC 优先**：优先使用 `hono/client` (hc) 进行调用，确保前端参数与后端定义严格对齐。
3. **禁止 Manual URL**：除非是静态资源或第三方链接，禁止在前端手动拼接 `/api/xxx` 字符串。

## 禁止项
- ❌ `forwardRef`（React 19 不需要）
- ❌ `React.FC`
- ❌ 手动 `useCallback`/`useMemo`/`React.memo`（Compiler 处理）
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

## 目录结构规则（锁定）

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

## Virtua 虚拟滚动规范（修正）

### 核心配置
```tsx
<VList
  ref={listRef}
  data={items}
  itemSize={200}                           // 估算高度
  shift={false}
>
  {(item, index) => (
    <Component key={item.id} item={item} />
  )}
</VList>
```

禁止事项

· ❌ 禁止使用已废弃的 overscan 属性
· ❌ 禁止使用 index 作为 key（使用稳定 ID）
· ❌ 禁止直接传递 children 作为预渲染元素（大数据集）

可选配置

· keepMounted: 保持特定索引（如组头、表单）
· ssrCount: SSR 场景设置首屏数量

### 支持的属性（仅这些）
- ✅ `data` - 数据源
- ✅ `itemSize` - 固定行高（数值或函数）
- ✅ `scrollToIndex` - 滚动到指定索引
- ❌ `overscanCount` - 废除
- ❌ `estimateSize` - 不支持，使用 `itemSize`
- ❌ `overscan`（像素单位） - 不支持，使用 `itemSize`

### 返回顶部与恢复滚动标准写法
- ✅ **导航跳转**：使用 `scrollToIndex(0)` 回到顶部
- ✅ **恢复滚动位置**：允许使用 `scrollTo(pixel)` 精确恢复历史位置
- ❌ 禁止使用 `scrollTo(0)` 作为通用的「回到顶部」写法（应使用 `scrollToIndex`）
```typescript
listRef.current?.scrollToIndex(0); // ✅ 正确（回到顶部）
listRef.current?.scrollTo(savedPixels); // ✅ 正确（恢复精确位置）
listRef.current?.scrollTo(0); // ❌ 错误（取代了 scrollToIndex(0)）
```

## 权限判断规范（锁定）

```typescript
// ✅ 正确：严格判断
const showAdmin = useAdminMode() && isManagement;

// ❌ 错误：宽松判断
const showAdmin = useAdminMode() || isManagement;
```

## 页面类型与权限判断规范（锁定）

### 核心原则
- ✅ 页面类型（管理模式/公开模式）**只由 URL 决定**
- ❌ 禁止使用 Zustand 存储 `viewMode` 状态
- ❌ 禁止使用 localStorage 持久化页面类型

### 权限判断
```typescript
// ✅ 正确：基于 URL
const location = useLocation();
const isAdmin = location.pathname.startsWith('/admin');

// ❌ 错误：基于 Zustand 状态
const { viewMode } = useUIStore();
const isAdmin = viewMode === 'private';
```

### 模式切换
```typescript
// ✅ 正确：导航到对应路由
navigate({ to: '/admin' });  // 管理模式
navigate({ to: '/' });       // 公开模式

// ❌ 错误：只改 Zustand 状态
setViewMode('private');
```

### 路由结构
- `/` → 公开页面（PublicPage）
- `/admin` → 管理后台（AdminPage）
- 其他路由按需扩展

## Props 传递规范（锁定）

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

## 通知与反馈规范（锁定，2026-06-03）

### 核心原则
- ✅ **唯一出口**：所有通知必须使用 `sonner` 的 `toast`。
- ✅ **禁止原生**：严禁使用 `window.alert()` 或 `window.confirm()`（交互请使用 `useUIStore` 的 `alertDialog`）。
- ✅ **可执行建议**：系统级错误通知应尽可能包含修复建议或「查看诊断」按钮。
- ✅ **异步追踪**：所有耗时操作（上传、批量更新、导出）必须显示进度或 Loading 状态。

### 统一用法
```typescript
// 简单成功
toast.success('操作已完成');

// 带动作的错误
toast.error('发现数据完整性问题', {
  action: {
    label: '去诊断',
    onClick: () => navigate({ to: '/admin/diagnostics' })
  }
});
```

## 任务中心适配规范（锁定，2026-06-03）
- ✅ **非破坏性更新**：不重写 `useTaskExecutor` 和 `TasksList`，采用适配层聚合数据。
- ✅ **全局入口**：在 `/admin/tasks` 提供所有（前端+后端）任务的统一视图。
- ✅ **自动刷新**：任务页面应具备自动轮询后端 Job 状态的能力。

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

- ✅ Query 缓存持久化到 IndexedDB
- ✅ 只持久化 `photos` / `groups` / `categories` / `tags` / `manufacturers`
- ✅ 不持久化 mutation / 编辑 / 上传状态
- ✅ 缓存有效期 7 天，自动清理
- ❌ 禁止持久化分页/筛选状态（已在 URL 中）

## Hook 使用规范（锁定）

### 通用工具 Hook（优先使用 @mantine/hooks）
- ✅ 弹窗开关：`useDisclosure`
- ✅ 本地存储：`useLocalStorage`
- ✅ 防抖/节流：`useDebouncedValue` / `useThrottledValue` / `useDebouncedCallback`
- ✅ 媒体查询：`useMediaQuery`
- ✅ 悬停/焦点：`useHover` / `useFocus`
- ✅ 剪贴板：`useClipboard`
- ✅ 窗口滚动：`useWindowScroll`

### 业务 Hook（保持现状，不迁移）
- 数据获取：`usePhotos`, `useGroups` 等
- 状态管理：`useLightbox`, `useTaskExecutor` 等
- 路由/URL：`useUrlFilters`
- 权限：`useAdminMode`

## 性能优化原则（非必要不优化，锁定）
- ✅ **性能优先原则**：性能优化应当建立在真实确认的瓶颈基础上。
- ❌ **非必要不优化**：除非遇到真实性能瓶颈，否则禁止主动进行 `async-parallel`、`bundle-dynamic-imports`、`bundle-barrel-imports` 等复杂优化，以保持架构的简单与可维护性。

## 错误处理与 Mutation 规范（锁定）
- ❌ 禁止直接 `throw new Error()`，必须用 `ErrorFactory.wrap()`。
- ❌ 禁止在组件中直接使用 `useMutation`，必须用 `mutations/*` 下的工厂生成。
- ✅ 所有 Mutation 必须通过 `createMutationHook` 工厂生成。
- ✅ 所有服务端错误必须走 `useAppError` 输出 toast。
- ✅ 缓存失效必须使用 `photoKeys.all()` 或 `groupKeys.all()` 降维打击。

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


## 架构极致化规范（锁定）

### Mutation
- ✅ 所有写操作必须使用 `createMutation` 工厂
- ❌ 禁止直接使用 `useMutation`

### 快取更新
- ✅ 优先使用 `setQueryData` 精準更新
- ❌ 禁止为单笔操作 `invalidateQueries` 整个列表

### Zustand
- ✅ 必须使用 selector 精确订阅
- ❌ 禁止无参调用 `useUIStore()`

### TanStack Query
- ✅ 列表页使用 `select` 缩小订阅字段
- ✅ 使用 `placeholderData: keepPreviousData`

### Virtua
- ✅ 生产环境配置 `overscan`、`shift`、`estimateSize`




