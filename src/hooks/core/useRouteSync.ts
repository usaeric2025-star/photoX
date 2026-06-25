// src/hooks/core/useRouteSync.ts
import { useEffect } from 'react';
import { useAppRoute } from '@/lib/router';
import { Router } from '@/router';
import { useSignal } from '@storve/react';
import {
  searchTerm,
  searchCategory,
  searchTags,
  selectedIds,
  isMultiSelect,
  isLightboxOpen,
} from '@/lib/store';
import { usePhotos } from '@/lib/query/hooks/usePhotos';

export function useRouteSync() {
  const route = useAppRoute();
  const { data } = usePhotos();
  const photos = data?.pages.flatMap(p => p.items) || [];

  // Reactive values from signals
  const currentQ = useSignal(searchTerm);
  const currentCat = useSignal(searchCategory);
  const currentTags = useSignal(searchTags);
  const currentBatch = useSignal(isMultiSelect);
  const currentSelected = useSignal(selectedIds);

  // 1. URL -> Signal (Synchronization from URL to Memory)
  useEffect(() => {
    if (!route) return;
    const params = route.params as any;

    // Search Term
    const q = (params.q as string) || '';
    if (searchTerm.get() !== q) {
      searchTerm.set(q);
    }

    // Category
    const cat = (params.cat as string) || '';
    if (searchCategory.get() !== cat) {
      searchCategory.set(cat);
    }

    // Tags
    const tags = (params.tag || []) as string[];
    if (JSON.stringify(searchTags.get()) !== JSON.stringify(tags)) {
      searchTags.set(tags);
    }

    // Batch Mode
    const batch = params.batch === 'true';
    if (isMultiSelect.get() !== batch) {
      isMultiSelect.set(batch);
    }

    // Selection
    const selected = (params.selected as string) || '';
    const newSelected = selected.split(',').filter(Boolean);
    if (JSON.stringify(selectedIds.get()) !== JSON.stringify(newSelected)) {
      selectedIds.set(newSelected);
    }

    // Lightbox
    const photoId = params.photoId as string;
    const shouldBeOpen = !!(photoId && photos?.length > 0);
    if (isLightboxOpen.get() !== shouldBeOpen) {
      isLightboxOpen.set(shouldBeOpen);
    }
  }, [
    (route?.params as any)?.q, 
    (route?.params as any)?.cat, 
    (route?.params as any)?.tag, 
    (route?.params as any)?.batch, 
    (route?.params as any)?.selected, 
    (route?.params as any)?.photoId,
    photos?.length
  ]);

  // 2. Signal -> URL (Synchronization from Memory to URL)
  useEffect(() => {
    // Skip if not on a route that supports these filters (optional check)
    if (!route || !route.name) return;
    const params = route.params as any;

    const queryUpdates: any = {};
    let hasChanges = false;

    // Search Term
    if (currentQ !== (params.q || '')) {
      queryUpdates.q = currentQ || undefined;
      hasChanges = true;
    }

    // Category
    if (currentCat !== (params.cat || '')) {
      queryUpdates.cat = currentCat || undefined;
      hasChanges = true;
    }

    // Tags
    if (JSON.stringify(currentTags) !== JSON.stringify(params.tag || [])) {
      queryUpdates.tag = (currentTags && currentTags.length) ? currentTags : undefined;
      hasChanges = true;
    }

    // Batch Mode
    const batchStr = currentBatch ? 'true' : undefined;
    if (batchStr !== params.batch) {
      queryUpdates.batch = batchStr;
      hasChanges = true;
    }

    // Selection
    const selectedStr = Array.isArray(currentSelected) ? currentSelected.join(',') : '';
    if (selectedStr !== (params.selected || '')) {
      queryUpdates.selected = selectedStr || undefined;
      hasChanges = true;
    }

    if (hasChanges) {
      Router.replace(route.name as any, {
        ...params,
        ...queryUpdates
      });
    }
  }, [currentQ, currentCat, currentTags, currentBatch, currentSelected, route?.name]);
}
