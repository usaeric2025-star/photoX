# PhotoX 状态管理规则（锁定，不再讨论）

## 两条规则

### 规则一：服务端数据 → useQuery
- 所有来自数据库的数据用 TanStack Query
- 静态数据（categories/tags/manufacturers）设 `staleTime: Infinity`
- 业务数据（photos/groups）设 `staleTime: 5 * 60 * 1000`
- ❌ 禁止把服务端数据存入 Zustand

### 规则二：前端状态 → Zustand
- 所有纯前端的 UI 状态用 Zustand（galleryStore）
- ❌ 禁止用 Zustand 缓存服务端数据

## 禁止项
- ❌ Context 传递业务数据
- ❌ Props drilling 超过 2 层
- ❌ 预计算层（enrichedPhotos 模式）

## AI 生成新组件时
- 需要服务端数据 → 直接调对应的 useXxx Hook
- 需要 UI 状态 → 直接调 useGalleryStore
- 不需要问「数据从哪里来」

## 性能安全阀（实测触发）
- 当照片数量 > 5000 或组件树 > 10 层时，需重新评估
- 当前 480 张照片，在安全边界内

## Header 组件规则（永久锁定）

### 职责分离
- `PublicHeader` - 公开页面，无认证，无管理按钮
- `StaffHeader` - 员工页面，有认证，有员工工具
- `AdminHeader` - 管理页面，有认证，有管理工具

### 禁止项
- ❌ PublicHeader 禁止导入 useAuth、usePermission
- ❌ 禁止三个 Header 共用同一个组件
- ❌ 禁止使用 variant 或 mode prop 切换行为
- ❌ 禁止在 Header 内使用条件渲染判断角色

### 使用方式
```tsx
// PublicView.tsx
<PublicHeader ... />

// StaffView.tsx
<StaffHeader ... />

// AdminView.tsx
<AdminHeader ... />
```
