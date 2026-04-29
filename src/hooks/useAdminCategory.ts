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

  const deleteTag = async (tagId: string | number) => {
    if (!tagId) return;

    try {
        // Ensure we pass a number if it is numeric, satisfying the requirement to pass 67 instead of "67"
        const finalId = !isNaN(Number(tagId)) ? Number(tagId) : tagId;
        
        console.log('[deleteTag] 开始删除標籤', { 
            tagId: finalId, 
            type: typeof finalId,
            photosLength: photos?.length 
        });
        
        // 1. Cloud deletion (Confirmed: using tagId, not tag.name)
        const success = await deleteTagFromDB(finalId);
        if (!success) {
          throw new Error("Cloud delete returned false");
        }

        const strTagId = String(finalId);
        // 2. Update local tags state
        const nextTags = tags.filter(t => String(t.id) !== strTagId);
        setTags(nextTags);
        
        // 2.1 Update IndexedDB cache
        await saveData('product_tags', nextTags);

        // 3. Update local photos state
        const nextPhotos = photos.map(p => {
          const pTagIds = Array.isArray(p.tagIds) ? p.tagIds : [];
          const strPTagIds = pTagIds.map(id => String(id));

          if (strPTagIds.includes(strTagId)) {
            return {
              ...p,
              tagIds: strPTagIds.filter((id: string) => id !== strTagId)
            };
          }
          return p;
        });
        
        setPhotos(nextPhotos);
        await saveData('product_photos', nextPhotos);

        console.log('[deleteTag] 標籤删除成功');
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
