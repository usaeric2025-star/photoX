# 架構說明書 (ARCHITECTURE.md)

本文件說明當前專案的系統架構、數據流程及開發注意事項。

## 第一部分：資料庫結構

*   **重要事实 (READ BEFORE MODIFYING)**:
    *   `furniture_items` 資料表完全不存在 `tagIds` 或 `tag_ids` 欄位。
    *   任何標籤關係查詢、更新、新增、刪除操作，**嚴禁**對 `furniture_items` 表進行標籤相關欄位操作。
    *   所有標籤邏輯必須透過 `photo_tags` 關聯表維護。
*   **主要資料表**：`furniture_items` (參見 `constants/config.ts`)
*   **關鍵欄位**：
    *   `id` (uuid)
    *   `user_id` (關聯 auth)
    *   `image_url`, `thumb_url`, `image_hash`
    *   `created_at`, `updated_at` (追蹤時間)
    *   `group_id`, `is_group_cover`, `group_order` (群組相關)
    *   `isHidden`, `is_pinned` (狀態標記)
*   **命名規則**：
    *   Database：主要使用下劃線 (`snake_case`)，如 `image_url`, `created_at`。
    *   型別轉換：前端 `Photo` 型別使用駝峰 (`camelCase`)，由 `mapSupabasePhoto` 處理。
    *   注意事項：資料庫對 `isHidden` 等欄位可能因資料庫型別差異導致大小寫不敏感，前端需統一處理。
*   **常見坑點**：曾發生過查詢時使用 `group_order` 欄位但資料庫未定義的錯誤，現已改為備援使用 `created_at`。

## 第二部分：數據流程

*   **載入邏輯**：
    *   **公開模式 (`PublicView`)**：使用 `supabasePublic` (無 session 持久化，避免 Brave 瀏覽器錯誤)。透過 `loadAllPhotosFromCloud` 載入，並有緩存機制。
    *   **管理模式**：使用 `supabase` (需登入)。功能較完整，支援編輯 CRUD。
*   **GroupDetailView 特殊性**：
    *   由於群組內照片需依照特殊邏輯排序或全數展示，該組件在公開模式下會主動 bypass 分頁邏輯，一次性 fetch 該群組內所有照片，以提供完整且流暢的瀏覽體驗。

## 第三部分：已知問題與解決方案

1.  **資料庫欄位缺失**：`group_order` 欄位不存在錯誤，已刪除查詢中的 `.order()`，並在 `mapSupabasePhoto` 將其預設值改為 `created_at`。
2.  **Brave localStorage 錯誤**：針對公開瀏覽需求，使用 `supabase-public.ts` 建立不啟用 `localStorage` 的客戶端。
3.  **RLS 權限**：通過 `supabase` (Auth) 與 `supabasePublic` (Anon) 兩組不同客戶端區隔權限。
4.  **照片分頁問題**：`GroupDetailView` 已改為一次獲取群組全量數據，避免分頁導致組內照片顯示不完整。

## 第四部分：重要檔案說明

*   `services/photoService.ts`: 負責數據查詢與物件對映 (Read Only)。
*   `services/photoMutationService.ts`: 負責數據新增、更新與刪除 (Write)。
*   `services/photoSyncService.ts`: 負責批量同步、去重與清理工作。
*   `components/GroupDetailView.tsx`: 群組資料管理與展示。
*   `pages/PublicView.tsx`: 公開相冊首頁核心邏輯。
*   `lib/supabase.ts`: 正式存取的 Supabase 客戶端。
*   `lib/supabase-public.ts`: 用於公開檢視的 Supabase 客戶端。
*   `constants/config.ts`: 系統參數 (表名、Bucket 名、分頁大小)。

## 第五部分：新 AI 接手注意事項

1.  **資料庫引用**：絕不能硬編碼表名，請一律使用 `DB_CONFIG.TABLE_NAME`。
2.  **型別安全**：數據從Supabase回來時，務必透過 `photoService.ts` 的 `mapSupabasePhoto` 進行正規化。
3.  **Client 區分**：操作私有數據(CRUD)用 `supabase`；公開查詢只用 `supabasePublic`。
4.  **緩存機制**：`photoService.ts` 內的查詢已內建 5 分鐘過期快取，非必要不要隨意修改快取邏輯。
5.  **Schema 變更**：若需要新增 DB 欄位，請確認 `photoMutationService.ts` 內的 CRUD payload 是否需要同步更新，以防資料同步失敗。
