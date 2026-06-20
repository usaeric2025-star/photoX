import { ApiResponse } from '@/types/api';
import { Photo } from '@/types';
import { api } from '@/lib/api';

// Simple API client proxy for batch operations
export const batchService = {
  async delete(ids: string[]): Promise<ApiResponse> {
    const res = await api.admin.photos.batch.$delete({
      json: { ids },
    });
    return res.json();
  },

  async update(ids: string[], updates: Partial<Photo>): Promise<ApiResponse> {
    const res = await api.admin.photos.batch.$patch({
      json: { ids, updates },
    });
    return res.json();
  },

  async addTags(ids: string[], tagIds: string[]): Promise<ApiResponse> {
    const res = await api.admin.photos.batch.tags.$post({
      json: { ids, tagIds, action: 'add' },
    });
    return res.json();
  }
};
