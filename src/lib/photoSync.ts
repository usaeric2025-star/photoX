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
          categoryId: cp.categoryId || local.categoryId,
          manufacturerId: cp.manufacturerId || local.manufacturerId,
          tagIds: (cp.tagIds && cp.tagIds.length > 0) ? cp.tagIds : local.tagIds,
          name: cp.name || local.name,
          manual_code: cp.manual_code || local.manual_code,
          description: cp.description || local.description,
          // Preserve local analytic states if needed, though usually cloud wins
          isAnalyzing: cp.isAnalyzing !== undefined ? cp.isAnalyzing : local.isAnalyzing
        });
      } else {
        localMap.set(cp.id, cp);
      }
    });
  }

  return cleanPhotos(Array.from(localMap.values()));
};
