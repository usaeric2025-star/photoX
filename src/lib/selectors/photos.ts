import { Photo } from '@/types';

/**
 * @remarks
 * Normalizes photo pages by removing duplicates and filtering out items without valid IDs.
 */
export const flattenPhotoInfiniteQueryPages = (pages: { photos: Photo[] }[]): Photo[] => {
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
        member_count: Math.max(existing.member_count ?? 0, photo.member_count ?? 0)
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
