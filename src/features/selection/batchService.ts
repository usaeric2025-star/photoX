import { ApiResponse } from '@/types/api';
import { Photo } from '@/types';

// Simple API client proxy for batch operations
export const batchService = {
  async delete(ids: string[]): Promise<ApiResponse> {
    const res = await fetch('/api/admin/photos/batch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return res.json();
  },

  async update(ids: string[], updates: Partial<Photo>): Promise<ApiResponse> {
    const res = await fetch('/api/admin/photos/batch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates }),
    });
    return res.json();
  },

  async addTags(ids: string[], tagIds: string[]): Promise<ApiResponse> {
    const res = await fetch('/api/admin/photos/batch/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, tagIds, action: 'add' }),
    });
    return res.json();
  }
};
