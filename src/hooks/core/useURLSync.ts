import { useEffect } from 'react';
import { useQueryStates } from 'nuqs';
import { 
  searchParser, 
  categoryParser, 
  tagsParser, 
  sortParser, 
  statusParser, 
  parseAsPhotoId, 
  groupIdParser, 
  modalParser, 
  viewParser,
} from '@/lib/nuqs/parsers';
import { uiStore, type UIStoreState } from '@/store/uiStore';
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
    photoId: parseAsPhotoId,
    groupId: groupIdParser,
    modal: modalParser,
    view: viewParser,
  }, {
    shallow: true,
    history: 'replace',
  });

  // 1. Sync from URL to Store on mount or URL change (Deep linking & Browser navigation)
  useEffect(() => {
    const state = uiStore.getState();
    const updates: Partial<UIStoreState> = {};

    // Modal / Edit state
    const shouldBeEditOpen = query.modal === 'edit';
    if (state.isPhotoEditOpen !== shouldBeEditOpen) {
      updates.isPhotoEditOpen = shouldBeEditOpen;
    }

    // Lightbox state
    const shouldBeLightboxOpen = !!(query.photoId && query.modal !== 'edit');
    if (shouldBeLightboxOpen && !state.lightboxIsOpen && state.lightboxSlides.length > 0) {
      updates.lightboxIsOpen = true;
    }

    // Sync Lightbox Index based on photoId in URL
    if (query.photoId) {
      const index = state.lightboxSlides.findIndex(s => s.id === query.photoId);
      if (index !== -1 && state.lightboxCurrentIndex !== index) {
        updates.lightboxCurrentIndex = index;
      }
    }

    if (Object.keys(updates).length > 0) {
      logger.debug('[useURLSync] Syncing URL -> Store', updates);
      uiStore.setState(updates);
    }
  }, [query]);

  // 2. Sync from Store to URL (User interactions in UI automatically update URL)
  useEffect(() => {
    const unsubscribe = uiStore.subscribe((state) => {
      const updates: Partial<typeof query> = {};
      
      if (state.lightboxIsOpen) {
        // Lightbox mode: Sync photoId
        const currentSlide = state.lightboxSlides[state.lightboxCurrentIndex];
        if (currentSlide && currentSlide.id !== query.photoId) {
          updates.photoId = currentSlide.id;
        }
      } else if (state.isPhotoEditOpen) {
        // Edit mode: Sync photoId and modal
        if (state.currentEditingPhoto && state.currentEditingPhoto.id !== query.photoId) {
          updates.photoId = state.currentEditingPhoto.id;
        }
        if (query.modal !== 'edit') {
          updates.modal = 'edit';
        }
      } else {
        // Both closed: Clear photoId if not in deep link / editing
        if (query.photoId !== null && query.modal !== 'edit') {
          updates.photoId = null;
        }
        if (query.modal === 'edit' && !state.isPhotoEditOpen) {
          updates.modal = null;
        }
      }

      if (Object.keys(updates).length > 0) {
        logger.debug('[useURLSync] Syncing Store -> URL', updates);
        setQuery(updates);
      }
    });

    return unsubscribe;
  }, [query.photoId, query.modal, setQuery]);
}

