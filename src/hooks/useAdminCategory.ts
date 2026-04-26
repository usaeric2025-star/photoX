import { useState, useEffect } from 'react';
import { Category, Tag, SubCategory } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_TAGS } from '../constants';
import { loadData, saveData } from '../utils/indexedDB';

export const useAdminCategory = () => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [manufacturers, setManufacturers] = useState<SubCategory[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]); // DB Category
  const [publicCategories, setPublicCategories] = useState<Category[]>([]);
  const [publicTags, setPublicTags] = useState<Tag[]>([]);
  const [publicManufacturers, setPublicManufacturers] = useState<SubCategory[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
      const storedCats = await loadData('product_categories');
      if (storedCats && storedCats.length > 0) setCategories(storedCats);
      const storedDbCats = await loadData('db_categories');
      if (storedDbCats && storedDbCats.length > 0) setDbCategories(storedDbCats);
      const storedTags = await loadData('product_tags');
      if (storedTags && storedTags.length > 0) setTags(storedTags);
      const storedMfrs = await loadData('product_manufacturers');
      if (storedMfrs) setManufacturers(storedMfrs);
      setIsLoaded(true);
    };
    loadInit();
  }, []);

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

  return {
    categories, setCategories,
    tags, setTags,
    updateTag,
    manufacturers, setManufacturers,
    dbCategories, setDbCategories,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  };
};
