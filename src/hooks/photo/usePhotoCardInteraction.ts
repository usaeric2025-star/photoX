import React, { useRef } from 'react';
import { useLongPress } from '@/hooks/core/useLongPress';
import { useUIStore } from '@/store/useUIStore';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
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

import { useFilters } from '@/hooks/useFilters';
import { logger } from '@/lib/logger';

export function usePhotoCardInteraction({
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
  
  const toggleSelected = useUIStore((s) => s.toggleSelected);
  const update = useUIStore((s) => s.update);
  const { navigate, location, params } = useRouterSafe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setPhotoId, setModal } = useFilters();
 
   const handleOpenLightbox = () => {
     logger.debug('[usePhotoCardInteraction] handleOpenLightbox for photo:', photo.id);
     setPhotoId(photo.id);
   };
    
  const handleGroupNavigate = (gid: string, anchorPhotoId?: string) => {
    navigate({ 
      to: isManagement ? '/admin/group/$groupId' : '/group/$groupId',
      params: { groupId: gid },
      search: (prev: any) => ({ 
        ...prev, 
        photoId: anchorPhotoId || prev.photoId, 
        anchor: !!anchorPhotoId || undefined 
      }) 
    });
  };

  const handleMouseEnter = () => {
    const isAlreadyOnGroupPage = !!(params as any).groupId || location?.pathname?.includes('/group/') || location?.pathname?.includes('/g/');
    if (photo.groupId && showGroupsCollapsed && !hasSearchQuery && !isAlreadyOnGroupPage) {
      const gid = photo.groupId;
      const isAdmin = isManagement;
      // Preload route type-safely
      router.preloadRoute({ 
        to: isAdmin ? '/admin/group/$groupId' : '/group/$groupId',
        params: { groupId: gid },
        search: (prev: any) => prev 
      }).catch(() => {});
      
      // Prefetch data
      queryClient.prefetchQuery({
        queryKey: queryKeys.groups.detail(gid, isAdmin),
        queryFn: () => getGroupById(gid, isAdmin ? 'admin' : 'public'),
        staleTime: STALE_TIMES.GROUP_DETAIL,
      }).catch(() => {});
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    logger.debug('[usePhotoCardInteraction] CLICKED photo:', photo.id, { isManagement, isMultiSelect, hasSearchQuery });
    if (longPressTriggered.current) {
      logger.debug('[usePhotoCardInteraction] BLOCKED by long press');
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (isMultiSelect) {
      logger.debug('[usePhotoCardInteraction] SELECTING photo:', photo.id);
      e.stopPropagation();
      e.preventDefault();
      toggleSelected(photo.id);
      return;
    }

    const isAlreadyOnGroupPage = !!(params as any).groupId || location?.pathname?.includes('/group/') || location?.pathname?.includes('/g/');
    const shouldGoToGroup = photo.groupId && showGroupsCollapsed && !isAlreadyOnGroupPage;

    if (shouldGoToGroup) {
      if (!hasSearchQuery) {
        logger.debug('[usePhotoCardInteraction] NAVIGATING to group (Normal):', photo.groupId);
        e.stopPropagation();
        e.preventDefault();
        handleGroupNavigate(photo.groupId!);
        return;
      } else {
        // From search result: navigate with anchor
        logger.debug('[usePhotoCardInteraction] NAVIGATING to group (From Search with Anchor):', photo.groupId);
        e.stopPropagation();
        e.preventDefault();
        handleGroupNavigate(photo.groupId!, photo.id);
        return;
      }
    }

    logger.debug('[usePhotoCardInteraction] OPENING Lightbox');
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
