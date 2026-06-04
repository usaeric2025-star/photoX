import { usePhotoEdit, usePhotoDelete, usePhotoBatchEdit } from '@/hooks';
import type { Photo } from '@/types';
import { useUIStore } from '@/store/useUIStore';

interface PhotoUpdateData {
  name?: string;
  description?: string;
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

  const handleDeletePhoto = async (ids: string | string[]) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    if (idList.length === 0) return;

    updateStore({
      alertDialog: {
        title: appLang === 'zh' ? '確認刪除' : 'Confirm Delete',
        message: appLang === 'zh' 
          ? `確定要永久刪除這 ${idList.length} 張照片嗎？此操作不可撤銷。` 
          : `Are you sure you want to permanently delete these ${idList.length} photos? This cannot be undone.`,
        type: 'danger',
        onConfirm: async () => {
          try {
            await deletePhoto.mutateAsync(idList);
          } catch (err) {}
        }
      }
    });
  };

  const handleUpdatePhoto = async (id: string, updates: PhotoUpdateData) => {
    try {
      await updatePhoto.mutateAsync({ id, updates });
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
