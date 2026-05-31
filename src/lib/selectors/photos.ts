import { Photo } from '@/types';

/**
 * @remarks
 * Normalizes photo pages by removing duplicates and filtering out items without valid IDs.
 */
export const flattenPhotoInfiniteQueryPages = (pages: { photos: Photo[] }[]): Photo[] => {
  if (import.meta.env.DEV) {
    const ids = pages.flatMap(p => p.photos.map(photo => photo.id));
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.error('[PHOTOX-ASSERT] Duplicate photo IDs detected in normalized data:', ids.filter((id, i) => ids.indexOf(id) !== i));
    }
    // 必填字段完整性校驗
    for (const photo of pages.flatMap(p => p.photos)) {
      if (!photo.id || !photo.image_url) {
        console.error('[PHOTOX-ASSERT] Incomplete photo object in normalized data:', photo);
      }
    }
  }

  const photoMap = new Map<string, Photo>();
  
  pages.flatMap(page => page.photos).forEach(photo => {
    if (!photo.id) {
      console.warn('Attempted to normalize photo with missing ID', photo);
      return;
    }
    
    const existing = photoMap.get(photo.id);
    if (!existing) {
      photoMap.set(photo.id, photo);
    } else {
      // Aggregate counts if needed - just take the maximum for now or sum? Let's take the max as per established logic
      const updatedPhoto = {
        ...existing,
        ...photo, // Preserve all other fields
        group: existing.group || photo.group ? {
          ...(existing.group || photo.group)!,
          member_count: Math.max(existing.group?.member_count ?? 0, photo.group?.member_count ?? 0)
        } : null
      };
      photoMap.set(photo.id, updatedPhoto);
    }
  });
  
  return Array.from(photoMap.values());
};

/**
 * @remarks
 * 專為管理頁扁平數組設計，嚴禁與分頁歸一化混用
 */
export const normalizeAdminPhotos = (photos: Photo[]): Photo[] => {
  const photoMap = new Map<string, Photo>();
  
  photos.forEach(photo => {
    if (!photo.id) {
      console.warn('Attempted to normalize admin photo with missing ID', photo);
      return;
    }
    
    const existing = photoMap.get(photo.id);
    if (!existing) {
      photoMap.set(photo.id, photo);
    } else {
      // Aggregate counts or take max for consistency with shared logic
      const updatedPhoto = {
        ...existing,
        ...photo, // Preserve all other fields
        group: existing.group || photo.group ? {
          ...(existing.group || photo.group)!,
          member_count: Math.max(existing.group?.member_count ?? 0, photo.group?.member_count ?? 0)
        } : null
      };
      photoMap.set(photo.id, updatedPhoto);
    }
  });
  
  return Array.from(photoMap.values());
};

export const filterPhotosByGroup = (photos: Photo[], groupId: string): Photo[] => {
  return photos.filter(p => p.group_id === groupId);
};

export const sortPhotosByDate = (photos: Photo[], order: 'asc' | 'desc' = 'desc'): Photo[] => {
  return [...photos].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
};
