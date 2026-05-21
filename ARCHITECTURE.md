# photoX 项目架构规范

> **任何 AI 助手在修改代码前必须先完整阅读此文件。**
> 版本：v2.0 | 更新日期：2026-05-21

---

## 一、核心架构（不可违反）

| 层级 | 方案 | 说明 |
|------|------|------|
| 服务端状态 | TanStack Query | 所有数据获取、缓存、分页 |
| UI 状态 | Zustand | 多选模式、侧边栏、筛选状态 |
| 数据写入 | MutationService | `photoMutationService.ts` / `groupMutationService.ts` |
| 错误处理 | `handleError` | 统一错误上报 + Toast |
| 路由 | BrowserRouter | 配合 Vercel rewrites |
| 虚拟列表 | VirtuosoGrid | 公开页、管理页、合组页 |

---

## 二、数据库与前端字段命名规范（关键）

| 层级 | 命名 | 示例 |
|------|------|------|
| 数据库 | snake_case | `is_hidden`, `group_id` |
| 前端 | snake_case | `is_hidden`, `group_id` |
| 映射层 | `mapSupabasePhoto` | 负责保持一致性 |

**强制规则：**
- **统一使用 snake_case**: 前端代码中所有与数据库字段对应的属性（如 `is_hidden`, `group_id`）必须使用 snake_case。
- ❌ **严禁使用 camelCase**: 禁止在前端定义 `isHidden`, `groupId` 等属性。
- **一致性**: MutationService 不再需要进行驼峰与蛇形的转换逻辑。

---

## 三、弹窗系统（已定稿，禁止改动）

### 核心原则
- ✅ 删除确认：统一使用 `<AlertDialog>`
- ✅ 输入弹窗：统一使用 `<PromptDialog>`
- ❌ 禁止使用 `setConfirmDialog`、`showLoadingToast` 等旧方法
- ❌ 禁止在组件内手写 `confirm` 或 `alert`

---

## 四、数据写入总规则（不可违反）

所有对数据库的写操作（INSERT、UPDATE、DELETE、UPSERT）**必须**通过对应的 MutationService 进行：

- `furniture_items` → `src/services/photoMutationService.ts`
- `groups` → `src/services/groupMutationService.ts`

**禁止：**
- ❌ 在组件、Hook、Utils 中直接调用 `supabase.from(...).update/insert/delete`
- ❌ 在调用处自行组装数据库字段（字段映射由 Service 层统一处理）

---

## 五、删除操作规范

所有删除操作（照片、群组、标签、分类、批量删除）**必须**使用统一入口：

- 优先使用 `src/hooks/useDelete.ts` 统一 Hook
- 或通过对应的 MutationService 调用

**禁止在组件中独立实现删除逻辑。**

---

## 六、错误处理规范

所有异步操作必须用 `try...catch` 包裹，错误统一调用：

```ts
import { handleError } from '@/utils/errorHandler'
```

规则：
- 需要用户确认的错误 → `setAlertDialog`
- 普通错误提示 → `showToast`（通过 `useFeedback`）
- 开发环境同时打印到控制台
- ❌ 禁止直接 `console.error` 或 `alert`

---

## 七、权限判断规范

禁止在组件中分散写 `if (user && isAdminMode)`，统一使用：

```ts
import { usePermission } from '@/hooks/usePermission'
```

---

## 八、配置读取规则（严格）

凡是后台设置界面用户可填写的配置项（API Key、模型名称、密码等），代码中必须从 settings 对象或数据库读取。

- ❌ 禁止硬编码
- ❌ 禁止给默认值
- ✅ 配置缺失时直接报错，提示用户去后台填写

---

## 九、组件选用规范

| 场景 | 组件 |
|------|------|
| 照片标签编辑 | PhotoTagSelector（非 TagEditor） |
| 尺寸编辑 | DimensionEditor |
| 确认弹窗 | AlertDialog |
| 输入弹窗 | PromptDialog |
| 下拉菜单 | DropdownMenu |
| 抽屉/侧边栏 | Sheet |

---

## 十、骨架屏规范

统一使用 `src/components/ui/Skeleton.tsx` 中的预设组件：
- `PhotoCardSkeleton` - 照片卡片
- `GroupCardSkeleton` - 群组卡片
- `TagSkeleton` - 标签
- `PhotoGridSkeleton` - 照片网格（支持 count 属性）

禁止：
- ❌ 内联手写 `animate-pulse`
- ❌ 引入第三方骨架屏库

---

## 十一、虚拟列表规范（强制执行）

使用 `react-virtuoso` 时：
- ❌ 禁止手动 `visibleCount` + `.slice()` 切片
- ✅ Virtuoso 自己管理渲染，只需传入完整 data 数组
- ✅ 滚动加载用 `endReached` 触发 `fetchNextPage`

分页大小： 公开页 20，管理页 20，合组内 20

---

## 十二、TanStack Query 规范

- **精准查询键**: 严禁使用全量 Key 如 `['photos']`。必须使用：`['photos', 'infinite', filters]`。
- **状态区分**: 
  - 首次加载（`isLoading && !data`）→ 骨架屏
  - 切换筛选（`isFetching && data`）→ 使用 `placeholderData: keepPreviousData`
- **乐观更新**: 必须包含 `onMutate`（更新 UI）和 `onError`（回滚 + 报错）。

---

## 十三、Zustand 规范

Zustand 只允许存储 UI 状态：
- 弹窗状态
- 侧边栏展开/收起
- 多选模式
- 当前筛选配置

❌ 禁止存储业务数据： 照片、分类、标签、厂商数据由 TanStack Query 管理。

---

## 十四、反馈规范（Sonner）

统一通过 `src/hooks/uiFeedback.ts`（及导出的 `useFeedback`）进行反馈：
- ❌ 禁止直接调用 `toast.success` 或 `toast.error`
- ✅ 成功反馈：`showSuccess(msg)`
- ✅ 错误处理：`handleError(error, context)`

---

## 十五、数据匹配规范（强制执行）

所有 `filter`/`find` 使用 ID 字段，禁止使用 name：
- ✅ `categories.filter(cat => cat.id === selectedId)`
- ❌ `categories.filter(cat => cat.name === '全部')`

---

## 十六、翻译与多语言规范

- **术语固定**: 「标签」(Tag) 和 「厂商」(Manufacturer) 及其具体名称禁止自动翻译。
- **显示原则**: 优先使用数据库中的 zh 或 en 字段，若无则保持原始 name。
- ❌ 禁止使用 AI 批量翻译标签名或厂商名。

---

## 十七、批量操作与 AI 识别反馈

- 批量操作必须使用左下角任务面板（Task Panel）显示进度。
- ❌ 禁止使用全屏遮罩阻塞 UI。
- ✅ 支持取消操作，取消后已处理部分保留。

---

## 十八、筛选与分页规范

### 1. 筛选切换
- 切换分类/标签时，必须重置 `pageParam` 和 `lightboxIndex`
- 搜索时，必须重置分页

### 2. 合组视图
- 进入合组时，必须清空全局筛选条件（`filterCatId`, `filterTagIds`, `searchQuery`）
- 合组内照片用分页加载，不用全量

### 3. 派生数据
- `displayPhotos` 永远不作为 `useEffect` 依赖
- 派生数据只用 `useMemo` 计算，不用来触发 Effect

---

## 二十、组件命名规范

- 公开页组件：`Public*`（如 `PublicPhotoCard`）
- 管理页组件：`Admin*`（如 `AdminPhotoCard`）
- 共用组件：放在 `shared/` 目录

---

## 二十一、核心文件索引

| 用途 | 文件路径 |
|------|------|
| 查询 Hooks | `src/hooks/queries/usePhotos.ts` |
| 变更 Hooks | `src/hooks/mutations/*.ts` |
| UI 状态 | `src/store.ts` (Zustand) |
| 错误处理 | `src/utils/errorHandler.ts` |
| 照片服务 | `src/services/photoService.ts` |
| 照片写服务 | `src/services/photoMutationService.ts` |
| 删除 Hook | `src/hooks/useDelete.ts` |
| 反馈 Hook | `src/hooks/uiFeedback.ts` |

---

## 二十二、代码修改前的检查清单（AI 必读）

- 是否使用了 `is_hidden` (snake_case)？
- 是否使用了 `MutationService` 进行写操作？
- 是否使用了 `handleError` 处理错误？
- 业务数据是否仍然由 TanStack Query 管理？
- 是否使用了 `AlertDialog` 进行确认操作？
