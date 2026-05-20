export function normalizeTagIds(input: any, existingTags?: { id: string, name: string }[]): string[] {
  if (!input) return [];
  
  let raw: any[] = [];
  if (Array.isArray(input)) {
    raw = input;
  } else if (typeof input === 'string') {
    raw = input.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    raw = [input];
  }

  const resultIds: string[] = [];

  for (const item of raw) {
    if (item === null || item === undefined) continue;
    
    let processedItem = typeof item === 'object' && item !== null ? (item.id || '') : item;
    let itemIdStr = String(processedItem).trim();
    if (itemIdStr === '[object Object]' || !itemIdStr) continue;

    // 1. If we have context existingTags from the system, let's use it for super advanced alignment
    if (existingTags && Array.isArray(existingTags) && existingTags.length > 0) {
      // Find if it already matches a strict string ID directly
      const directMatch = existingTags.find(t => String(t.id) === itemIdStr);
      if (directMatch) {
        resultIds.push(String(directMatch.id));
        continue;
      }

      // If no direct ID match, check if it's a numeric index from AI list prompt output (e.g., [0, 1])
      const isNum = /^\d+$/.test(itemIdStr);
      if (isNum) {
        const numVal = parseInt(itemIdStr, 10);
        // If the number fits as an index in our list of existing tags
        if (numVal >= 0 && numVal < existingTags.length) {
          const matchedTagByIndex = existingTags[numVal];
          if (matchedTagByIndex) {
            resultIds.push(String(matchedTagByIndex.id));
            continue;
          }
        }
      }

      // If AI returned tag name inside tagIds field instead, resolve by matching name
      const nameMatch = existingTags.find(t => t.name && t.name.toLowerCase() === itemIdStr.toLowerCase());
      if (nameMatch) {
        resultIds.push(String(nameMatch.id));
        continue;
      }
    }

    // 2. Default fallback if no tag matches or no contextual list is present
    resultIds.push(itemIdStr);
  }

  // Remove duplicates and empty items
  return Array.from(new Set(resultIds)).filter(Boolean);
}

