import { useEffect, useRef } from 'react';
import { useQueryStates } from 'nuqs';
import { 
  searchParser, 
  categoryParser, 
  tagsParser, 
  sortParser, 
  statusParser, 
  batchParser, 
  parseAsPhotoId, 
  groupIdParser, 
  modalParser, 
  viewParser,
  selectedIdsParser
} from '@/lib/nuqs/parsers';
import { uiStore, useUIStore } from '@/store/uiStore';
import { logger } from '@/lib/logger';

/**
 * useURLSync - Synchronizes UIStore with URL using nuqs
 * This replaces the legacy useRouteSync with a more efficient and reliable solution.
 */
export function useURLSync() {
  const [query, setQuery] = useQueryStates({
    q: searchParser,
    cat: categoryParser,
    tag: tagsParser,
    sort: sortParser,
    status: statusParser,
    batch: batchParser,
    photoId: parseAsPhotoId,
    groupId: groupIdParser,
    modal: modalParser,
    view: viewParser,
    selected: selectedIdsParser,
  }, {
    shallow: true,
    history: 'replace',
  });

  const initializedRef = useRef(false);

  // 1. Sync from URL to Store on mount or URL change
  useEffect(() => {
    // Basic initialization guard: if it's the very first mount, ensure state is clean or handle accordingly.
    // For subsequent runs, proceed as normal to keep URL and store synced.
    
    const state = uiStore.getState();
    const updates: any = {};

    if (query.q !== state.filters.q) {
      updates.filters = { ...state.filters, q: query.q };
    }
    if (query.cat !== state.filters.category) {
      updates.filters = { ...(updates.filters || state.filters), category: query.cat };
    }
    if (JSON.stringify(query.tag) !== JSON.stringify(state.filters.tags)) {
      updates.filters = { ...(updates.filters || state.filters), tags: query.tag };
    }
    if (query.batch !== state.isMultiSelect) {
      updates.isMultiSelect = query.batch;
    }
    if (JSON.stringify(query.selected) !== JSON.stringify(state.selectedIds)) {
      updates.selectedIds = query.selected;
    }
    
    // Lightbox and Modal state
    const shouldBeLightboxOpen = !!(query.photoId && query.modal !== 'edit');
    if (state.lightboxIsOpen !== shouldBeLightboxOpen) {
      updates.lightboxIsOpen = shouldBeLightboxOpen;
    }
    
    const shouldBeEditOpen = query.modal === 'edit';
    if (state.isPhotoEditOpen !== shouldBeEditOpen) {
      updates.isPhotoEditOpen = shouldBeEditOpen;
    }

    if (Object.keys(updates).length > 0) {
      logger.debug('[useURLSync] Syncing URL -> Store', updates);
      uiStore.setState(updates);
    }
  }, [query]);

  // 2. Sync from Store to URL
  const filters = useUIStore(s => s.filters);
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const selectedIds = useUIStore(s => s.selectedIds);
  const lightboxIsOpen = useUIStore(s => s.lightboxIsOpen);
  const lightboxCurrentIndex = useUIStore(s => s.lightboxCurrentIndex);
  const lightboxSlides = useUIStore(s => s.lightboxSlides);
  const isPhotoEditOpen = useUIStore(s => s.isPhotoEditOpen);
  const currentEditingPhoto = useUIStore(s => s.currentEditingPhoto);

  useEffect(() => {
    const updates: any = {};
    let changed = false;

    if (filters.q !== query.q) {
      updates.q = filters.q || null;
      changed = true;
    }
    if (filters.category !== query.cat) {
      updates.cat = filters.category || null;
      changed = true;
    }
    if (JSON.stringify(filters.tags) !== JSON.stringify(query.tag)) {
      updates.tag = filters.tags.length > 0 ? filters.tags : null;
      changed = true;
    }
    if (isMultiSelect !== query.batch) {
      updates.batch = isMultiSelect || null;
      changed = true;
    }
    if (JSON.stringify(selectedIds) !== JSON.stringify(query.selected)) {
      updates.selected = selectedIds.length > 0 ? selectedIds : null;
      changed = true;
    }

    // Modal and PhotoId
    if (isPhotoEditOpen) {
      if (query.modal !== 'edit') {
        updates.modal = 'edit';
        changed = true;
      }
      if (currentEditingPhoto?.id && currentEditingPhoto.id !== query.photoId) {
        updates.photoId = currentEditingPhoto.id;
        changed = true;
      }
    } else if (lightboxIsOpen) {
      if (query.modal === 'edit') {
        updates.modal = null;
        changed = true;
      }
      const currentPhotoId = lightboxSlides[lightboxCurrentIndex]?.id;
      if (currentPhotoId && currentPhotoId !== query.photoId) {
        updates.photoId = currentPhotoId;
        changed = true;
      }
    } else {
      if (query.modal) {
        updates.modal = null;
        changed = true;
      }
      if (query.photoId) {
        updates.photoId = null;
        changed = true;
      }
    }

    if (changed) {
      logger.debug('[useURLSync] Syncing Store -> URL', updates);
      setQuery(updates);
    }
  }, [filters, isMultiSelect, selectedIds, lightboxIsOpen, lightboxCurrentIndex, lightboxSlides.length, isPhotoEditOpen, currentEditingPhoto?.id]);
}
