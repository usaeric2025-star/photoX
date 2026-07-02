import React, { useRef } from 'react';
import { useLongPress } from '#src/hooks/core/useLongPress.js';
import { useUI, UIStoreState } from '#lib/store/index.js';
import { useAppRoute, useNavigation } from '#lib/router/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { queryKeys } from '#lib/query/keys.js';
import { getGroupById } from '#src/services/group/queries.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { Photo } from '#src/types/index.js';
import { useFilters } from '#src/features/filters/index.js';
import { useIsMultiSelect, useSelectionActions } from '#src/features/selection/useSelection.js';

interface UsePhotoCardInteractionProps {
  photo: PhotoListItem;
  isManagement: boolean;
  isMultiSelect: boolean;
  showGroupsCollapsed: boolean;
  hasSearchQuery: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

import { logger } from '#lib/logger.js';

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
  
  const isMultiSelectActual = useIsMultiSelect();
  const { toggleSelect, toggleMode } = useSelectionActions();
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
        patch({ showWhatsAppChoice: true, pendingPhotoId: photo.id });
      }
    }
  });

  return {
    cardRef,
    handleClick
  };
}
