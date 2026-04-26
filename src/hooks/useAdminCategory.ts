import { useState, useEffect } from 'react';
import { Category, Tag, SubCategory } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../constants';
import { loadData, saveData } from '../utils/indexedDB';
import { useGalleryContext } from '../context/GalleryContext';

export const useAdminCategory = () => {
  const {
    categories, setCategories,
    tags, setTags,
    manufacturers, setManufacturers,
    dbCategories, setDbCategories
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

      const storedDbCats = await loadData('db_categories');
      if (storedDbCats && storedDbCats.length > 0) setDbCategories(storedDbCats);

      const storedTags = await loadData('product_tags');
      if (storedTags && storedTags.length > 0) setTags(storedTags);
      else if (tags.length === 0) setTags(DEFAULT_TAGS);

      const storedMfrs = await loadData('product_manufacturers');
      if (storedMfrs) setManufacturers(storedMfrs);
      
      setIsLoaded(true);
    };
    loadInit();
  }, [setCategories, setDbCategories, setTags, setManufacturers]); // Add setters if needed, but they are constant from useGalleryContext memo

  // Persist categories/tags/manufacturers locally
  useEffect(() => {
    if (!isLoaded) return;
    const persist = async () => {
      await saveData('product_categories', categories);
      await saveData('db_categories', dbCategories);
      await saveData('product_tags', tags);
      await saveData('product_manufacturers', manufacturers);
    };
    persist();
  }, [categories, tags, manufacturers, dbCategories, isLoaded]);

  const updateTag = (tagId: string, newName: string) => {
    setTags(prev => prev.map(t => t.id === tagId ? { ...t, name: newName } : t));
  };

  const deleteTag = (tagId: string, photos: any[], setPhotos: any) => {
    setTags(prev => prev.filter(t => t.id !== tagId));
    setPhotos((prev: any[]) => prev.map(p => ({
      ...p,
      tagIds: p.tagIds ? p.tagIds.filter((id: string) => id !== tagId) : []
    })));
  };

  return {
    categories, setCategories,
    tags, setTags,
    updateTag,
    deleteTag,
    manufacturers, setManufacturers,
    dbCategories, setDbCategories,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  };
};
