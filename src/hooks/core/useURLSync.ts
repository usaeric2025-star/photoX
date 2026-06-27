import { useEffect, useRef } from 'react';
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
import { uiStore, useUIStore, type UIStoreState } from '@/store/uiStore';
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

  const initializedRef = useRef(false);

  // 1. Sync from URL to Store on mount or URL change
  useEffect(() => {
    const state = uiStore.getState();
    const updates: Partial<UIStoreState> = {};

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
}
