
import { Tag } from '../types';
import { batchCreateTags } from '../services/supabaseService';

export const resolveTagIdsBatch = async (
  tagNamesOrIds: string[],
  tags: Tag[],
  tagNameToIdMap: Map<string, string>
): Promise<string[]> => {
  // Helper for fuzzy matching: uppercase and remove non-alphas
  const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const findFuzzyMatch = (name: string): string | null => {
    const normName = normalize(name);
    if (!normName) return null;

    // 1. Direct case-insensitive match
    for (const t of tags) {
      const normExisting = normalize(t.name);
      if (normName === normExisting) return String(t.id);
      
      // 2. Semantic overlap
      // Only match if the words are deeply related
      const isSimilar = (normName.startsWith(normExisting) || normExisting.startsWith(normName)) && 
                        Math.abs(normName.length - normExisting.length) <= 4; 
      
      if (isSimilar) return String(t.id);
    }
    return null;
  };

  // 1. Process inputs: decide what is an existing ID, what is a fuzzy match, and what is truly NEW
  const resolvedIds: string[] = [];
  const trulyNewNames: string[] = [];

  for (const item of tagNamesOrIds) {
    const strItem = String(item).toUpperCase().trim();
    if (!strItem) continue;
    
    // Check if it's already a known ID
    if (tags.some(t => String(t.id) === strItem)) {
      resolvedIds.push(strItem);
      continue;
    }

    // NEW: Security fix to prevent re-creating deleted tags
    const isNumericId = /^\d+$/.test(strItem);
    const isUuid = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(strItem);
    
    if (isNumericId || isUuid) {
      console.warn(`[resolveTagIdsBatch] Skipping potential stale ID: ${strItem}`);
      continue;
    }

    // Check if name exists exactly (case-insensitive)
    const existingIdFromMap = Array.from(tagNameToIdMap.entries())
      .find(([name]) => normalize(name) === normalize(strItem))?.[1];
    
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
  }

  // 3. Final mapping
  const finalResults: string[] = [];
  for (const item of tagNamesOrIds) {
    const strItem = String(item).toUpperCase().trim();
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
        // Fallback: only push if NOT a suspected stale ID
        const isNumericId = /^\d+$/.test(strItem);
        const isUuid = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(strItem);
        if (!isNumericId && !isUuid) {
           finalResults.push(strItem);
        }
      }
    }
  }

  return Array.from(new Set(finalResults));
};
