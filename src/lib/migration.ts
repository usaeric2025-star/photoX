
import { Photo, Category, Tag, SubCategory } from '../types';

export const migratePhotos = (
  photos: Photo[], 
  categories: Category[], 
  tags: Tag[], 
  manufacturers: SubCategory[]
): { updatedPhotos: Photo[], count: number } => {
  let count = 0;
  const updatedPhotos = photos.map((p: any) => {
    // Check if migration is needed (if it has legacy fields AND doesn't have new ones fully set yet)
    const hasLegacyData = p.category || p.sub_category || (p.tags && p.tags.length > 0);
    if (!hasLegacyData) return p;

    const newPhoto = { ...p };

    // Migrate Category
    if (p.category && !newPhoto.categoryId) {
      const cat = categories.find(c => c.name === p.category);
      if (cat) {
        newPhoto.categoryId = cat.id;
      }
    }

    // Migrate Tags
    if (p.tags && p.tags.length > 0 && (!newPhoto.tagIds || newPhoto.tagIds.length === 0)) {
      const tagIds = p.tags
        .map((tagName: string) => tags.find(t => t.name === tagName)?.id)
        .filter(Boolean);
      if (tagIds.length > 0) {
        newPhoto.tagIds = tagIds;
      }
    }

    // Migrate Manufacturer/Subcategory
    if (p.sub_category && !newPhoto.subcategoryId) {
      const mfr = manufacturers.find(m => m.name === p.sub_category);
      if (mfr) {
        newPhoto.subcategoryId = mfr.id;
      }
    }

    // Clean legacy fields
    delete newPhoto.category;
    delete newPhoto.sub_category;
    delete newPhoto.tags;

    count++;
    return newPhoto;
  });

  return { updatedPhotos, count: count > 0 ? count : 0 };
};
