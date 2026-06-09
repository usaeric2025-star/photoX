import { processPhotos } from '../lib/filters';
import type { Photo, Category, Tag } from '../types';

/**
 * Photo Processor Worker
 * Offloads heavy photo processing (filtering, grouping, sorting) from the main thread.
 */

self.onmessage = (e: MessageEvent<{
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  userFilters: any;
  urlFilters: any;
  options?: {
    showGroupsCollapsed?: boolean;
    isAdminModeOverride?: boolean;
    bypassFilter?: boolean;
  };
}>) => {
  const { photos, categories, tags, userFilters, urlFilters, options } = e.data;

  try {
    // Execute the pure processing logic
    const result = processPhotos(photos, categories, tags, userFilters, urlFilters, options);
    
    // Send the result back to the main thread
    self.postMessage({ success: true, data: result });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
