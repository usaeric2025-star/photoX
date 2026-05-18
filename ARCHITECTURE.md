# PhotoX 技术架构总览

PhotoX 是一个基于 React (Vite) 的相册管理与 AI 识别 Web 应用。

## 1. 核心技术栈
- **UI:** React
- **状态管理:** Zustand (全局配置、用户状态)
- **数据获取/突变:** TanStack Query (照片库、设置、缓存管理)
- **样式:** Tailwind CSS
- **工具库:** lucide-react, motion/react (动画)

## 2. 系统设计原则 (Mandatory)

### 2.1 错误处理中心化 (Unified Error System)
- **绝对禁令**: 禁止在业务代码中直接使用 `toast.error`。
- **强制实现**: 所有异步操作 `catch` 必须使用 `handleError(error, '操作名称')`。
- **目的**: 错误统一落地后台日志，且为用户提供唯一的红色 Toast 反馈，防止乱弹。

### 2.2 交互反馈策略 (Notification Policy)
- **最终一致性**: 一个用户操作只对应**一次**最终反馈（Toast 或状态改变）。
- **禁止叠加**: 禁止批量操作因循环代码导致连续弹出几十个 Toast。

### 2.3 状态同步策略 (Optimistic Updates)
- **乐观优先**: UI 更新必须在 API 请求之前发生。
- **严实回滚**: `onError` 实现回调，必须进行 UI 回滚并调用 `handleError`，禁止“虚假成功”。

## 3. 数据层结构
- **/services**: 纯 API 交互，禁止包含任何 UI 逻辑或 Error 处理。
- **/hooks/mutations**: 封装业务突变逻辑，配合 TanStack Query。
- **/store**: 全局持久化状态。

## 4. UI 响应规范
- **骨架屏**: 切换分类/标签时显示。
- **Loading**: 批量操作期间全局或按钮级 loading 状态。
