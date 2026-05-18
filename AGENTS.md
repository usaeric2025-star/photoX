# Project Specific Rules

- **Do Not Translate**: The terms "Tag" (标签) and "Manufacturer" (厂商) should remain as they are and not be translated or localized into other languages unless specifically requested.

### PhotoX Systematic Rules (Mandatory)

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
