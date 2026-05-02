
import { useAdminUI } from '../context/AdminContexts';
import { useGalleryContext } from '../context/GalleryContext';
import { useErrorHandler } from '../utils/errorHandler';
import { photoApi } from '../api/photos';
import { groupApi } from '../api/groups';
import { tagApi } from '../api/tags';
import { categoryApi } from '../api/categories';
import { Photo } from '../types';
import { saveData } from '../utils/indexedDB';
import { supabase } from '../services/client';

export function useDelete() {
  const { 
    setPhotos, setCategories, setTags, setManufacturers, 
    photos, categories, tags, manufacturers, user 
  } = useGalleryContext();
  const { setAlertDialog, showToast, setCloudCount } = useAdminUI();
  const { handleError } = useErrorHandler();

  const confirmDelete = (options: {
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }) => {
    setAlertDialog({
      title: options.title,
      message: options.message,
      confirmLabel: '刪除',
      cancelLabel: '取消',
      type: 'danger',
      onConfirm: options.onConfirm
    });
  };

  const deletePhotos = async (idOrIds: string | string[]) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const photosToDelete = photos.filter(p => ids.includes(p.id));
    const userId = user?.id;

    confirmDelete({
      title: ids.length > 1 ? `批量刪除 ${ids.length} 張照片` : '刪除照片',
      message: '刪除後無法恢復，雲端文件也將被移除。',
      onConfirm: async () => {
        try {
          const nextPhotos = photos.filter(p => !ids.includes(p.id));
          
          // Optimistic UI
          setPhotos(nextPhotos);
          setCloudCount(nextPhotos.length);
          await saveData('product_photos', nextPhotos);

          if (userId) {
             const { deletePhotosBatch } = await import('../services/photoService');
             await deletePhotosBatch(userId, photosToDelete);
          }
          showToast(`已成功刪除 ${ids.length} 張照片`, 'success');
        } catch (err) {
          // Rollback
          const storedPhotos = await import('../utils/indexedDB').then(m => m.loadData('product_photos'));
          if (storedPhotos) setPhotos(storedPhotos);
          handleError(err, '刪除照片失敗');
        }
      }
    });
  };

  const deleteGroup = async (groupId: string) => {
    const userId = user?.id;
    if (!userId) return;

    confirmDelete({
      title: '解散群組',
      message: '這將取消所有照片與此群組的關聯，群組信息將被永久移除。',
      onConfirm: async () => {
        try {
          const { clearGroupIdInCloud } = await import('../services/photoService');
          await clearGroupIdInCloud(groupId);
          await groupApi.deleteOne(groupId, userId);
          showToast('群組已成功解散', 'success');
        } catch (err) {
          handleError(err, '解散群組失敗');
        }
      }
    });
  };

  const deleteTag = async (tagId: string) => {
    confirmDelete({
      title: '刪除標籤',
      message: '這將從所有照片中移除此標籤。',
      onConfirm: async () => {
        try {
          await tagApi.deleteOne(tagId);
          setTags(prev => prev.filter(t => t.id !== tagId));
          showToast('標籤已成功刪除', 'success');
        } catch (err) {
          handleError(err, '刪除標籤失敗');
        }
      }
    });
  };

  const deleteCategory = async (categoryId: string) => {
    confirmDelete({
      title: '刪除分類',
      message: '這將移除此分類。如果正在使用此分類的照片，將變為未分類。',
      onConfirm: async () => {
        try {
          // 1. Update photos using this category in cloud
          const { data: affected } = await supabase
            .from('furniture_items')
            .update({ category_id: null })
            .eq('category_id', categoryId)
            .select('id');
          
          // 2. Delete the category itself
          await categoryApi.deleteOne(categoryId);

          // 3. Update local state
          setCategories(prev => prev.filter(c => String(c.id) !== String(categoryId)));
          if (affected && affected.length > 0) {
            const affectedIds = affected.map(a => a.id);
            setPhotos(prev => prev.map(p => affectedIds.includes(p.id) ? { ...p, categoryId: null } : p));
          }

          showToast('分類已成功刪除', 'success');
        } catch (err) {
          handleError(err, '刪除分類失敗');
        }
      }
    });
  };

  const deleteManufacturer = async (mfrId: string) => {
    confirmDelete({
      title: '刪除廠商',
      message: '這將移除此廠商信息。相關照片的廠商信息將被置空。',
      onConfirm: async () => {
        try {
          // 1. Update photos in cloud
          const { data: affected } = await supabase
            .from('furniture_items')
            .update({ manufacturer_id: null })
            .eq('manufacturer_id', mfrId)
            .select('id');

          // 2. Delete manufacturer
          const { error } = await supabase
            .from('manufacturers')
            .delete()
            .eq('id', mfrId);
          if (error) throw error;

          // 3. Update local state
          setManufacturers(prev => prev.filter(m => String(m.id) !== String(mfrId)));
          if (affected && affected.length > 0) {
            const affectedIds = affected.map(a => a.id);
            setPhotos(prev => prev.map(p => affectedIds.includes(p.id) ? { ...p, manufacturerId: null } : p));
          }

          showToast('廠商已成功刪除', 'success');
        } catch (err) {
          handleError(err, '刪除廠商失敗');
        }
      }
    });
  };

  return {
    deletePhotos,
    deleteGroup,
    deleteTag,
    deleteCategory,
    deleteManufacturer
  };
}
