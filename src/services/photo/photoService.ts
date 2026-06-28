import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';
import { errorService } from '@/services/error';
import { Photo, ProductFormData } from '@/types/photo';
import { FilterOptions as PhotoFilters } from '@/types/api';
import { updatePhoto as update, BatchActionResult, deleteMany, batchUpdate } from './commands';
import { syncBatchPhotoTags } from '@/services/tag/commands';
import { queryKeys } from '@/lib/query/keys';

// ===== 查詢方法 =====
export function usePhotos(filters?: PhotoFilters) {
  const { data, error, isLoading, mutate } = useSWR<Photo[], any>(
    [queryKeys.photos.all, filters],
    () => api.photos.list(filters),
    {}
  );

  return {
    photos: data || [],
    isLoading,
    error,
    mutate,
  };
}

// ===== 變更方法 =====
export function usePhotoMutations() {
  const { mutate } = useSWRConfig();
  const [isMutating, setIsMutating] = useState(false);

  const create = async (data: ProductFormData) => {
    setIsMutating(true);
    try {
      const newPhoto = await api.photos.create(data);
      mutate([queryKeys.photos.all]);
      return newPhoto;
    } catch (e) {
      errorService.handle(e, { context: 'photo.create' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  const edit = async (id: string, updates: Partial<ProductFormData>) => {
    setIsMutating(true);
    try {
      const { tags, ...coreUpdates } = updates;
      const res = await update(id, coreUpdates as Partial<Photo>);
      
      if (tags && Array.isArray(tags)) {
        const tagIds = tags.map(t => typeof t === 'object' && t !== null ? String((t as { id?: string | number }).id) : String(t)).filter(Boolean);
        const tagSources: Record<string, "user"> = {};
        tagIds.forEach(tId => {
          tagSources[tId] = "user";
        });
        await syncBatchPhotoTags([id], tagIds, undefined, tagSources);
      }
      
      mutate([queryKeys.photos.all]);
      return res as Photo;
    } catch (e) {
      errorService.handle(e, { context: 'photo.update' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  const batchEdit = async (ids: string[], updates: Partial<ProductFormData>) => {
    setIsMutating(true);
    try {
      const { tags, ...coreUpdates } = updates;
      const res = await batchUpdate(ids, coreUpdates as Partial<Photo>);
      
      if (tags && Array.isArray(tags)) {
        const tagIds = (tags as { id: string | number }[]).filter(t => t && t.id).map(t => String(t.id));
        const tagSources: Record<string, "user"> = {};
        tagIds.forEach(tId => {
          tagSources[tId] = "user";
        });
        await syncBatchPhotoTags(ids, tagIds, undefined, tagSources);
      }
      
      mutate([queryKeys.photos.all]);
      return res;
    } catch (e) {
      errorService.handle(e, { context: 'photo.batchEdit' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  const remove = async (ids: string[]) => {
    setIsMutating(true);
    try {
      await deleteMany(ids);
      mutate([queryKeys.photos.all]);
    } catch (e) {
      errorService.handle(e, { context: 'photo.delete' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  const togglePin = async (id: string, isPinned: boolean) => {
    setIsMutating(true);
    try {
      const res = await update(id, { is_pinned: isPinned });
      if (!res) throw new Error('Failed to update photo');
      mutate([queryKeys.photos.all]);
      return res;
    } catch (e) {
      errorService.handle(e, { context: 'photo.togglePin' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    create,
    edit,
    batchEdit,
    remove,
    togglePin,
    isMutating,
  };
}
