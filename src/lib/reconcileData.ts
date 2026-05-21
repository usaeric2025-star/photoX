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
    if (p.category_id && !catIds.has(String(p.category_id))) {
      updates.category_id = null;
      photoChanged = true;
    }

    // Check manufacturer
    if (p.manufacturer_id && !mfrIds.has(String(p.manufacturer_id))) {
      updates.manufacturer_id = null;
      photoChanged = true;
    }

    // Check tags
    if (Array.isArray(p.tag_ids)) {
      const validTags = p.tag_ids.filter(id => tagIds.has(String(id)));
      if (validTags.length !== p.tag_ids.length) {
        updates.tag_ids = validTags;
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
