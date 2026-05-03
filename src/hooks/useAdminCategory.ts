import { useState, useEffect, useRef } from 'react';
import { useErrorHandler } from '../utils/errorHandler';
import { useDelete } from './useDelete';
import { categoryApi } from '../api/categories';
import { tagApi } from '../api/tags';
import { photoApi } from '../api/photos';
import { Category, Tag, SubCategory, Photo } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../constants';
import { loadData, saveData } from '../utils/indexedDB';
import { useGalleryContext } from '../context/GalleryContext';
import { 
  updateTagInDB, 
  deleteTagFromDB, 
  updateCategoryInDB, 
  deleteCategoryFromDB, 
  addTagToDB,
  addCategoryToDB,
  addManufacturerToDB,
  updateManufacturerInDB,
  deleteManufacturerFromDB,
  savePhotoToCloud,
  supabase
} from '../services/supabaseService';

export const useAdminCategory = (adminUI: any) => {
  const { handleError } = useErrorHandler();
  const { deleteTag: deleteTagHook, deleteCategory: deleteCategoryHook } = useDelete();
  const { setAlertDialog = () => {}, showToast = () => {} } = adminUI || {};

  const {
    categories, setCategories,
    tags, setTags,
    manufacturers, setManufacturers,
    photos, setPhotos
  } = useGalleryContext();

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [publicCategories, setPublicCategories] = useState<Category[]>([]);
  const [publicTags, setPublicTags] = useState<Tag[]>([]);
  const [publicManufacturers, setPublicManufacturers] = useState<SubCategory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
      const storedCats = await loadData('product_categories');
      if (Array.isArray(storedCats)) setCategories(storedCats);
      else if (categories.length === 0) setCategories(DEFAULT_CATEGORIES);

      const storedTags = await loadData('product_tags');
      if (Array.isArray(storedTags)) setTags(storedTags);
      else if (tags.length === 0) setTags(DEFAULT_TAGS);

      const storedMfrs = await loadData('product_manufacturers');
      if (storedMfrs) setManufacturers(storedMfrs);
      
      setIsLoaded(true);
    };
    loadInit();
  }, [setCategories, setTags, setManufacturers]); // Add setters if needed, but they are constant from useGalleryContext memo

  // Persist categories/tags/manufacturers locally
  useEffect(() => {
    if (!isLoaded) return;
    const persist = async () => {
      await saveData('product_categories', categories);
      await saveData('product_tags', tags);
      await saveData('product_manufacturers', manufacturers);
    };
    persist();
  }, [categories, tags, manufacturers, isLoaded]);

  const updateTag = async (tagId: string, newName: string) => {
    try {
      const upName = newName.toUpperCase().trim();
      if (!upName) return;
      
      const nextTags = tags.map(t => String(t.id) === String(tagId) ? { ...t, name: upName } : t).sort((a, b) => a.name.localeCompare(b.name));
      setTags(nextTags);
      await saveData('product_tags', nextTags);
      
      await tagApi.update(tagId, upName);
    } catch (err: any) {
      // Revert local state if cloud failed
      const storedTags = await loadData('product_tags');
      if (storedTags) setTags(storedTags);
      handleError(err, '更新標籤失敗');
    }
  };

  // 从单张照片移除标签（编辑灯箱用）
  const removeTagFromPhoto = async (photoId: string, tagId: string) => {
    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;
      const newTagIds = (photo.tagIds || []).filter(tid => String(tid) !== String(tagId));
      
      await supabase
          .from('furniture_items')
          .update({ tagIds: newTagIds })
          .eq('id', photoId);

      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, tagIds: newTagIds } : p));
      await saveData('product_photos', photos.map(p => p.id === photoId ? { ...p, tagIds: newTagIds } : p));
    } catch (err: any) {
      showToast(`移除标签失败: ${err.message}`, 'error');
      throw err;
    }
  };

  // 从单张照片移除分类（编辑灯箱用）
  const removeCategoryFromPhoto = async (photoId: string) => {
    try {
      await supabase
          .from('furniture_items')
          .update({ category_id: null })
          .eq('id', photoId);

      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, categoryId: null } : p));
      await saveData('product_photos', photos.map(p => p.id === photoId ? { ...p, categoryId: null } : p));
    } catch (err: any) {
      showToast(`移除分类失败: ${err.message}`, 'error');
      throw err;
    }
  };

  // 彻底删除标签（设置页面用）
  const deleteTagPermanently = async (tagId: string) => {
        try {
          const strId = String(tagId);
          
          // 1. Remove from all photos
          const { data: photosWithTag } = await supabase
              .from('furniture_items')
              .select('id, tagIds')
              .contains('tagIds', [strId]);
  
          if (photosWithTag && photosWithTag.length > 0) {
              for (const photo of photosWithTag) {
                  const newTagIds = (photo.tagIds || []).filter(tid => String(tid) !== strId);
                  const { error } = await supabase
                      .from('furniture_items')
                      .update({ tagIds: newTagIds })
                      .eq('id', photo.id);
                  if (error) throw error;
              }
              
              const refreshedPhotos = photos.map(p => ({
                  ...p,
                  tagIds: (p.tagIds || []).filter(tid => String(tid) !== strId)
              }));
              setPhotos(refreshedPhotos);
              await saveData('product_photos', refreshedPhotos);
          }
  
          // 2. Delete tag
          const success = await deleteTagFromDB(tagId);
          if (!success) throw new Error("无法在云端删除标签。");
  
          const newTags = tags.filter(t => String(t.id) !== strId);
          setTags(newTags);
          await saveData('product_tags', newTags);
          
          showToast('标签删除成功');
        } catch (err: any) {
          showToast(`标签删除失败: ${err.message}`, 'error');
          throw err;
        }
  };

  const deleteTag = async (id: string | number) => {
    // Component should confirm before calling!
    await deleteTagPermanently(String(id));
  };

  const addCategory = async (name: string) => {
    try {
      const trimmed = name.trim();
      if (!trimmed) return;
      const saved = await categoryApi.create(trimmed);
      if (saved) {
        const nextCategories = [...categories, saved];
        setCategories(nextCategories);
        await saveData('product_categories', nextCategories);
      }
    } catch (err: any) {
      handleError(err, '添加分類失敗');
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const nextCategories = categories.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c);
      setCategories(nextCategories);
      await saveData('product_categories', nextCategories);
      await categoryApi.update(id, updates);
    } catch (err) {
      handleError(err, '更新分類失敗');
    }
  };

  const deleteCategory = async (id: string) => {
    const { success, error } = await deleteCategoryHook(id);
    if (!success) {
      handleError(error, '刪除分類失敗');
    } else {
      showToast('分類已成功刪除', 'success');
    }
  };

  const performDeleteCategory = async (strId: string) => {
      try {
        const success = await deleteCategoryFromDB(strId);
        if (!success) throw new Error("无法在云端删除分类。");

        const nextCategories = categories.filter(c => String(c.id) !== strId);
        if (isMounted.current) {
            setCategories(nextCategories);
            await saveData('product_categories', nextCategories);
        }
        
        const nextPhotos = photos.map(p => String(p.categoryId) === strId ? { ...p, categoryId: null } : p);
        if (isMounted.current) {
            setPhotos(nextPhotos);
            await saveData('product_photos', nextPhotos);
        }

        const affectedPhotos = nextPhotos.filter((p, i) => String(photos[i].categoryId) === strId);
        if (affectedPhotos.length > 0) {
            const { data: { user: userObj } } = await supabase.auth.getUser();
            if (userObj) await Promise.allSettled(affectedPhotos.map(p => savePhotoToCloud(userObj.id, p)));
        }
      } catch (err: any) {
        if (isMounted.current) showToast(`分类删除失败: ${err.message}`, 'error');
      }
  };

  const addManufacturer = async (name: string) => {
    try {
      const trimmed = name.trim().toUpperCase();
      if (!trimmed) return;
      const saved = await addManufacturerToDB(trimmed);
      const newMfrs = [...manufacturers, saved];
      setManufacturers(newMfrs);
      await saveData('product_manufacturers', newMfrs);
      return saved;
    } catch (err: any) {
      console.error("[useAdminCategory] Add manufacturer failed:", err);
      showToast(`添加厂商失败: ${err.message || '网络连接或数据库权限问题'}`, 'error');
    }
  };

  const updateManufacturer = async (id: string | number, name: string) => {
    try {
      const strId = String(id);
      const trimmed = name.trim().toUpperCase();
      await updateManufacturerInDB(strId, trimmed);
      const newMfrs = manufacturers.map(m => 
        String(m.id) === strId ? { ...m, name: trimmed } : m
      );
      setManufacturers(newMfrs);
      await saveData('product_manufacturers', newMfrs);
    } catch (err: any) {
      console.error("[useAdminCategory] Update manufacturer failed:", err);
      showToast(`更新厂商失败: ${err.message || '网络连接或数据库权限问题'}`, 'error');
    }
  };

  const deleteManufacturer = async (id: string | number) => {
    // UI should confirm before calling!
    try {
      const strId = String(id);
      const { count } = await supabase
        .from('furniture_items')
        .select('*', { count: 'exact', head: true })
        .eq('manufacturer_id', strId);
      
      if (count && count > 0) {
        const { error } = await supabase
          .from('furniture_items')
          .update({ manufacturer_id: null })
          .eq('manufacturer_id', strId);
        if (error) throw error;
      }
      await performDeleteManufacturer(strId, id);
      showToast('厂商删除成功');
    } catch (err: any) {
      showToast(`删除失败: ${err.message}`, 'error');
    }
  };

  const performDeleteManufacturer = async (strId: string, id: string | number) => {
    try {
        const success = await deleteManufacturerFromDB(strId);
        if (!success) throw new Error("無法刪除廠商");

        const newMfrs = manufacturers.filter(m => String(m.id) !== strId);
        setManufacturers(newMfrs);
        await saveData('product_manufacturers', newMfrs);
        
        const nextPhotos = photos.map(p => 
          String(p.manufacturerId) === strId ? { ...p, manufacturerId: null } : p
        );
        
        if (isMounted.current) {
          setPhotos(nextPhotos);
          await saveData('product_photos', nextPhotos);
        }

        const affectedPhotos = nextPhotos.filter((p, i) => String(photos[i].manufacturerId) === strId);
        if (affectedPhotos.length > 0) {
          const { data: { user: userObj } } = await supabase.auth.getUser();
          if (userObj) await Promise.allSettled(affectedPhotos.map(p => savePhotoToCloud(userObj.id, p)));
        }
      } catch (err: any) {
         if (isMounted.current) showToast(`删除厂商失败: ${err.message}`, 'error');
      }
  };


  const addTag = async (name: string) => {
    try {
      const saved = await tagApi.create(name);
      if(saved) {
        setTags(prev => [...prev, saved].sort((a,b) => a.name.localeCompare(b.name)));
        await saveData('product_tags', [...tags, saved].sort((a,b) => a.name.localeCompare(b.name)));
      }
      return saved;
    } catch(err: any) {
      handleError(err, '添加標籤失敗');
    }
  };
  
  return {
    categories, setCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    tags, setTags,
    addTag,
    updateTag,
    deleteTag,
    removeCategoryFromPhoto,
    removeTagFromPhoto,
    deleteTagPermanently,
    manufacturers, setManufacturers,
    addManufacturer,
    updateManufacturer,
    deleteManufacturer,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  };
};
