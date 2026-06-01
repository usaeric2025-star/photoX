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

### 目录
`src/components/layouts/headers/`

### 三个独立组件
- `PublicHeader.tsx` - 公开页，使用 useAuth（仅判断登录状态），显示「登录」或「管理后台」按钮，无管理工具
- `StaffHeader.tsx` - 员工页，有员工工具，无管理按钮
- `AdminHeader.tsx` - 管理页，有全部管理按钮（上传、多选、批量删除、设置）

### 禁止项
- ❌ 禁止三个 Header 共用代码
- ❌ 禁止使用 variant 或 mode 切换 Header
- ❌ 禁止 PublicHeader 显示任何管理工具

### 灯箱管理按钮
- 通过 `variant` 控制，与 Header 无关
