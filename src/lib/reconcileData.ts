import { Photo, Tag, Category, Manufacturer } from '../types';

export const reconcileData = (
  photos: Photo[], 
  categories: Category[], 
  tags: Tag[], 
  manufacturers: Manufacturer[]
) => {
  const catIds = new Set(categories.map(c => String(c.id)));
  const tagIds = new Set(tags.map(t => String(t.id)));
  const mfrIds = new Set(manufacturers.map(m => String(m.id)));

  let hasChanged = false;

  const cleanedPhotos = photos.map(p => {
    let photoChanged = false;
    const updates: Partial<Photo> = {};

    // Check category
    if (p.categoryId && !catIds.has(String(p.categoryId))) {
      updates.categoryId = null;
      photoChanged = true;
    }

    // Check manufacturer
    if (p.manufacturerId && !mfrIds.has(String(p.manufacturerId))) {
      updates.manufacturerId = null;
      photoChanged = true;
    }

    // Check tags
    if (Array.isArray(p.tagIds)) {
      const validTags = p.tagIds.filter(id => tagIds.has(String(id)));
      if (validTags.length !== p.tagIds.length) {
        updates.tagIds = validTags;
        photoChanged = true;
      }
    }

    if (photoChanged) {
      hasChanged = true;
      return { ...p, ...updates };
    }
    return p;
  });

  return {
    reconciledPhotos: cleanedPhotos,
    reconciledCategories: categories,
    reconciledTags: tags,
    reconciledManufacturers: manufacturers,
    hasChanged
  };
};
