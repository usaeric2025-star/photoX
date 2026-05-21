# PhotoX AI 行为准则 (AGENTS.md)

> 快速检查清单，AI 助手在每次修改代码前必须对照此表。

## 一、技术栈底线
- **服务端状态**: 使用 **TanStack Query** 处理所有数据流（查询、缓存、分页）。
- **UI 状态**: 使用 **Zustand** 仅存储纯 UI 状态（弹窗、侧边栏、多选、筛选条件）。
- **数据写入**: 所有的写入/更新/删除操作必须通过对应的 **MutationService**。

## 二、错误处理强制规范
- **统一入口**: 所有异步操作必须使用 `handleError(error, context)` 或 `useFeedback` 导出的 `showError`。
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

## 五、修改前快速检查清单
1. 是否使用了 `snake_case` (如 `category_id`, `manufacturer_id`, `tag_ids`, `is_group_cover`, `created_at`) 而非 `camelCase` (禁止使用 `categoryId`, `manufacturerId`, `tagIds`, `isGroupCover`, `createdAt`)？
2. 异步操作是否包裹了 `try...catch` 且调用了 `handleError`？
3. 是否使用了 `AlertDialog` 进行确认操作？
4. 业务数据是否仍然由 TanStack Query 管理？
5. 列表渲染是否考虑了性能（Memo/Callback）？
6. 是否有无意义的 `invalidateQueries` 调用？
