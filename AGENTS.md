---
description: PhotoX 项目 AI 编码强制规范。所有代码生成、修改、审查必须严格遵守此文件。违反红线的代码将被拒绝。
globs: ["src/**/*.{ts,tsx}"]
alwaysApply: true
version: "2.1"
lastSynced: "2026-05-25"
sourceOfTruth: "ARCHITECTURE.md"
---

# PhotoX AI Coding Rules v2.1

> ⚠️ 本文件是 `ARCHITECTURE.md` 的执行层精简版。详细设计原理请参阅原文档。
> 🔄 更新 `ARCHITECTURE.md` 后，必须同步更新本文件，并在 commit 中标注 `[rules-sync]`。

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

## 🚨 常见错误 → 正确做法

| ❌ 错误 | ✅ 正确 |
| :--- | :--- |
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
| 查询 Hooks | `src/hooks/queries/usePhotos.ts` |
| 变更 Service | `src/services/photoMutationService.ts` |
| 删除 Hook | `src/hooks/useDelete.ts` |
| 任务执行器 | `src/hooks/core/useTaskExecutor.ts` |
| 反馈 Hook | `src/hooks/uiFeedback.ts` |
| UI 状态 | `src/store.ts` |
| 错误处理 | `src/utils/errorHandler.ts` |
| Virtuoso 配置 | `src/config/virtuoso.config.ts` |
