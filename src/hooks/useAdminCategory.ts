import { useState, useEffect } from 'react';
import { Category, Tag, SubCategory, Photo } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../constants';
import { loadData, saveData } from '../utils/indexedDB';
import { useGalleryContext } from '../context/GalleryContext';
import { 
  updateTagInDB, 
  deleteTagFromDB, 
  updateCategoryInDB, 
  deleteCategoryFromDB, 
  addCategoryToDB,
  addManufacturerToDB,
  updateManufacturerInDB,
  deleteManufacturerFromDB,
  savePhotoToCloud,
  supabase
} from '../services/supabaseService';

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
    console.log(`[useAdminCategory] Starting deletion for tag: ${id}`);

    try {
        const strId = String(id);
        const finalId = !isNaN(Number(id)) ? Number(id) : id;
        
        // 1. Delete from Cloud Database first
        const success = await deleteTagFromDB(finalId);
        if (!success) {
          console.error(`[useAdminCategory] Cloud delete failed (row count 0) for tag: ${id}. This likely means RLS (permissions) blocked the deletion or the tag was not found.`);
          throw new Error("無法在雲端刪除標籤。請確認您有足夠的權限，或該標籤已被刪除。\nUnable to delete tag from cloud. Permission denied or tag not found.");
        }
        console.log(`[useAdminCategory] Cloud delete success for tag: ${id}`);

        // 2. Calculate affected photos BEFORE updating state
        const affectedPhotos: Photo[] = photos.filter(p => 
          Array.isArray(p.tagIds) && p.tagIds.map(String).includes(strId)
        );
        
        // 3. Update local tags state
        const newTags = Array.isArray(tags)
          ? tags.filter(t => String(t.id) !== strId)
          : [];
        setTags(newTags);
        await saveData('product_tags', newTags);

        // 4. Update photos in memory and IndexedDB
        if (affectedPhotos.length > 0) {
          console.log(`[useAdminCategory] Cleaning up tag #${id} from ${affectedPhotos.length} photos...`);
          const nextPhotos = photos.map(p => {
            if (Array.isArray(p.tagIds) && p.tagIds.map(String).includes(strId)) {
              return {
                ...p,
                tagIds: p.tagIds.filter((tid: any) => String(tid) !== strId)
              };
            }
            return p;
          });
          
          setPhotos(nextPhotos);
          await saveData('product_photos', nextPhotos);

          // 5. Sync affected photos to cloud
          const { data: { user: userObj } } = await supabase.auth.getUser();
          if (userObj) {
            console.log(`[useAdminCategory] Syncing affected photos to cloud...`);
            const updatedList = nextPhotos.filter(p => affectedPhotos.some(ap => ap.id === p.id));
            await Promise.allSettled(
              updatedList.map(p => savePhotoToCloud(userObj.id, p))
            );
          }
        }
        
        console.log(`[useAdminCategory] Tag #${id} deletion complete.`);
    } catch (err: any) {
        console.error("[useAdminCategory] Tag deletion failed:", err);
        setAlertDialog({ title: '删除失败 / Delete Failed', message: err.message || '网络错误或数据库异常' });
        throw err;
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
      // Log suppressed
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const nextCategories = categories.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c);
      setCategories(nextCategories);
      await saveData('product_categories', nextCategories);
      await updateCategoryInDB(id, updates);
    } catch (err) {
      // Log suppressed
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
       // Log suppressed
     }
  };

  const addManufacturer = async (name: string) => {
    try {
      const saved = await addManufacturerToDB(name);
      const newMfrs = [...manufacturers, saved];
      setManufacturers(newMfrs);
      await saveData('product_manufacturers', newMfrs);
      return saved;
    } catch (err) {
      // Log suppressed
    }
  };

  const updateManufacturer = async (id: string, name: string) => {
    try {
      const trimmed = name.trim();
      await updateManufacturerInDB(id, trimmed);
      const newMfrs = manufacturers.map(m => 
        String(m.id) === String(id) ? { ...m, name: trimmed } : m
      );
      setManufacturers(newMfrs);
      await saveData('product_manufacturers', newMfrs);
    } catch (err) {
      // Log suppressed
    }
  };

  const deleteManufacturer = async (id: string) => {
    try {
      const strId = String(id);
      await deleteManufacturerFromDB(strId);
      const newMfrs = manufacturers.filter(m => String(m.id) !== strId);
      setManufacturers(newMfrs);
      await saveData('product_manufacturers', newMfrs);
      
      // Update photos in memory
      setPhotos((prev: any[]) => prev.map(p => 
        String(p.manufacturerId) === strId ? { ...p, manufacturerId: null } : p
      ));
    } catch (err) {
      // Log suppressed
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
    addManufacturer,
    updateManufacturer,
    deleteManufacturer,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  };
};
