
import { useGalleryContext } from '../context/GalleryContext';
import { photoApi } from '../api/photos';
import { groupApi } from '../api/groups';
import { tagApi } from '../api/tags';
import { categoryApi } from '../api/categories';
import { saveData } from '../utils/indexedDB';
import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { safeArray } from '../lib/utils';

export function useDelete() {
  const { 
    setPhotos, setCategories, setTags, setManufacturers, 
    photos, user 
  } = useGalleryContext();

  const deletePhotos = async (idOrIds: string | string[]): Promise<{ success: boolean, error?: any }> => {
    const ids = safeArray(Array.isArray(idOrIds) ? idOrIds : [idOrIds]);
    const sPhotos = safeArray(photos);
    const photosToDelete = sPhotos.filter(p => ids.includes(p.id));
    const userId = user?.id;

    try {
      const nextPhotos = sPhotos.filter(p => !ids.includes(p.id));
      
      // Optimistic UI
      setPhotos(nextPhotos);
      await saveData('product_photos', nextPhotos);

      if (userId) {
          const { deletePhotosBatch } = await import('../services/photoMutationService');
          await deletePhotosBatch(userId, photosToDelete);
      }
      return { success: true };
    } catch (err) {
      // Rollback
      const storedPhotos = await import('../utils/indexedDB').then(m => m.loadData('product_photos'));
      if (storedPhotos) setPhotos(storedPhotos);
      return { success: false, error: err };
    }
  };

  const deleteGroup = async (groupId: string): Promise<{ success: boolean, error?: any }> => {
    const userId = user?.id;
    if (!userId) return { success: false, error: 'User ID not found' };

    try {
      const { clearGroupIdInCloud } = await import('../services/photoSyncService');
      await clearGroupIdInCloud(groupId);
      
      const { deleteGroupFromCloud } = await import('../services/groupService');
      await deleteGroupFromCloud(groupId);
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteTag = async (tagId: string): Promise<{ success: boolean, error?: any }> => {
    try {
      const { deleteTagFromDB } = await import('../services/tagService');
      await deleteTagFromDB(tagId);
      
      setTags(prev => prev.filter(t => t.id !== tagId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteCategory = async (categoryId: string): Promise<{ success: boolean, error?: any }> => {
    try {
      // 1. Update photos using this category in cloud via service
      const { clearCategoryFromPhotos, deleteCategoryFromDB } = await import('../services/photoMutationService').then(async m => {
          const catM = await import('../services/categoryService');
          return { clearCategoryFromPhotos: m.clearCategoryFromPhotos, deleteCategoryFromDB: catM.deleteCategoryFromDB };
      });
      
      const affected = await clearCategoryFromPhotos(categoryId);
      
      // 2. Delete the category itself using service layer
      await deleteCategoryFromDB(categoryId);

      // 3. Update local state
      setCategories(prev => safeArray(prev).filter(c => String(c.id) !== String(categoryId)));
      const sAffected = safeArray(affected);
      if (sAffected.length > 0) {
        const affectedIds = sAffected.map(a => a.id);
        setPhotos(prev => safeArray(prev).map(p => affectedIds.includes(p.id) ? { ...p, categoryId: null } : p));
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteManufacturer = async (mfrId: string): Promise<{ success: boolean, error?: any }> => {
    try {
      // 1. Update photos in cloud via service helper
      const { clearManufacturerFromPhotos, deleteManufacturerFromDB } = await import('../services/photoMutationService').then(async m => {
          const mfrM = await import('../services/manufacturerService');
          return { clearManufacturerFromPhotos: m.clearManufacturerFromPhotos, deleteManufacturerFromDB: mfrM.deleteManufacturerFromDB };
      });
      
      const affected = await clearManufacturerFromPhotos(mfrId);

      // 2. Delete manufacturer using service layer
      await deleteManufacturerFromDB(mfrId);

      // 3. Update local state
      setManufacturers(prev => safeArray(prev).filter(m => String(m.id) !== String(mfrId)));
      const sAffected = safeArray(affected);
      if (sAffected.length > 0) {
        const affectedIds = sAffected.map(a => a.id);
        setPhotos(prev => safeArray(prev).map(p => affectedIds.includes(p.id) ? { ...p, manufacturerId: null } : p));
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  return {
    deletePhotos,
    deleteGroup,
    deleteTag,
    deleteCategory,
    deleteManufacturer
  };
}
