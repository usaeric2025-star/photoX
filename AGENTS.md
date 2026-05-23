# PhotoX AI 行为准则 (AGENTS.md)

> 快速检查清单，AI 助手在每次修改代码前必须对照此表。

## 一、架构规范（2026-05-23 最终版）

### 1. 目录结构
```bash
src/hooks/
├── admin/           # 管理端专用 Hook (筛选、导入、同步、AI、编辑)
├── core/            # 核心 Hook (认证、设置、任务执行器、通知)
├── shared/          # 共享 Hook (多选、搜索、媒体查询、标签显示)
└── queries/         # TanStack Query 查询 (照片、分类、标签等)
```

### 2. 状态管理分层

| 类型 | 方案 | 禁止 |
|------|------|------|
| UI 状态（筛选、多选、列数）| **Zustand** | ❌ 不用 props 传递 |
| 服务端数据 | **TanStack Query** | ❌ 不用 Zustand 存业务数据 |
| 稳定操作函数 | **Context** 或 自定义 Hook | ❌ 不用 Zustand 存储大型闭包函数 |

### 3. 组件通信
- ✅ **AdminContext**: 管理端所有页面（Sidebar、Main、Settings）统一从 `useAdmin()` 获取逻辑。
- ✅ **PhotoActionsContext**: 普通组件（PhotoCard）通过此 Context 获取操作函数，避免逐级传递。
- ❌ 禁止 props 传递超过 2 层的回调函数（如 `onDelete`、`onUpdate`）。

## 二、技术底线与性能优化

- **任务管理**: 所有的异步操作必须统一使用 `useTaskExecutor` 中的 `runTask` 进行处理。禁止手动使用 `useState` 去管理 `loading` 加载状态。
- **错误处理**: 一律通过 `useFeedback` 导出的 `showError` 或集成于 `runTask` 进行上报。
- **防止冗余**: 严禁为 Admin 和 Public 编写两套独立 UI 组件，应使用 Variant 模式。
- **文件体积**: 
  - Hook 文件建议 < 150 行。
  - 组件文件建议 < 250 行。
  - `useAdminDataPrep.ts` 仅作为逻辑聚合层。

## 三、修改前必读清单
1. 是否使用了 `snake_case` (如 `category_id`, `manufacturer_id`, `is_hidden`)？
2. 是否所有异步任务都已接入 `runTask`？
3. 业务数据是否仍然由 TanStack Query 管理而非 Zustand？
4. 是否有无意义的 `invalidateQueries` 全量刷新？
5. 所有弹窗是否使用了 `AlertDialog` (shadcn/ui)，严禁原生 `alert`？

## 四、强制规范对比

```ts
// ✅ 正确示范
const { runTask } = useTaskExecutor();
await runTask('保存', saveData, { showSuccessToast: true });

// ❌ 错误示范
const [loading, setLoading] = useState(false);
try {
  setLoading(true);
  await saveData();
  toast.success('保存成功');
} catch (e) {
  console.error(e);
} finally {
  setLoading(false);
}
```
