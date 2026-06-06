import { Dimension } from '../types';

/**
 * Merges split dimensions that belong to the same component.
 * e.g., "Sofa H", "Sofa D", "Sofa W" -> "Sofa" with height, length, width.
 */
export function mergeSplitDimensions(dims: any[]): Dimension[] {
  if (!Array.isArray(dims)) return [];

  const mergedMap = new Map<string, Dimension>();

  dims.forEach(dim => {
    let label = (dim.label || '').trim();
    
    // Check for common split patterns: "Name H", "Name(H)", "Name - H", "Name 高", "Name(高度)"
    const splitMatch = label.match(/^(.*?)\s*[\(-]?\s*([HWD L]|高|宽|深|度|长度|宽度|高度|深度)\s*[\)]?$/i);
    
    let baseLabel = label;
    let typeChar = '';
    
    if (splitMatch) {
      baseLabel = (splitMatch[1].trim() || 'Dimensions').replace(/[:：]\s*$/, '').trim();
      const suffix = splitMatch[2];
      if (/^[H高]|高度/i.test(suffix)) typeChar = 'H';
      else if (/^[W宽]|宽度/i.test(suffix)) typeChar = 'W';
      else if (/^[DL深]|长度|深度/i.test(suffix)) typeChar = 'L';
    } else {
      // Also check if the label ITSELF is just the dimension name
      if (/^(高|高度|height|h)$/i.test(label)) { baseLabel = 'Dimensions'; typeChar = 'H'; }
      else if (/^(宽|宽度|width|w)$/i.test(label)) { baseLabel = 'Dimensions'; typeChar = 'W'; }
      else if (/^(深|深度|长|长度|depth|d|length|l)$/i.test(label)) { baseLabel = 'Dimensions'; typeChar = 'L'; }
    }

    if (!mergedMap.has(baseLabel)) {
      mergedMap.set(baseLabel, {
        label: baseLabel,
        height: 0,
        width: 0,
        length: 0,
        unit: dim.unit || 'cm'
      });
    }

    const merged = mergedMap.get(baseLabel)!;
    
    // Map values based on typeChar or existing values
    if (typeChar === 'H' || (!typeChar && dim.height)) merged.height = dim.height || merged.height;
    if (typeChar === 'W' || (!typeChar && dim.width)) merged.width = dim.width || merged.width;
    if (typeChar === 'D' || typeChar === 'L' || (!typeChar && dim.length)) merged.length = dim.length || merged.length;
    
    // If it was a split entry with value in another field (e.g., value is 35 but H/W/D is in label)
    // The AI might return {label: "Sofa H", height: 35} or {label: "Sofa H", width: 35}
    // We try to find the non-zero value and assign it based on typeChar
    if (typeChar) {
      const realValue = dim.height || dim.width || dim.length || 0;
      if (realValue > 0) {
        if (typeChar === 'H') merged.height = realValue;
        if (typeChar === 'W') merged.width = realValue;
        if (typeChar === 'D' || typeChar === 'L') merged.length = realValue;
      }
    }
  });

  return Array.from(mergedMap.values());
}
