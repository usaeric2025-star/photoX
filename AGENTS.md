# PhotoX AI 行为准则 (AGENTS.md)

> 快速检查清单，AI 助手在每次修改代码前必须对照此表。

## 一、技术栈底线
- **服务端状态**: 使用 **TanStack Query** 处理所有数据流（查询、缓存、分页）。
- **UI 状态**: 使用 **Zustand** 仅存储纯 UI 状态（弹窗、侧边栏、多选、筛选条件）。
- **数据写入**: 所有的写入/更新/删除操作必须通过对应的 **MutationService**。
- **任务执行器**: 所有的异步操作、系统检测和后台维护任务必须统一使用 **useTaskExecutor** 中的 `runTask` 进行处理。禁止手动使用 `useState` 去管理 `loading` 加载状态。

## 二、错误处理强制规范
- **统一入口**: 所有异步操作必须使用 `handleError(error, context)`、`useFeedback` 导出的 `showError`，或集成于 **useTaskExecutor** 内自动回传统一的错误上报机制。
- **防止乱弹**: 严禁直接使用 `toast.error` 或 `console.error` 作为唯一的反馈手段。

## 三、性能与稳定性底线
- **数据初始化**: 所有查询 Hook 返回的数据必须初始化为空数组 `[]`。
- **核心优化**: 
  - `displayPhotos` 必须使用 `useMemo`。
  - 列表项事件处理器必须使用 `useCallback`。
  - 禁止在列表组件中使用内联函数作为事件处理器。

## 四、禁止项清单 (Prohibitions)
- **❌ 禁止全量刷新**: 严禁使用 `invalidateQueries({ queryKey: ['photos'] })`，必须使用精确的 Query Key。
- **❌ 禁止业务数据入 Zustand**: Photos、Categories、Tags 严禁存入 Zustand。
- **❌ 禁止直接调用 Supabase**: 禁止在组件内直接使用 `supabase.from(...).update()`，必须走 Service 层。
- **❌ 禁止混合命名**: 前端与数据库统一使用 **snake_case**（如 `is_hidden`）。
- **❌ 禁止手动管理异步 Loading**: 严禁手动 `const [loading, setLoading] = useState(false)` 来更新异步执行过程，必须且只能走 **useTaskExecutor**。

## 五、修改前快速检查清单
1. 是否使用了 `snake_case` (如 `category_id`, `manufacturer_id`, `tag_ids`, `is_group_cover`, `created_at`) 而非 `camelCase` (禁止使用 `categoryId`, `manufacturerId`, `tagIds`, `isGroupCover`, `createdAt`)？
2. 异步操作是否包裹了 `try...catch` 且调用了 `handleError`，或者已采用 `useTaskExecutor.runTask` 行使流程？
3. 是否使用了 `AlertDialog` 进行确认操作？
4. 业务数据是否仍然由 TanStack Query 管理？
5. 列表渲染是否考虑了性能（Memo/Callback）？
6. 是否有无意义的 `invalidateQueries` 调用？
7. 所有新增或改造的异步执行，是否均已迁移并绑定至 `useTaskExecutor` 管理？

## 六、强制执行新规范（2026-05-22）

### 1. 任务管理
- ✅ 所有异步操作必须优先使用 `useTaskExecutor` 对接状态机制
- ❌ 禁止使用手动 `useState` 管理 loading 状态
- ❌ 禁止零散落单的 `toast.success/error`

### 2. 错误处理与上报
- ✅ 所有异步捕获错误必须使用包含全局记录的 `reportError` 或 `handleError` 统一入口
- ❌ 禁止在组件或服务层直接使用裸露的 `console.error` 或 `window.alert`

### 3. 提示与通知
- ✅ 由 `runTask` 提供的选项自动处理 toast 状态响应
- ❌ 禁止无故在多各业务分叉中手动单独调用外围 UI 通知库

### 4. 统一加载状态
- ✅ 界面应统一从 `tasks` 全局执行池结构进行加载阶段的派生
- ❌ 禁止写散落的独立 `setLoading` 零碎逻辑

### 5. 标准规范代码对比

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
  toast.error('保存失败');
} finally {
  setLoading(false);
}
```

