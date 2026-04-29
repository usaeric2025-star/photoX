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
      
      setTags(prev => prev.map(t => String(t.id) === String(tagId) ? { ...t, name: upName } : t));
      
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

  const deleteTag = async (tagId: string) => {
    if (!tagId) return;

    try {
        const strTagId = String(tagId);
        console.log('[deleteTag] 开始删除標籤', { tagId: strTagId, photosLength: photos?.length });
        
        // 1. Cloud deletion
        const success = await deleteTagFromDB(strTagId);
        if (!success) {
          throw new Error("Cloud delete returned false");
        }

        // 2. Update local tags state
        if (typeof setTags === 'function') {
          setTags(prev => {
            const nextTags = prev.filter(t => String(t.id) !== strTagId);
            saveData('product_tags', nextTags);
            return nextTags;
          });
        }

        // 3. Update local photos state to remove the tag association immediately
        setPhotos((prev: any[]) => {
          if (!Array.isArray(prev)) {
             return prev;
          }
          const next = prev.map(p => {
            const pTagIds = (Array.isArray(p.tagIds) || typeof p.tagIds === 'object') ? (Array.isArray(p.tagIds) ? p.tagIds : []) : [];
            const strPTagIds = pTagIds.map(id => String(id));

            if (strPTagIds.includes(strTagId)) {
              return {
                ...p,
                tagIds: strPTagIds.filter((id: string) => id !== strTagId)
              };
            }
            return p;
          });
          saveData('product_photos', next);
          return next;
        });

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
        setCategories(prev => [...prev, saved]);
      }
    } catch (err) {
      console.error("Add category failed:", err);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      setCategories(prev => prev.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c));
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

       setCategories(prev => prev.filter(c => String(c.id) !== strId));
       
       // Update photos
       setPhotos((prev: any[]) => {
         const next = prev.map(p => String(p.categoryId) === strId ? { ...p, categoryId: null } : p);
         saveData('product_photos', next);
         return next;
       });
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
      setManufacturers(prev => prev.filter(m => String(m.id) !== strId));
      
      // Also remove from category subcategories if embedded
      setCategories(prev => prev.map(c => ({
        ...c,
        subcategories: (c.subcategories || []).filter(sub => String(sub.id) !== strId)
      })));

      // Update photos
      setPhotos((prev: any[]) => {
        const next = prev.map(p => String(p.subcategoryId) === strId ? { ...p, subcategoryId: null } : p);
        saveData('product_photos', next);
        return next;
      });
    } catch (err) {
      console.error("Delete manufacturer failed:", err);
    }
  };

  return {
    categories, setCategories,
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
