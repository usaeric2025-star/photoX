
import { useGalleryContext } from '../context/GalleryContext';
import { photoApi } from '../api/photos';
import { groupApi } from '../api/groups';
import { tagApi } from '../api/tags';
import { categoryApi } from '../api/categories';
import { saveData } from '../utils/indexedDB';
import { supabase } from '../services/client';

export function useDelete() {
  const { 
    setPhotos, setCategories, setTags, setManufacturers, 
    photos, user 
  } = useGalleryContext();

  const deletePhotos = async (idOrIds: string | string[]): Promise<{ success: boolean, error?: any }> => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const photosToDelete = photos.filter(p => ids.includes(p.id));
    const userId = user?.id;

    try {
      const nextPhotos = photos.filter(p => !ids.includes(p.id));
      
      // Optimistic UI
      setPhotos(nextPhotos);
      await saveData('product_photos', nextPhotos);

      if (userId) {
          const { deletePhotosBatch } = await import('../services/photoService');
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
      const { clearGroupIdInCloud } = await import('../services/photoService');
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
      // 1. Update photos using this category in cloud
      // Keep this direct Supabase here for now as it crosses table boundaries, 
      // but acknowledge boundary crossing.
      const { data: affected } = await supabase
        .from('furniture_items')
        .update({ category_id: null })
        .eq('category_id', categoryId)
        .select('id');
      
      // 2. Delete the category itself using service layer
      const { deleteCategoryFromDB } = await import('../services/categoryService');
      await deleteCategoryFromDB(categoryId);

      // 3. Update local state
      setCategories(prev => prev.filter(c => String(c.id) !== String(categoryId)));
      if (affected && affected.length > 0) {
        const affectedIds = affected.map(a => a.id);
        setPhotos(prev => prev.map(p => affectedIds.includes(p.id) ? { ...p, categoryId: null } : p));
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteManufacturer = async (mfrId: string): Promise<{ success: boolean, error?: any }> => {
    try {
      // 1. Update photos in cloud (this side-effect should ideally be in manufacturerService or orchestrator, but keeping consistent with existing structure)
      const { data: affected } = await supabase
        .from('furniture_items')
        .update({ manufacturer_id: null })
        .eq('manufacturer_id', mfrId)
        .select('id');

      // 2. Delete manufacturer using service layer
      const { deleteManufacturerFromDB } = await import('../services/manufacturerService');
      await deleteManufacturerFromDB(mfrId);

      // 3. Update local state
      setManufacturers(prev => prev.filter(m => String(m.id) !== String(mfrId)));
      if (affected && affected.length > 0) {
        const affectedIds = affected.map(a => a.id);
        setPhotos(prev => prev.map(p => affectedIds.includes(p.id) ? { ...p, manufacturerId: null } : p));
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
