import { useState, useEffect, useRef } from 'react';
import { useErrorHandler } from '../utils/errorHandler';
import { useDelete } from './useDelete';
import { Category, Tag, SubCategory } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../constants';
import { loadData, saveData } from '../utils/indexedDB';
import { useGallery } from './useGallery';
import { safeArray } from '../lib/utils';
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

import { toast } from 'sonner';

export const useAdminCategory = (adminUI: {
  setAlertDialog: (d: { title: string, message: string, onConfirm?: () => void, onCancel?: () => void, confirmLabel?: string, type?: 'danger' | 'info' } | null) => void;
}) => {
  const { handleError } = useErrorHandler();
  const { deleteTag: deleteTagHook, deleteCategory: deleteCategoryHook } = useDelete();
  const { setAlertDialog = () => {} } = adminUI || {};

  const {
    categories, setCategories,
    tags, setTags,
    manufacturers, setManufacturers,
    photos, setPhotos
  } = useGallery();

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
      else if (safeArray(categories).length === 0) setCategories(DEFAULT_CATEGORIES);

      const storedTags = await loadData('product_tags');
      if (Array.isArray(storedTags)) setTags(storedTags);
      else if (safeArray(tags).length === 0) setTags(DEFAULT_TAGS);

      const storedMfrs = await loadData('product_manufacturers');
      if (storedMfrs) setManufacturers(storedMfrs);
      
      setIsLoaded(true);
    };
    loadInit();
  }, [setCategories, setTags, setManufacturers]);

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
      
      const nextTags = safeArray(tags).map(t => String(t.id) === String(tagId) ? { ...t, name: upName } : t).sort((a, b) => a.name.localeCompare(b.name));
      setTags(nextTags);
      await saveData('product_tags', nextTags);
      
      await updateTagInDB(tagId, upName);
    } catch (err) {
      // Revert local state if cloud failed
      const error = err instanceof Error ? err : new Error(String(err));
      const storedTags = await loadData('product_tags');
      if (storedTags) setTags(storedTags);
      handleError(error, '更新标签失败');
    }
  };

  // 从单张照片移除标签（编辑灯箱用）
  const removeTagFromPhoto = async (photoId: string, tagId: string) => {
    try {
      const photo = safeArray(photos).find(p => p.id === photoId);
      if (!photo) return;
      const newTagIds = safeArray(photo.tagIds).filter(tid => String(tid) !== String(tagId));
      
      // FIX: Operate on 'photo_tags' relational table, not 'furniture_items'
      const { error } = await supabase
          .from('photo_tags')
          .delete()
          .eq('photo_id', photoId)
          .eq('tag_id', tagId);
      if (error) throw error;

      setPhotos(prev => safeArray(prev).map(p => p.id === photoId ? { ...p, tagIds: newTagIds } : p));
      await saveData('product_photos', safeArray(photos).map(p => p.id === photoId ? { ...p, tagIds: newTagIds } : p));
    } catch (err) {
      handleError(err, '从照片移除标签失败');
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

      setPhotos(prev => safeArray(prev).map(p => p.id === photoId ? { ...p, categoryId: null } : p));
      await saveData('product_photos', safeArray(photos).map(p => p.id === photoId ? { ...p, categoryId: null } : p));
    } catch (err) {
      handleError(err, '从照片移除分类失败');
      throw err;
    }
  };

  // 彻底删除标签（设置页面用）
  const deleteTagPermanently = async (tagId: string) => {
        try {
          const strId = String(tagId);
          
          // 1. Remove all associations from 'photo_tags'
          const { error: deleteError } = await supabase
              .from('photo_tags')
              .delete()
              .eq('tag_id', strId);
          if (deleteError) throw deleteError;
          
          // Update local state
          const refreshedPhotos = safeArray(photos).map(p => ({
              ...p,
              tagIds: safeArray(p.tagIds).filter(tid => String(tid) !== strId)
          }));
          setPhotos(refreshedPhotos);
          await saveData('product_photos', refreshedPhotos);
  
          // 2. Delete tag
          const success = await deleteTagFromDB(tagId);
          if (!success) throw new Error("无法在云端删除标签。");
  
          const newTags = safeArray(tags).filter(t => String(t.id) !== strId);
          setTags(newTags);
          await saveData('product_tags', newTags);
          
          toast.success('标签删除成功');
        } catch (err) {
          handleError(err, '彻底删除标签失败');
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
      const saved = await addCategoryToDB(trimmed);
      if (saved) {
        const nextCategories = [...categories, saved];
        setCategories(nextCategories);
        await saveData('product_categories', nextCategories);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, '添加分类失败');
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const nextCategories = safeArray(categories).map(c => String(c.id) === String(id) ? { ...c, ...updates } : c);
      setCategories(nextCategories);
      await saveData('product_categories', nextCategories);
      await updateCategoryInDB(id, updates);
    } catch (err) {
      handleError(err, '更新分类失败');
    }
  };

  const deleteCategory = async (id: string) => {
    const { success, error } = await deleteCategoryHook(id);
    if (!success) {
      handleError(error, '删除分类失败');
    } else {
      toast.success('分类已成功删除');
    }
  };

  const performDeleteCategory = async (strId: string) => {
      try {
        const success = await deleteCategoryFromDB(strId);
        if (!success) throw new Error("无法在云端删除分类。");

        const nextCategories = safeArray(categories).filter(c => String(c.id) !== strId);
        if (isMounted.current) {
            setCategories(nextCategories);
            await saveData('product_categories', nextCategories);
        }
        
        const nextPhotos = safeArray(photos).map(p => String(p.categoryId) === strId ? { ...p, categoryId: null } : p);
        if (isMounted.current) {
            setPhotos(nextPhotos);
            await saveData('product_photos', nextPhotos);
        }

        const sPhotos = safeArray(photos);
        const sNextPhotos = safeArray(nextPhotos);
        const affectedPhotos = sNextPhotos.filter((p, i) => String(sPhotos[i]?.categoryId) === strId);
        const sAffected = safeArray(affectedPhotos);
        if (sAffected.length > 0) {
            const { data: { user: userObj } } = await supabase.auth.getUser();
            if (userObj) await Promise.allSettled(sAffected.map(p => savePhotoToCloud(userObj.id, p)));
        }
      } catch (err) {
        handleError(err, '分类下架失败');
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
    } catch (err) {
      handleError(err, '添加厂商失败');
    }
  };

  const updateManufacturer = async (id: string | number, name: string) => {
    try {
      const strId = String(id);
      const trimmed = name.trim().toUpperCase();
      await updateManufacturerInDB(strId, trimmed);
      const newMfrs = safeArray(manufacturers).map(m => 
        String(m.id) === strId ? { ...m, name: trimmed } : m
      );
      setManufacturers(newMfrs);
      await saveData('product_manufacturers', newMfrs);
    } catch (err) {
      handleError(err, '更新厂商失败');
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
      toast.success('厂商删除成功');
    } catch (err) {
      handleError(err, '删除厂商失败');
    }
  };

  const performDeleteManufacturer = async (strId: string, id: string | number) => {
    try {
        const success = await deleteManufacturerFromDB(strId);
        if (!success) throw new Error("无法删除厂商");

        const newMfrs = safeArray(manufacturers).filter(m => String(m.id) !== strId);
        setManufacturers(newMfrs);
        await saveData('product_manufacturers', newMfrs);
        
        const nextPhotos = safeArray(photos).map(p => 
          String(p.manufacturerId) === strId ? { ...p, manufacturerId: null } : p
        );
        
        if (isMounted.current) {
          setPhotos(nextPhotos);
          await saveData('product_photos', nextPhotos);
        }

        const sPhotos = safeArray(photos);
        const sNextPhotos = safeArray(nextPhotos);
        const affectedPhotos = sNextPhotos.filter((p, i) => String(sPhotos[i]?.manufacturerId) === strId);
        const sAffected = safeArray(affectedPhotos);
        if (sAffected.length > 0) {
          const { data: { user: userObj } } = await supabase.auth.getUser();
          if (userObj) await Promise.allSettled(sAffected.map(p => savePhotoToCloud(userObj.id, p)));
        }
      } catch (err) {
          handleError(err, '物理删除厂商失败');
      }
  };


  const addTag = async (name: string) => {
    try {
      const saved = await addTagToDB(name);
      if(saved) {
        setTags(prev => safeArray(prev).concat(saved).sort((a,b) => a.name.localeCompare(b.name)));
        await saveData('product_tags', safeArray(tags).concat(saved).sort((a,b) => a.name.localeCompare(b.name)));
      }
      return saved;
    } catch(err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleError(error, '添加标签失败');
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
