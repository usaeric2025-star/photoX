import { Photo, Tag, Category, Manufacturer } from '../types';

export const reconcileData = (
  photos: Photo[], 
  categories: Category[], 
  tags: Tag[], 
  manufacturers: Manufacturer[]
) => {
  // 1. Map all used IDs
  const usedCatIds = new Set(photos.map(p => p.categoryId).filter(Boolean));
  const usedManufacturerIds = new Set(photos.map(p => p.subcategoryId).filter(Boolean));
  const usedTagIds = new Set<string>();
  photos.forEach(p => {
    if (Array.isArray(p.tagIds)) p.tagIds.forEach(id => usedTagIds.add(id));
  });

  // 2. Add missing items to the lists
  const reconciledCategories = [...categories];
  usedCatIds.forEach(id => {
    if (id && !reconciledCategories.find(c => c.id === id)) {
      reconciledCategories.push({ id, name: id, aliases: [], subcategories: [] } as Category);                
    }
  });

  const reconciledTags = [...tags];
  usedTagIds.forEach(tid => {
    if (!reconciledTags.find(t => t.id === tid)) {
      reconciledTags.push({ id: tid, name: tid, aliases: [] } as Tag); 
    }
  });

  const reconciledManufacturers = [...manufacturers];
  usedManufacturerIds.forEach(id => {
    if (id && !reconciledManufacturers.find(m => m.id === id)) {
      reconciledManufacturers.push({ id, name: id, aliases: [] } as Manufacturer); 
    }
  });

  return {
    reconciledCategories,
    reconciledTags,
    reconciledManufacturers,
    hasChanged: 
      reconciledCategories.length !== categories.length ||
      reconciledTags.length !== tags.length ||
      reconciledManufacturers.length !== manufacturers.length
  };
};
