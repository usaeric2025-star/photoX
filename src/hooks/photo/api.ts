import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { queryKeys } from '#lib/query/keys.js';
import { queryClient as globalQueryClient } from '#lib/query/index.js';

/**
 * updatePhoto (Standalone)
 * 用於非組件環境（如 AI Orchestration）直接調用 API。
 */
export async function updatePhoto(id: string, updates: Record<string, unknown>) {
  const res = await api.admin.photos[':id'].$patch({
    param: { id },
    // @ts-ignore
    json: updates
  });
  const data = await ErrorFactory.unwrap<{ id: string }>(res, 'Update Failed');
  globalQueryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(id) });
  globalQueryClient.invalidateQueries({ queryKey: queryKeys.photos.lists() });
  return data;
}
