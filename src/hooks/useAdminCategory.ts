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

  // Persist categories/tags/manufacturers locally
  useEffect(() => {
    const persist = async () => {
      await saveData('product_categories', categories);
      await saveData('product_tags', tags);
      await saveData('product_manufacturers', manufacturers);
    };
    persist();
  }, [categories, tags, manufacturers]);

  return {
    categories, setCategories,
    tags, setTags,
    manufacturers, setManufacturers,
    dbCategories, setDbCategories,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  };
};
