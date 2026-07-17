import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '#lib/query/keys.js';
import { logger } from '#lib/logger.js';

/**
 * AdminService
 * 
 * 處理管理員相關的複雜業務邏輯，如從緩存中檢索數據、批量操作預處理等。
 */
export const AdminService = {
  /**
   * 從 QueryClient 緩存中獲取所有已加載的照片
   */
  getAllCachedPhotos: (queryClient: QueryClient) => {
    try {
      const cachedQueries = queryClient.getQueriesData({ queryKey: queryKeys.photos.all });
      const foundPhotos = new Map<string, any>();
      
      for (const [_, data] of cachedQueries) {
        if (!data) continue;
        const typedData = data as any;
        
        // 處理分頁數據 (Infinite Query)
        if (typeof data === 'object' && 'pages' in typedData && Array.isArray(typedData.pages)) {
          for (const page of typedData.pages) {
            const items = (page.items || page.data || []) as any[];
            for (const item of items) {
              if (item && typeof item.id === 'string') {
                foundPhotos.set(item.id, item);
              }
            }
          }
        } 
        // 處理普通列表數據
        else if (Array.isArray(data)) {
          for (const item of data) {
            if (item && typeof item.id === 'string') {
              foundPhotos.set(item.id, item);
            }
          }
        }
        // 處理單個照片數據
        else if (typeof data === 'object' && typedData.id) {
          foundPhotos.set(typedData.id, typedData);
        }
      }
      return Array.from(foundPhotos.values());
    } catch (err) {
      logger.error('[AdminService] Failed to retrieve photos from cache:', err);
      return [];
    }
  },

  /**
   * 根據目標 ID 列表過濾照片，並包含同組的照片
   */
  filterPhotosWithGroups: (allPhotos: any[], targetIds: string[]) => {
    if (targetIds.length === 0) return allPhotos;
    const selectedGroupIds = new Set<string>();
    const targetIdSet = new Set(targetIds.map(id => String(id)));

    allPhotos.forEach((p) => {
      if (targetIdSet.has(String(p.id)) && p.groupId) {
        selectedGroupIds.add(String(p.groupId));
      }
    });
    
    return allPhotos.filter((p) => 
      targetIdSet.has(String(p.id)) || (p.groupId && selectedGroupIds.has(String(p.groupId)))
    );
  }
};
