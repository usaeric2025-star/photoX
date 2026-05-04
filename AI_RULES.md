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

## 六、配置读取规则（严格）

凡是后台设置界面用户可以填写的配置项（API Key、模型名称、密码等），代码中必须从 `settings` 对象或数据库读取。
**禁止硬编码，禁止给默认值。**
配置缺失时直接报错，提示用户去后台填写。
違反此規則的修改將被要求回退。

---

## 七、删除操作规范

所有删除操作（照片、群组、标签、分类、批量删除）必须使用 `src/hooks/useDelete.ts` 统一 Hook。

禁止在组件中独立实现删除逻辑（如直接调用 `supabase.delete` 或 `updatePhotoInCloud`）。

新增删除功能时，先确认是否可复用 Hook，不可复用再扩展 Hook。

---

## 八、错误处理规范

所有异步操作必须用 `try...catch` 包裹，错误统一调用 `src/utils/errorHandler.ts` 的 `handleError` 函数。

禁止直接 `console.error` 或 `alert` 报错。

规则：
- 需要用户确认的错误 → `setAlertDialog`
- 普通错误提示 → `showToast`
- 开发环境同时打印到控制台

---

## 九、权限判断统一

禁止在组件中直接写 `if (user && isAdminMode)` 这种分散的权限判断，统一使用 `usePermission` Hook。

---

## 十、骨架屏规范

- 统一使用 Tailwind CSS 的 `animate-pulse` 类
- 不引入第三方骨架屏库
- 不重复封装骨架屏组件
- 颜色统一使用 `bg-gray-200`，圆角根据场景使用 `rounded` / `rounded-lg` / `rounded-xl`

---

## 十一、代码修改前的检查清单（AI 必读）

在修改任何代码前，请确认：

- 是否试图使用 `setConfirmDialog`？→ ❌ 禁止，改用 `<AlertDialog>`
- 是否修改了 `uiValueForLogin`？→ ✅ 必须补全所有字段，缺失的设空函数
- 是否使用了硬编码的 AI 模型名称或 API Key？→ ❌ 禁止，必须从 settings 获取
- 是否使用了 `useDelete` 处理删除？→ ✅ 必须使用
- 是否使用了 `handleError` 处理错误？→ ✅ 必须使用
- 是否使用了 `usePermission` 检查权限？→ ✅ 必须使用
- 是否移动了构建工具到 devDependencies？→ ❌ 禁止，必须留在 dependencies
- 是否删除了 `dist/` 的 `.gitignore` 规则？→ ❌ 禁止
- 是否添加了 `vercel.json`？→ ⚠️ 非必要不要加

---

## 十一、版本记录

| 日期 | 变更 | 原因 |
|---|---|---|
| 2026-05-01 | 确立弹窗系统统一规范 | 避免 setConfirmDialog 反复引入 |
| 2026-05-01 | 补全 uiValueForLogin 结构 | 修复压缩后报错 |
| 2026-05-01 | 构建工具移至 dependencies | 解决 Vercel 部署缺失依赖 |
| 2026-05-01 | 禁止硬编码 AI 配置 | 确保用户在后台配置模型和 Key，提高安全性 |
| 2026-05-02 | 统一化改造（删除、错误处理、权限、API） | 提高代码可维护性与鲁棒性 |
