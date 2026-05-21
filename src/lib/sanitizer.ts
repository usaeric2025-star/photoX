import { Photo, Tag } from '../types';

export const sanitizePhotoTags = (photo: Photo, tags: Tag[]): Photo => {
  const photoTagIds = Array.isArray(photo.tag_ids) ? photo.tag_ids : [];
  const rawTags = (photo as any).tags || [];
  
  const namesAndIds = new Set([...photoTagIds, ...rawTags]);
  const validTagIds: string[] = [];
  
  namesAndIds.forEach(val => {
    if (!val) return;
    const strVal = String(val);
    if (tags.some(t => String(t.id) === strVal)) {
      validTagIds.push(strVal);
    } else {
      const matchedByName = tags.find(t => (t.name || '').toLowerCase() === strVal.toLowerCase());
      if (matchedByName) {
        validTagIds.push(String(matchedByName.id));
      } else {
        // If it neither matches an ID nor a name, we might lose it, but it shouldn't happen usually
        validTagIds.push(strVal); 
      }
    }
  });

  return {
    ...photo,
    tag_ids: Array.from(new Set(validTagIds)),
  };
};
