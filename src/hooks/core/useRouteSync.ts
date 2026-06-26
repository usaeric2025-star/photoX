// src/hooks/core/useRouteSync.ts
import { useEffect } from 'react';
import { useAppRoute } from '@/lib/router';
import { Router, ALL_ROUTES } from '@/router';
import { uiStore, useUIStore, UIStoreState, UIStoreInstance } from '@/store/uiStore';
import { usePhotos } from '@/lib/query/hooks/usePhotos';
import { Photo } from '@/types/photo';

export function useRouteSync() {
  const route = useAppRoute();
  const { data } = usePhotos();
  const photos = data?.pages.flatMap(p => p.items) || [];

  // Reactive values from signals
  const filters = useUIStore(s => s.filters);
  const currentQ = filters.q;
  const currentCat = filters.category;
  const currentTags = filters.tags;
  const currentBatch = useUIStore(s => s.isMultiSelect);
  const currentSelected = useUIStore(s => s.selectedIds);
  const lightboxIsOpen = useUIStore(s => s.lightboxIsOpen);

  // 1. URL -> Signal (Synchronization from URL to Memory)
  useEffect(() => {
    if (!route) return;
    const params = route.params as Record<string, string | string[] | undefined>;

  // Search Term
  const q = (params.q as string) || '';
  if (filters.q !== q) {
    (uiStore as unknown as UIStoreInstance).setState((s: UIStoreState) => ({ filters: { ...s.filters, q } }));
  }

  // Category
  const cat = (params.cat as string) || '';
  if (filters.category !== cat) {
    (uiStore as unknown as UIStoreInstance).setState((s: UIStoreState) => ({ filters: { ...s.filters, category: cat } }));
  }

  // Tags
  const tags = (params.tag || []) as string[];
  if (JSON.stringify(filters.tags) !== JSON.stringify(tags)) {
    (uiStore as unknown as UIStoreInstance).setState((s: UIStoreState) => ({ filters: { ...s.filters, tags } }));
  }

    // Batch Mode
    const batch = params.batch === 'true';
    if (currentBatch !== batch) {
      (uiStore as unknown as UIStoreInstance).setState({ isMultiSelect: batch });
    }

    // Selection
    const selected = (params.selected as string) || '';
    const newSelected = selected.split(',').filter(Boolean);
    if (JSON.stringify(currentSelected) !== JSON.stringify(newSelected)) {
      (uiStore as unknown as UIStoreInstance).setState({ selectedIds: newSelected });
    }

    // Lightbox
    const photoId = params.photoId as string;
    const modal = params.modal as string;
    
    // Lightbox handling
    const shouldBeLightboxOpen = !!(photoId && photos?.length > 0 && modal !== 'edit');
    if (lightboxIsOpen !== shouldBeLightboxOpen) {
      uiStore.setState({ lightboxIsOpen: shouldBeLightboxOpen });
    }

    // Edit modal handling
    const shouldBeEditOpen = modal === 'edit';
    if (uiStore.getState().isPhotoEditOpen !== shouldBeEditOpen) {
      uiStore.setState({ isPhotoEditOpen: shouldBeEditOpen });
    }
    
    // Set photo if edit is open
    if (shouldBeEditOpen && photoId) {
        const photo = photos.find(p => p.id === photoId) as Photo | undefined || null;
        if (uiStore.getState().currentEditingPhoto?.id !== photo?.id) {
            uiStore.setState({ currentEditingPhoto: photo });
        }
    }
  }, [
    (route?.params as Record<string, string | string[] | undefined>)?.q, 
    (route?.params as Record<string, string | string[] | undefined>)?.cat, 
    (route?.params as Record<string, string | string[] | undefined>)?.tag, 
    (route?.params as Record<string, string | string[] | undefined>)?.batch, 
    (route?.params as Record<string, string | string[] | undefined>)?.selected, 
    (route?.params as Record<string, string | string[] | undefined>)?.photoId,
    (route?.params as Record<string, string | string[] | undefined>)?.modal,
    photos?.length,
    lightboxIsOpen
  ]);

  // 2. Signal -> URL (Synchronization from Memory to URL)
  useEffect(() => {
    // Skip if not on a route that supports these filters (optional check)
    if (!route || !route.name) return;
    const params = route.params as Record<string, string | string[] | undefined>;

    const queryUpdates: Record<string, string | string[] | undefined> = {};
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
      const replace = Router.replace as unknown as (name: string, params: Record<string, unknown>) => void;
      replace(route.name, {
        ...params,
        ...queryUpdates
      } as Record<string, unknown>);
    }
  }, [currentQ, currentCat, currentTags, currentBatch, currentSelected, route?.name]);
}
