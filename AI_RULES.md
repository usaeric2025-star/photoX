# photoX 项目架构规范（AI 约束规则）

> 任何 AI 助手在修改代码前必须先阅读此文件。

---

## 一、弹窗系统（已定稿，禁止改动）

### 1.1 核心原则
- ✅ **删除确认**：统一使用 `shadcn/ui` 的 `<AlertDialog>` 组件
- ✅ **输入弹窗**：统一使用 `<PromptDialog>` 组件
- ❌ **禁止**：重新引入 `setConfirmDialog`、`showLoadingToast` 等旧弹窗方法
- ❌ **禁止**：在组件内部自己写 `confirm` 或 `alert`

### 1.2 已删除的方法
- `setConfirmDialog`
- `showLoadingToast`
- `confirmDialog` 状态

---

## 二、登录页面 UI Context（关键修复）

### 2.1 当前标准结构（`src/pages/AdminView.tsx`）
```tsx
const uiValueForLogin = React.useMemo(() => ({
  alertDialog, setAlertDialog,
  promptDialog, setPromptDialog,
  activeScreen,
  setActiveScreen: (_: any) => {},           // 空函数，防止意外调用
  editPhotoId,
  setEditPhotoId: (_: string | null) => {},
  batchEditIds: null,
  setBatchEditIds: (_: string[] | null) => {},
  toast: null,
  showToast: (_msg: string, _type: 'success' | 'error' = 'success') => {},
  loadingState: 'idle' as const,
  setLoadingState: (_: any) => {},
  batchProgress: { current: 0, total: 0 },
  aiDebugInfo: null,
  abortAnalysis: () => {}
}), [alertDialog, setAlertDialog, promptDialog, setPromptDialog, activeScreen]);
```

### 2.2 修改规则

- 任何人（或 AI）不得擅自简化或删除 `uiValueForLogin` 中的字段
- 如果 `AdminUIContextType` 增加了新字段，必须同步补全 `uiValueForLogin`

---

## 三、依赖管理规范

### 3.1 构建工具必须在 dependencies 中

以下包必须放在 dependencies 中（部署平台需要）：

- `vite`
- `tailwindcss`
- `@vitejs/plugin-react`
- `typescript`

### 3.2 已清理的无用依赖

- `express`（已删除）
- `shadcn`（CLI 工具，不应在 dependencies 中）

---

## 四、Git 与部署

### 4.1 .gitignore 规则

- `dist/` 和 `build/` 不应被忽略，否则部署平台无法打包产物

### 4.2 部署配置

- 已删除 `vercel.json`，依赖平台默认配置
- 不要添加 `vercel.json` 除非明确知道需要什么配置

---

## 五、代码修改前的检查清单（AI 必读）

在修改任何代码前，请确认：

- 是否试图使用 `setConfirmDialog`？→ ❌ 禁止，改用 `<AlertDialog>`
- 是否修改了 `uiValueForLogin`？→ ✅ 必须补全所有字段，缺失的设空函数
- 是否移动了构建工具到 devDependencies？→ ❌ 禁止，必须留在 dependencies
- 是否删除了 `dist/` 的 `.gitignore` 规则？→ ❌ 禁止
- 是否添加了 `vercel.json`？→ ⚠️ 非必要不要加

---

## 六、版本记录

| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-05-01 | 确立弹窗系统统一规范 | 避免 setConfirmDialog 反复引入 |
| 2026-05-01 | 补全 uiValueForLogin 结构 | 修复压缩后报错 |
| 2026-05-01 | 构建工具移至 dependencies | 解决 Vercel 部署缺失依赖 |
