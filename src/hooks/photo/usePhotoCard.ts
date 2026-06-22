import React, { useRef } from 'react';
import { useLongPress } from '@/hooks/core/useLongPress';
import { useUI } from '@/lib/store';
import { useAppRouter } from '@/lib/router/useAppRouter';
import { useAppQueryClient as useQueryClient } from '@/lib/query';
import { PhotoListItem } from '@/types/api';
import { queryKeys } from '@/lib/query/keys';
import { getGroupById } from '@/services/group/queries';
import { STALE_TIMES } from '@/lib/query/config';
import { Photo } from '@/types';

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
  
  const toggleSelected = useUI((s) => s.toggleSelected);
  const update = useUI((s) => s.update);
  const { navigate, route, params } = useAppRouter();
  const queryClient = useQueryClient();
 
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
    const isAlreadyOnGroupPage = (params as any).groupId || window.location.pathname.includes('/group/');
    if (photo.groupId && showGroupsCollapsed && !hasSearchQuery && !isAlreadyOnGroupPage) {
      const gid = photo.groupId;
      const isAdmin = isManagement;
      
      // Prefetch data
      queryClient.prefetchQuery({
        queryKey: queryKeys.groups.detail(gid, isAdmin),
        queryFn: () => getGroupById(gid, isAdmin ? 'admin' : 'public'),
        staleTime: STALE_TIMES.GROUP_DETAIL,
      }).catch(() => {});
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
      toggleSelected(photo.id);
      return;
    }

    const isAlreadyOnGroupPage = (params as any).groupId || window.location.pathname.includes('/group/');
    const shouldGoToGroup = photo.groupId && showGroupsCollapsed && !isAlreadyOnGroupPage;

    if (shouldGoToGroup) {
        logger.debug('[usePhotoCard] NAVIGATING to group:', photo.groupId);
        e.stopPropagation();
        e.preventDefault();
        handleGroupNavigate(photo.groupId!);
        return;
    }

    logger.debug('[usePhotoCard] OPENING Lightbox');
    handleOpenLightbox();

    if (onClick) {
      onClick(e);
    }
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
          update({ isMultiSelect: true, selectedIds: [photo.id] });
        } else {
          toggleSelected(photo.id);
        }
        if ('vibrate' in navigator) navigator.vibrate(50);
      } else {
        (window as unknown as { _pendingPhoto: PhotoListItem })._pendingPhoto = photo;
        update({ showWhatsAppChoice: true });
      }
    }
  });

  return {
    cardRef,
    handleClick,
    handleMouseEnter
  };
}
