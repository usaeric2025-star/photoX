import { usePhotoEdit, usePhotoDelete, usePhotoBatchEdit } from '@/hooks';
import type { Photo } from '@/types';
import { useUIStore } from '@/store/useUIStore';

interface PhotoUpdateData {
  name?: {
    zh: string;
    en?: string;
    ms?: string;
  };
  description?: {
    zh?: string;
    en?: string;
    ms?: string;
  } | null;
  category_id?: string | null;
  manufacturer_id?: string | null;
  tag_ids?: string[];
  is_hidden?: boolean;
  is_pinned?: boolean;
  group_id?: string | null;
  group_order?: number;
  price?: string;
  uri?: string; 
}

export function useAdminActions() {
  const deletePhoto = usePhotoDelete();
  const updatePhoto = usePhotoEdit();
  const batchUpdate = usePhotoBatchEdit();
  const updateStore = useUIStore(s => s.update);
  const appLang = useUIStore(s => s.appLang);

  const handleDeletePhoto = (ids: string | string[]) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;
    deletePhoto.mutate(idList);
  };

  const handleUpdatePhoto = async (id: string, updates: PhotoUpdateData) => {
    try {
      await (updatePhoto.mutateAsync as any)({ id, updates });
      // Feedback is handled in the hook
    } catch (err) {
      // Error feedback is handled in the hook
    }
  };

  return {
    deletePhoto: handleDeletePhoto,
    updatePhoto: handleUpdatePhoto,
    batchUpdate,
    onBatchAiAnalyze: async (photos: Photo[]) => { /* implementation */ },
  };
}
