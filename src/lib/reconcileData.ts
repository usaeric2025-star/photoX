import { Photo, Tag, DB_Category, Manufacturer } from '../types';

export const reconcileData = (
  photos: Photo[], 
  categories: DB_Category[], 
  tags: Tag[], 
  manufacturers: Manufacturer[]
) => {
  // 1. Map all used IDs
  const usedCatIds = new Set(photos.map(p => p.catId).filter(Boolean));
  const usedManufacturerIds = new Set(photos.map(p => p.manufacturerId).filter(Boolean));
  const usedTagIds = new Set<string>();
  photos.forEach(p => {
    if (Array.isArray(p.tagIds)) p.tagIds.forEach(id => usedTagIds.add(id));
  });

  // 2. Add missing tags to the list
  const reconciledTags = [...tags];
  usedTagIds.forEach(tid => {
    if (!reconciledTags.find(t => t.id === tid)) {
      reconciledTags.push({ id: tid, name: tid }); // Assuming tag name = id if missing
    }
  });

  return {
    reconciledCategories: categories,
    reconciledTags,
    reconciledManufacturers: manufacturers,
    hasChanged: 
      reconciledTags.length !== tags.length // simplified because we only add now
  };
};
