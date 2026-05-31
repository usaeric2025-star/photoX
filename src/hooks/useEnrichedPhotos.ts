import { useMemo } from 'react';
import { Photo, Category } from '@/types';
import { useStaticData } from './useStaticData';
import { useGalleryStore } from '@/store/galleryStore';

/**
 * A hook that enriches raw database photo records with localized category,
 * tag, and manufacturer names based on static configuration data.
 * Ensures consistent presentation across Public and Admin galleries.
 */
export function useEnrichedPhotos(photos: Photo[]): Photo[] {
  const { categoryMap, tagMap, manufacturerMap } = useStaticData();
  const appLang = useGalleryStore(s => s.appLang);

  return useMemo(() => {
    if (!photos || photos.length === 0) return photos;
    return photos.map(photo => {
      const categoryId = photo.category_id ? String(photo.category_id) : '';
      const manufacturerId = photo.manufacturer_id ? String(photo.manufacturer_id) : '';
      const tagIds = Array.isArray(photo.tag_ids) ? photo.tag_ids : [];

      const category = categoryMap.get(categoryId);
      
      return {
        ...photo,
        categoryName: category ? (category[appLang as keyof Category] as string || category.name) : '',
        tagNames: tagIds
          .map(id => tagMap.get(String(id))?.name ?? '')
          .filter(Boolean),
        manufacturerName: manufacturerMap.get(manufacturerId)?.name ?? '',
      };
    });
  }, [photos, categoryMap, tagMap, manufacturerMap, appLang]);
}
