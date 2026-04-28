
import { Tag } from '../types';
import { batchCreateTags } from '../services/supabaseService';

export const resolveTagIdsBatch = async (
  tagNamesOrIds: string[],
  tags: Tag[],
  tagNameToIdMap: Map<string, string>,
  setTags: (updater: (prev: Tag[]) => Tag[]) => void
): Promise<string[]> => {
  // 1. Identify which strings are names and which are likely IDs
  // (Assuming non-existent in Map/tags means it's a name)
  const namesToCreate = Array.from(new Set(
    tagNamesOrIds.filter(tid => !tagNameToIdMap.has(tid) && !tags.some(t => t.id === tid))
  ));

  let newTagsMap = new Map<string, string>();
  if (namesToCreate.length > 0) {
    newTagsMap = await batchCreateTags(namesToCreate);
    // Update local tags state
    setTags(prev => [
      ...prev,
      ...Array.from(newTagsMap.entries()).map(([name, id]) => ({ id, name, aliases: [] }))
    ]);
  }

  // 2. Map everything to IDs
  return tagNamesOrIds.map(tid => {
    if (tagNameToIdMap.has(tid)) return tagNameToIdMap.get(tid)!;
    if (newTagsMap.has(tid)) return newTagsMap.get(tid)!;
    // Fallback: it might already be an ID
    return tid;
  });
};
