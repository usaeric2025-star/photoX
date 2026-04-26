
import { Photo, Tag } from '../types';
import { supabase } from '../services/supabaseService';

export const reconcileTags = async (photos: Photo[], currentTags: Tag[]): Promise<{updatedTags: Tag[], addedIds: string[], removedIds: string[]}> => {
  // 1. Collect all tags actually used in photos
  const usedTagIds = new Set<string>();
  photos.forEach(p => {
    const pTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
    pTagIds.forEach(id => usedTagIds.add(id));
  });

  // 2. Add missing tags to the list
  const newTags = [...currentTags];
  const addedIds: string[] = [];
  usedTagIds.forEach(tid => {
    if (!newTags.find(t => t.id === tid)) {
      newTags.push({ id: tid, name: tid }); // Assuming tag name = id if missing
      addedIds.push(tid);
    }
  });

  // 3. Remove unused tags (tags in list but not in any photo)
  const finalTags = newTags.filter(t => usedTagIds.has(t.id));
  const removedIds = newTags.filter(t => !usedTagIds.has(t.id)).map(t => t.id);

  return { updatedTags: finalTags, addedIds, removedIds };
};
