# PhotoX 架构规则（永久锁定）

## 核心原则
1. 服务端数据 → TanStack Query
2. 前端 UI 状态 → Zustand（只存瞬态）
3. 筛选条件 → URL State
4. ❌ Context 传递业务数据
5. ❌ Props drilling 超过 2 层
6. ❌ 预计算层

## 命名规范（强制）

### 组件
| 类型 | 规则 | 示例 |
|------|------|------|
| 页面 | `XxxPage` | `PublicPage`, `AdminPage` |
| 容器 | `XxxContainer` | `PhotoListContainer` |
| 渲染 | `XxxGrid` / `XxxView` | `VirtualPhotoGrid` |
| 弹窗 | `XxxDialog` / `XxxModal` | `GroupDetailDialog` |
| 按钮 | `XxxButton` | `UploadButton` |

### Hooks
| 类型 | 规则 | 示例 |
|------|------|------|
| 服务端数据 | `useXxx`（复数） | `usePhotos`, `useCategories` |
| UI 状态 | `useUIStore` | 替代 `galleryStore` |
| 交互工具 | `useXxx` | `useLongPress`, `useDebouncedSearch` |

### Store
- UI 瞬态：`useUIStore`（columns, viewMode, isMultiSelect, selectedIds, lightboxIndex, activeGroupId）
- 筛选条件：URL State（不用 Store）

## 禁止项
- ❌ `forwardRef`（React 19 不需要）
- ❌ `React.FC`
- ❌ 手动 `useCallback`/`useMemo`/`React.memo`（Compiler 处理）
- ❌ `useStaticData` 模式
- ❌ `View` 后缀（用 `Page` 或 `Grid`）

## AI 生成代码时
- 服务端数据 → 直接调 `useXxx` Hook
- UI 状态 → `useUIStore`
- 筛选 → URL State
- 不需要问「数据从哪里来」

## 日志与性能规范（锁定）

### 规则
- ✅ 使用 `logger.debug()` 替代 `console.log`
- ✅ 使用 `logger.info()` 替代 `console.info`
- ✅ `logger.warn()` / `logger.error()` 始终输出
- ❌ 禁止在生产环境输出 debug/info 日志

### 性能监控
- 关键耗时操作使用 `logger.time()` / `logger.timeEnd()`
- 视图渲染监控使用 `usePerformance('ComponentName')`
