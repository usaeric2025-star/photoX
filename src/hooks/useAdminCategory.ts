import { useState, useEffect } from 'react';
import { Category, Tag, SubCategory } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../constants';
import { loadData, saveData } from '../utils/indexedDB';
import { useGalleryContext } from '../context/GalleryContext';
import { updateTagInDB, deleteTagFromDB, updateCategoryInDB, deleteCategoryFromDB, addCategoryToDB } from '../services/supabaseService';

export const useAdminCategory = (adminUI: any) => {
  const { setAlertDialog = () => {} } = adminUI || {};

  const {
    categories, setCategories,
    tags, setTags,
    manufacturers, setManufacturers,
    photos, setPhotos
  } = useGalleryContext();

  const [publicCategories, setPublicCategories] = useState<Category[]>([]);
  const [publicTags, setPublicTags] = useState<Tag[]>([]);
  const [publicManufacturers, setPublicManufacturers] = useState<SubCategory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
      const storedCats = await loadData('product_categories');
      if (storedCats && storedCats.length > 0) setCategories(storedCats);
      else if (categories.length === 0) setCategories(DEFAULT_CATEGORIES);

      const storedTags = await loadData('product_tags');
      if (storedTags && storedTags.length > 0) setTags(storedTags);
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
      
      const nextTags = tags.map(t => String(t.id) === String(tagId) ? { ...t, name: upName } : t);
      setTags(nextTags);
      await saveData('product_tags', nextTags);
      
      const success = await updateTagInDB(tagId, upName);
      if (!success) {
        throw new Error("Cloud update failed");
      }
    } catch (err: any) {
      console.error("Cloud tag update failed:", err);
      // Revert local state if cloud failed
      const storedTags = await loadData('product_tags');
      if (storedTags) setTags(storedTags);
      setAlertDialog({ title: '更新失敗', message: '無法同步更新到雲端。' });
    }
  };

  const deleteTag = async (id: string | number) => {
    if (!id) return;

    try {
        const finalId = !isNaN(Number(id)) ? Number(id) : id;
        
        // 1. 删数据库 (Cascade handles photo_tags)
        const success = await deleteTagFromDB(finalId);
        if (!success) throw new Error("Cloud delete returned false");

        // 2. 更新本地标签列表
        const newTags = tags.filter(t => String(t.id) !== String(id));
        setTags(newTags);
        
        // 3. 强制覆盖 IndexedDB（不合并）
        await saveData('product_tags', newTags);

        // 4. 更新内存里的照片 tagIds（只改内存，不同步云端）
        setPhotos((prev: any[]) => prev.map(p => ({
          ...p,
          tagIds: (p.tagIds || []).filter(
            (tid: any) => String(tid) !== String(id)
          )
        })));

    } catch (err: any) {
        console.error("[deleteTag] 删除失败:", err);
        setAlertDialog({ title: '刪除失敗', message: "刪除標籤失敗，請檢查網路連線。" });
    }
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
      console.error("Add category failed:", err);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const nextCategories = categories.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c);
      setCategories(nextCategories);
      await saveData('product_categories', nextCategories);
      await updateCategoryInDB(id, updates);
    } catch (err) {
      console.error("Update category failed:", err);
    }
  };

  const deleteCategory = async (id: string) => {
     try {
       const strId = String(id);
       const success = await deleteCategoryFromDB(strId);
       if (!success) throw new Error("Cloud delete failed");

       const nextCategories = categories.filter(c => String(c.id) !== strId);
       setCategories(nextCategories);
       await saveData('product_categories', nextCategories);
       
       // Update photos
       const nextPhotos = photos.map(p => String(p.categoryId) === strId ? { ...p, categoryId: null } : p);
       setPhotos(nextPhotos);
       await saveData('product_photos', nextPhotos);
     } catch (err) {
       console.error("Delete category failed:", err);
       setAlertDialog({ title: '刪除失敗', message: '無法刪除分類。' });
     }
  };

  const updateManufacturer = async (id: string, name: string) => {
    try {
      const trimmed = name.trim();
      setManufacturers(prev => prev.map(m => String(m.id) === String(id) ? { ...m, name: trimmed, aliases: [trimmed] } : m));
    } catch (err) {
      console.error("Update manufacturer failed:", err);
    }
  };

  const deleteManufacturer = async (id: string) => {
    try {
      const strId = String(id);
      const nextManufacturers = manufacturers.filter(m => String(m.id) !== strId);
      setManufacturers(nextManufacturers);
      await saveData('product_manufacturers', nextManufacturers);
      
      // Also remove from category subcategories if embedded
      const nextCategories = categories.map(c => ({
        ...c,
        subcategories: (c.subcategories || []).filter(sub => String(sub.id) !== strId)
      }));
      setCategories(nextCategories);
      await saveData('product_categories', nextCategories);

      // Update photos
      const nextPhotos = photos.map(p => String(p.subcategoryId) === strId ? { ...p, subcategoryId: null } : p);
      setPhotos(nextPhotos);
      await saveData('product_photos', nextPhotos);
    } catch (err) {
      console.error("Delete manufacturer failed:", err);
    }
  };

  return {
    categories, setCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    tags, setTags,
    updateTag,
    deleteTag,
    manufacturers, setManufacturers,
    updateManufacturer,
    deleteManufacturer,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  };
};
