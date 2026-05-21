import { Photo } from '../types';
import { cleanPhotos } from './filters';

/**
 * Merges cloud photos into the local collection.
 * Ensures consistent metadata updates while preserving local-only properties if any.
 */
export const mergePhotos = (localPhotos: Photo[], cloudPhotos: Photo[]): Photo[] => {
  const localMap = new Map(localPhotos.filter(p => p && p.id).map(p => [p.id, p]));
  
  if (cloudPhotos && cloudPhotos.length > 0) {
    cloudPhotos.forEach(cp => {
      const local = localMap.get(cp.id);
      if (local) {
        localMap.set(cp.id, {
          ...local,
          ...cp,
          // Explicitly handle potential null fields from cloud that should fallback to local
          category_id: cp.category_id || local.category_id,
          manufacturer_id: cp.manufacturer_id || local.manufacturer_id,
          tag_ids: (cp.tag_ids && cp.tag_ids.length > 0) ? cp.tag_ids : local.tag_ids,
          name: cp.name || local.name,
          manual_code: cp.manual_code || local.manual_code,
          description: cp.description || local.description,
          // Preserve local analytic states if needed, though usually cloud wins
          is_analyzing: cp.is_analyzing !== undefined ? cp.is_analyzing : local.is_analyzing
        });
      } else {
        localMap.set(cp.id, cp);
      }
    });
  }

  return cleanPhotos(Array.from(localMap.values()));
};
