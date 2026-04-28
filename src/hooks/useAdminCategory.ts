import { useState, useEffect } from 'react';
import { Category, Tag, SubCategory } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../constants';
import { loadData, saveData } from '../utils/indexedDB';
import { useGalleryContext } from '../context/GalleryContext';
import { updateTagInDB, deleteTagFromDB } from '../services/supabaseService';
import { supabase } from '../services/client';

export const useAdminCategory = () => {
  const {
    categories, setCategories,
    tags, setTags,
    manufacturers, setManufacturers
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

  const updateTag = (tagId: string, newName: string) => {
    setTags(prev => prev.map(t => t.id === tagId ? { ...t, name: newName } : t));
    updateTagInDB(tagId, newName).catch(err => console.error("Cloud tag update failed:", err));
  };

  const deleteTag = async (tagId: string, photos: any[], setPhotos: any, onRefresh?: () => void) => {
    try {
        // 1. Cloud deletion (Service now handles join table photo_tags)
        const success = await deleteTagFromDB(tagId);
        if (!success) throw new Error("Cloud delete returned false");

        // 2. Update local tags state
        setTags(prev => prev.filter(t => t.id !== tagId));

        // 3. Update local photos state to remove the tag association immediately (UI snappy)
        if (typeof setPhotos === 'function') {
          setPhotos((prev: any[]) => {
            const next = prev.map(p => {
              const pTagIds = Array.isArray(p.tagIds) ? p.tagIds : [];
              if (pTagIds.includes(tagId)) {
                return {
                  ...p,
                  tagIds: pTagIds.filter((id: any) => id !== tagId)
                };
              }
              return p;
            });
            saveData('product_photos', next);
            return next;
          });
        }
        
        // 4. Trigger total refresh if provided (to re-sync with cloud truth)
        if (onRefresh) {
          onRefresh();
        }
    } catch (err: any) {
        console.error("Cloud tag deletion failed:", err);
        alert("刪除標籤失敗，請檢查網路連線。");
    }
  };

  return {
    categories, setCategories,
    tags, setTags,
    updateTag,
    deleteTag,
    manufacturers, setManufacturers,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  };
};
