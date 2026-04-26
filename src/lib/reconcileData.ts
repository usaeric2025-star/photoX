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

  // 2. Filter authoritative lists to only contain used items
  const reconciledCategories = categories.filter(c => usedCatIds.has(c.id));
  const reconciledTags = tags.filter(t => usedTagIds.has(t.id));
  const reconciledManufacturers = manufacturers.filter(m => usedManufacturerIds.has(m.id));

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
