# Project Specific Rules

- **Do Not Translate**: The terms "Tag" (标签) and "Manufacturer" (厂商) should remain as they are and not be translated or localized into other languages unless specifically requested.

### PhotoX Technical Stack Standards (Mandatory)

1. **TanStack Query (Data Flow)**
   - **Query Keys**: MUST be unique and specific. Use `['photos', 'infinite', filters]` or `['photos', 'group', id]`. NEVER use a generic `['photos']` that triggers global invalidation.
   - **Invalidation**: Use the `useInvalidatePhotos()` hook for photo-related refreshes. Avoid `invalidateQueries({ queryKey: ['photos'] })`.
   - **Loading States**: Distinguish between `isLoading` (initial), `isFetching` (background), and `isFetchingNextPage`. Use skeletons for initial load and smooth transitions for refreshes.

2. **Zustand (UI State Only)**
   - **Strict Separation**: Zustand is ONLY for UI states (modals, sidebars, select mode, filters). 
   - **No Business Data**: Categories, Tags, Manufacturers, and Photos MUST stay in TanStack Query. DO NOT sync business data into Zustand.

3. **Error & Feedback (Sonner)**
   - **Unified API**: Use `useFeedback()` hook.
   - **Success**: Call `showSuccess(message)`.
   - **Error**: Call `showError(error, context)`.
   - **Prohibition**: Direct `toast.success()` or `toast.error()` calls from `sonner` are prohibited to ensure consistent formatting and error logging.

### PhotoX Systematic Rules (Consistency)

1. **Error Handling & Notifications**
   - **Unified Error System**: All asynchronous operations (upload, delete, edit, batch, AI, sync, category/tag/manuf. ops) MUST use `handleError(error, 'Operation Name')`.
   - **Prohibition**: Direct usage of `toast.error` for errors is STRICTLY PROHIBITED.
   - **Notification Policy**: Maintain a single notification strategy: one user action → one definitive final feedback message. Prevent stacked/repeated notifications.

2. **Optimistic Updates**
   - UI must update immediately.
   - `onError` callbacks are MANDATORY: implement rollback and call `handleError`. No "False Success" states.

3. **Loading States**
   - Provide concrete feedback (skeleton screens, loading indicators) for all long-running asynchronous actions (batching, AI operations, switching categories/tags).

4. **AI Behavior**
   - When modifying code, ensure error handling, feedback (no stacking), and loading states are integrated strictly according to these rules.

### 最终错误闭环规则 (Final Block/Cancel Integrity)

1. **任何异步操作（包括 Service、AI、同步）失败时**：
   - 必须调用 `handleError` / `showError` 挂载完整错误追踪上下文。
   - 严格禁止只编写 `console.error` 或单独调用 `toast.error` 绕开统一反馈体系。
2. **任务取消机制**：
   - 任务取消或中断必须调用并保证完全走 `useTasks` 的 `cancelTask(taskId)` 流程，严防未注册/绕行或被数据迭代覆盖等无反应行为。

### 错误处理与性能优化底线 (Performance & Stability Bottom Lines - MANDATORY)

1. **数据源头原则**
   - 所有查询 Hook（useQuery / useInfiniteQuery）返回的数据 **必须初始化为空数组 `[]`**。
   - 禁止在组件中使用 `?.` 或 `||` 作为主要防御手段掩盖 undefined 数据。
   - 违反此规则的代码必须回退。

2. **滚动性能原则**
   - `displayPhotos` **必须**使用 `useMemo` 包裹。
   - `PhotoCard` 等列表组件的事件处理器 **必须**使用 `useCallback`。
   - 禁止使用内联函数作为列表项的事件处理器。
   - 违反此规则的代码不得合入。

3. **缓存管理原则**
   - 禁止使用 `invalidateQueries({ queryKey: ['photos'] })` 全量刷新，必须精确指定 queryKey 范围。
   - 禁止在 Service 层使用内存缓存（如 `Map`、`{}` 对象缓存），数据请求必须受控于 TanStack Query。

4. **状态管理原则**
   - Zustand **只存 UI 状态**（多选模式、侧边栏、弹窗）。
   - 禁止在 Zustand 中存储业务数据（photos、categories、tags）。

5. **架构底线**
   - 已完成的优化（`useCallback`、`useMemo`、数据源头初始化）**不得回退**。
   - 任何修改必须保持或提升当前性能水平。
