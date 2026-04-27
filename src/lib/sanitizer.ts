import { Photo, Tag } from '../types';

export const sanitizePhotoTags = (photo: Photo, tags: Tag[]): Photo => {
  const photoTagIds = Array.isArray(photo.tagIds) ? photo.tagIds : [];
  const rawTags = (photo as any).tags || [];
  
  const namesAndIds = new Set([...photoTagIds, ...rawTags]);
  const validTagIds: string[] = [];
  
  namesAndIds.forEach(val => {
    if (!val) return;
    if (tags.some(t => t.id === val)) {
      validTagIds.push(val);
    } else {
      const matchedByName = tags.find(t => t.name.toLowerCase() === val.toLowerCase());
      if (matchedByName) {
        validTagIds.push(matchedByName.id);
      } else {
        // If it neither matches an ID nor a name, we might lose it, but it shouldn't happen usually
        // Actually, let's keep it just in case it's a new tag not yet synced to client
        validTagIds.push(val); 
      }
    }
  });

  return {
    ...photo,
    tagIds: Array.from(new Set(validTagIds)),
  };
};
