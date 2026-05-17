# 架构说明书 (ARCHITECTURE.md)

本文件说明当前专案的系统架构、数据流程及开发注意事项。

## 第一部分：数据库结构

*   **重要事实 (READ BEFORE MODIFYING)**:
    *   `furniture_items` 数据表完全不存在 `tagIds` 或 `tag_ids` 栏位。
    *   任何标签关系查询、更新、新增、删除操作，**严禁**对 `furniture_items` 表进行标签相关栏位操作。
    *   所有标签逻辑必须透过 `photo_tags` 关联表维护。
*   **主要数据表**：`furniture_items` (参见 `constants/config.ts`)
*   **关键栏位**：
    *   `id` (uuid)
    *   `user_id` (关联 auth)
    *   `image_url`, `thumb_url`, `image_hash`
    *   `created_at`, `updated_at` (追踪时间)
    *   `group_id`, `is_group_cover`, `group_order` (群组相关)
    *   `isHidden`, `is_pinned` (状态标记)
*   **命名规则**：
    *   Database：主要使用下划线 (`snake_case`)，如 `image_url`, `created_at`。
    *   型别转换：前端 `Photo` 型别使用驼峰 (`camelCase`)，由 `mapSupabasePhoto` 处理。
    *   注意事项：数据库对 `isHidden` 等栏位可能因数据库型别差异导致大小写不敏感，前端需统一处理。
*   **常见坑点**：曾发生过查询时使用 `group_order` 栏位但数据库未定义的错误，现已改为备援使用 `created_at`。

## 第二部分：数据流程

*   **载入逻辑**：
    *   **公开模式 (`PublicView`)**：使用 `supabasePublic` (无 session 持久化，避免 Brave 浏览器错误)。透过 `loadAllPhotosFromCloud` 载入，并有缓存机制。
    *   **管理模式**：使用 `supabase` (需登录)。功能较完整，支援编辑 CRUD。
*   **GroupDetailView 特殊性**：
    *   由于群组内照片需依照特殊逻辑排序或全数展示，该组件在公开模式下会主动 bypass 分页逻辑，一次性 fetch 该群组内所有照片，以提供完整且流畅的浏览体验。

## 第三部分：已知问题与解决方案

1.  **数据库栏位缺失**：`group_order` 栏位不存在错误，已删除查询中的 `.order()`，并在 `mapSupabasePhoto` 将其预设值改为 `created_at`。
2.  **Brave localStorage 错误**：针对公开浏览需求，使用 `supabase-public.ts` 建立不启用 `localStorage` 的客户端。
3.  **RLS 权限**：通过 `supabase` (Auth) 与 `supabasePublic` (Anon) 两组不同客户端区隔权限。
4.  **照片分页问题**：`GroupDetailView` 已改为一次获取群组全量数据，避免分页导致组内照片显示不完整。

## 第四部分：重要档案说明

*   `services/photoService.ts`: 负责数据查询与物件对映 (Read Only)。
*   `services/photoMutationService.ts`: 负责数据新增、更新、批量同步、去重与清理 (Write/Sync)。
*   `lib/photoSync.ts`: 负责照片合并与清理的纯逻辑函数。
*   `components/GroupDetailView.tsx`: 群组资料管理与展示。
*   `pages/PublicView.tsx`: 公开相册首页核心逻辑。
*   `lib/supabase.ts`: 正式存取的 Supabase 客户端。
*   `lib/supabase-public.ts`: 用于公开检视的 Supabase 客户端。
*   `constants/config.ts`: 系统参数 (表名、Bucket 名、分页大小)。

## 第五部分：新 AI 接手注意事项

1.  **数据库引用**：绝不能硬编码表名，请一律使用 `DB_CONFIG.TABLE_NAME`。
2.  **型别安全**：数据从Supabase回来时，务必透过 `photoService.ts` 的 `mapSupabasePhoto` 进行常规化。
3.  **Client 区分**：操作私有数据(CRUD)用 `supabase`；公开查询只用 `supabasePublic`。
4.  **缓存机制**：`photoService.ts` 内的查询已内建 5 分钟过期快取，非必要不要随意修改快取逻辑。
5.  **Schema 变更**：若需要新增 DB 栏位，请确认 `photoMutationService.ts` 内的 CRUD payload 是否需要同步更新，以防资料同步失败。

## 第一部分补充：数据匹配规范

### 为什么禁止名称匹配？
- ID 是唯一且稳定的主键
- 名称可能重复、变化、多语言
- 曾经发生「全部商品」被误过滤的 bug

### 正确做法
优先使用 ID，只有在没有 ID 的场景（如硬编码 UI）才使用名称。

### 技术背景
数据库分类表有 UUID 主键，前端应始终保持 ID 引用。

