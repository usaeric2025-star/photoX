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
  const { navigate, location } = useRouterSafe();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setPhotoId } = useFilters();

  const handleOpenLightbox = () => {
    logger.debug('[usePhotoCardInteraction] handleOpenLightbox for photo:', photo.id);
    setPhotoId(photo.id);
  };
    
  const handleGroupNavigate = (gid: string) => {
    const targetPath = isManagement ? `/admin/group/${gid}` : `/group/${gid}`;
    navigate({ to: targetPath, search: (prev: any) => prev });
  };

  const handleMouseEnter = () => {
    const isAlreadyOnGroupPage = location?.pathname?.includes('/group/');
    if (photo.groupId && showGroupsCollapsed && !hasSearchQuery && !isAlreadyOnGroupPage) {
      const gid = photo.groupId;
      const isAdmin = isManagement;
      // Preload route
      const targetPath = isAdmin ? `/admin/group/${gid}` : `/group/${gid}`;
      router.preloadRoute({ to: targetPath, search: (prev: any) => prev }).catch(() => {});
      
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

    const isAlreadyOnGroupPage = location?.pathname?.includes('/group/');

    if (!isManagement && photo.groupId && showGroupsCollapsed && !hasSearchQuery && !isAlreadyOnGroupPage) {
      logger.debug('[usePhotoCardInteraction] NAVIGATING to group:', photo.groupId);
      e.stopPropagation();
      e.preventDefault();
      handleGroupNavigate(photo.groupId!);
      return;
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
          update({ isMultiSelect: true, selectedIds: [photo.id] } as any);
        } else {
          toggleSelected(photo.id);
        }
        if ('vibrate' in navigator) navigator.vibrate(50);
      } else {
        (window as any)._pendingPhoto = photo;
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
