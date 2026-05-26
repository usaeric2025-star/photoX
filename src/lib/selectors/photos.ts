import { Photo } from '@/types';

/**
 * @remarks
 * Normalizes photo pages by removing duplicates and filtering out items without valid IDs.
 */
export const flattenPhotoInfiniteQueryPages = (pages: { photos: Photo[] }[]): Photo[] => {
  const seenIds = new Set<string>();
  
  return pages.flatMap(page => page.photos).filter(photo => {
    if (!photo.id) {
      console.warn('Attempted to normalize photo with missing ID', photo);
      return false;
    }
    if (seenIds.has(photo.id)) {
      return false;
    }
    seenIds.add(photo.id);
    return true;
  });
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
