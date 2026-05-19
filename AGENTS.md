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
