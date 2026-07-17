import { api } from '#lib/api.js';
import { ProductGroup } from '#src/types/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

/**
 * GroupService
 * 
 * 處理群組與照片關係的 API 呼叫。
 */
export const GroupService = {
  list: async () => {
    return ErrorFactory.unwrap<ProductGroup[]>(
      api.admin.groups.$get(),
      '獲取群組列表失敗'
    );
  },

  create: async (data: { name: string; userId: string }) => {
    return ErrorFactory.unwrap<ProductGroup>(
      api.admin.groups.$post({ json: data }),
      '創建群組失敗'
    );
  },

  update: async (id: string, updates: Partial<ProductGroup>) => {
    return ErrorFactory.unwrap<ProductGroup>(
      api.admin.groups[':id'].$put({ param: { id }, json: { updates } }),
      '更新群組失敗'
    );
  },

  delete: async (id: string) => {
    return ErrorFactory.unwrap<unknown>(
      api.admin.groups[':id'].$delete({ param: { id } }),
      '刪除群組失敗'
    );
  },

  setCover: async (photoId: string, groupId: string) => {
    return ErrorFactory.unwrap<unknown>(
      api.admin.groups['set-cover'].$post({ json: { photoId, groupId } }),
      '設置封面失敗'
    );
  },

  movePhotos: async (photoIds: string[], groupId: string) => {
    return ErrorFactory.unwrap<unknown>(
      api.admin.groups['move-photos'].$post({ json: { photoIds, groupId } }),
      '移動照片失敗'
    );
  },

  removePhotos: async (photoIds: string[], groupId: string) => {
    return ErrorFactory.unwrap<unknown>(
      api.admin.groups['remove-photos'].$post({ json: { photoIds, groupId } }),
      '從群組移除照片失敗'
    );
  },

  ungroup: async (groupId: string) => {
    return ErrorFactory.unwrap<unknown>(
      api.admin.groups['ungroup'].$post({ json: { groupId } }),
      '解散群組失敗'
    );
  },

  groupPhotos: async (photoIds: string[], targetGroupId?: string) => {
    return ErrorFactory.unwrap<unknown>(
      api.admin.groups['group-photos'].$post({ json: { photoIds, targetGroupId } }),
      '組合照片失敗'
    );
  }
};
