import { Photo, Tag } from '../types';

export const sanitizePhotoTags = (photo: Photo, tags: Tag[]): Photo => {
  if (!photo.tagIds || !Array.isArray(photo.tagIds)) {
    return photo;
  }
  
  const validTagIds = photo.tagIds.filter(tid => tags.some(t => t.id === tid));
  
  if (validTagIds.length === photo.tagIds.length) {
    return photo;
  }
  
  return {
    ...photo,
    tagIds: validTagIds
  };
};
