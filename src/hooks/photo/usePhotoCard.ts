import React, { useRef } from 'react';
import { useLongPress } from '@/hooks/core/useLongPress';
import { useUI, UIStoreState } from '@/lib/store';
import { useAppRoute, useNavigation } from '@/lib/router';
import { PhotoListItem } from '@/types/api';
import { queryKeys } from '@/lib/query/keys';
import { getGroupById } from '@/services/group/queries';
import { STALE_TIMES } from '@/lib/query/config';
import { Photo } from '@/types';
import { useFilters } from '@/hooks/useFilters';
import { useSelection } from '@/features/selection';

interface UsePhotoCardInteractionProps {
  photo: PhotoListItem;
  isManagement: boolean;
  isMultiSelect: boolean;
  showGroupsCollapsed: boolean;
  hasSearchQuery: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

import { logger } from '@/lib/logger';

export function usePhotoCard({
  photo,
  isManagement,
  isMultiSelect,
  showGroupsCollapsed,
  hasSearchQuery,
  onClick
}: UsePhotoCardInteractionProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTriggered = useRef(false);
  const resetTimerRef = useRef<number | null>(null);
  const { updateFilters } = useFilters();
  
  const { toggleSelect, toggleMode } = useSelection();
  const patch = useUI((s: UIStoreState) => s.patch);
  const route = useAppRoute();
  const navigate = useNavigation();
 
   const handleOpenLightbox = () => {
     logger.debug('[usePhotoCard] handleOpenLightbox for photo:', photo.id);
     navigate.photo(photo.id);
   };
    
  const handleGroupNavigate = (gid: string) => {
      if (isManagement) {
          navigate.adminGroup(gid);
      } else {
          navigate.publicGroup(gid);
      }
  };

  const handleMouseEnter = () => {
    // Basic navigation detection
    const isAlreadyOnGroupPage = route.name === 'publicGroup' || route.name === 'adminGroup' || (route.params as Record<string, string>).groupId;
    if (photo.groupId && showGroupsCollapsed && !hasSearchQuery && !isAlreadyOnGroupPage) {
      // SWR automatically handles caching when fetcher is called elsewhere.
      // Removed prefetchQuery as it was TanStack Query specific.
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    logger.debug('[usePhotoCard] CLICKED photo:', photo.id, { isManagement, isMultiSelect, hasSearchQuery });
    if (longPressTriggered.current) {
      logger.debug('[usePhotoCard] BLOCKED by long press');
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (isMultiSelect) {
      logger.debug('[usePhotoCard] SELECTING photo:', photo.id);
      e.stopPropagation();
      e.preventDefault();
      toggleSelect(photo.id);
      return;
    }

    const isAlreadyOnGroupPage = route.name === 'publicGroup' || route.name === 'adminGroup' || (route.params as Record<string, string>).groupId;
    const shouldGoToGroup = photo.groupId && showGroupsCollapsed && !isAlreadyOnGroupPage;

    if (shouldGoToGroup) {
        logger.debug('[usePhotoCard] NAVIGATING to group:', photo.groupId);
        e.stopPropagation();
        e.preventDefault();
        handleGroupNavigate(photo.groupId!);
        return;
    }

    if (onClick) {
      onClick(e);
      return;
    }

    logger.debug('[usePhotoCard] OPENING Lightbox');
    handleOpenLightbox();
  };

  useLongPress(cardRef, {
    delay: 600,
    onLongPress: () => {
      longPressTriggered.current = true;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => {
        longPressTriggered.current = false;
      }, 300);

      if (isManagement) {
        if (!isMultiSelect) {
          toggleMode();
          toggleSelect(photo.id);
        } else {
          toggleSelect(photo.id);
        }
        if ('vibrate' in navigator) navigator.vibrate(50);
      } else {
        (window as unknown as { _pendingPhoto: PhotoListItem })._pendingPhoto = photo;
        patch({ showWhatsAppChoice: true });
      }
    }
  });

  return {
    cardRef,
    handleClick,
    handleMouseEnter
  };
}
