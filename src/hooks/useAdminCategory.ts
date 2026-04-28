import { useState, useEffect } from 'react';
import { Category, Tag, SubCategory } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../constants';
import { loadData, saveData } from '../utils/indexedDB';
import { useGalleryContext } from '../context/GalleryContext';
import { updateTagInDB, deleteTagFromDB } from '../services/supabaseService';

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

  const deleteTag = async (tagId: string, photos: any[], setPhotos: any) => {
    try {
        setTags(prev => prev.filter(t => t.id !== tagId));
        setPhotos((prev: any[]) => prev.map(p => ({
          ...p,
          tagIds: p.tagIds ? p.tagIds.filter((id: string) => id !== tagId) : []
        })));
        const success = await deleteTagFromDB(tagId);
        if (!success) throw new Error("Cloud delete returned false");
    } catch (err: any) {
        console.error("Cloud tag deletion failed:", err);
        // Important: Re-fetch or at least alert the user if deletion failed to maintain sync.
        // For now, alerting user that data might be out of sync
        alert("删除标签失败，请检查网络或联系管理员。");
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
