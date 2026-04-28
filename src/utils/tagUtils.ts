
import { Tag } from '../types';
import { batchCreateTags } from '../services/supabaseService';

export const resolveTagIdsBatch = async (
  tagNamesOrIds: string[],
  tags: Tag[],
  tagNameToIdMap: Map<string, string>,
  setTags: (updater: (prev: Tag[]) => Tag[]) => void
): Promise<string[]> => {
  // Helper for fuzzy matching: lowercase and remove non-alphas
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const findFuzzyMatch = (name: string): string | null => {
    const normName = normalize(name);
    if (!normName) return null;

    // 1. Direct case-insensitive match (already handled by tagNameToIdMap mostly, but for completeness)
    for (const t of tags) {
      const normExisting = normalize(t.name);
      if (normName === normExisting) return String(t.id);
      
      // 2. Semantic overlap: e.g. "Marble" matches "Marblelook" or vice-versa
      // Only match if the words are deeply related (length diff < 5)
      const isSimilar = (normName.startsWith(normExisting) || normExisting.startsWith(normName)) && 
                        Math.abs(normName.length - normExisting.length) <= 5;
      
      if (isSimilar) return String(t.id);
    }
    return null;
  };

  // 1. Process inputs: decide what is an existing ID, what is a fuzzy match, and what is truly NEW
  const resolvedIds: string[] = [];
  const trulyNewNames: string[] = [];

  for (const item of tagNamesOrIds) {
    const strItem = String(item);
    
    // Check if it's already a known ID
    if (tags.some(t => String(t.id) === strItem)) {
      resolvedIds.push(strItem);
      continue;
    }

    // Check if name exists exactly (case-insensitive)
    const existingIdFromMap = tagNameToIdMap.get(strItem);
    if (existingIdFromMap) {
      resolvedIds.push(existingIdFromMap);
      continue;
    }

    // NEW: Perform fuzzy match to existing tags
    const fuzzyId = findFuzzyMatch(strItem);
    if (fuzzyId) {
      resolvedIds.push(fuzzyId);
      continue;
    }

    // If we get here, it's a truly new tag name
    trulyNewNames.push(strItem);
  }

  // 2. Handle truly new names
  let newTagsMap = new Map<string, string>();
  const uniqueNewNames = Array.from(new Set(trulyNewNames)).filter(Boolean);

  if (uniqueNewNames.length > 0) {
    newTagsMap = await batchCreateTags(uniqueNewNames);
    // Update local tags state
    setTags(prev => [
      ...prev,
      ...Array.from(newTagsMap.entries()).map(([name, id]) => ({ id: String(id), name, aliases: [] }))
    ]);
  }

  // 3. Final mapping
  const finalResults: string[] = [];
  // Note: we re-iterate trulyNewNames to maintain order if necessary, 
  // but simpler to just use the logic flow from step 1
  for (const item of tagNamesOrIds) {
    const strItem = String(item);
    if (tags.some(t => String(t.id) === strItem)) {
      finalResults.push(strItem);
    } else if (tagNameToIdMap.has(strItem)) {
      finalResults.push(tagNameToIdMap.get(strItem)!);
    } else {
      const fId = findFuzzyMatch(strItem);
      if (fId) {
        finalResults.push(fId);
      } else if (newTagsMap.has(strItem)) {
        finalResults.push(newTagsMap.get(strItem)!);
      } else {
        // This shouldn't be reached often, but as fallback:
        finalResults.push(strItem);
      }
    }
  }

  return Array.from(new Set(finalResults));
};
