import React, { useRef } from 'react';
import { useLongPress } from '@/hooks/core/useLongPress';
import { useUIStore } from '@/store/useUIStore';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Photo } from '@/types';
import { queryKeys } from '@/lib/query/keys';
import { getGroupById } from '@/services/group/queries';
import { STALE_TIMES } from '@/lib/query/config';

interface UsePhotoCardInteractionProps {
  photo: Photo;
  isManagement: boolean;
  isMultiSelect: boolean;
  showGroupsCollapsed: boolean;
  hasSearchQuery: boolean;
}

export function usePhotoCardInteraction({
  photo,
  isManagement,
  isMultiSelect,
  showGroupsCollapsed,
  hasSearchQuery
}: UsePhotoCardInteractionProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTriggered = useRef(false);
  const resetTimerRef = useRef<number | null>(null);
  
  const toggleSelected = useUIStore((s) => s.toggleSelected);
  const update = useUIStore((s) => s.update);
  const navigate = useRouterSafe().navigate;
  const router = useRouter();
  const queryClient = useQueryClient();

  const startTransition = (callback: () => void) => {
    // @ts-ignore
    if (document.startViewTransition) {
      // @ts-ignore
      document.startViewTransition(callback);
    } else {
      callback();
    }
  };

  const handleOpenLightbox = () => {
    navigate({ to: '.', search: (prev: any) => ({ ...prev, photoId: photo.id } as any) });
  };
    
  const handleGroupNavigate = (gid: string) => {
    const targetPath = isManagement ? `/admin/group/${gid}` : `/group/${gid}`;
    navigate({ to: targetPath, search: (prev: any) => prev });
  };

  const handleMouseEnter = () => {
    if (photo.group_id && showGroupsCollapsed && !hasSearchQuery) {
      const gid = photo.group_id;
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
    if (longPressTriggered.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (isManagement) {
      if (isMultiSelect) {
        e.stopPropagation();
        e.preventDefault();
        toggleSelected(photo.id);
      } else if (photo.group_id && showGroupsCollapsed && !hasSearchQuery) {
        e.stopPropagation();
        e.preventDefault();
        handleGroupNavigate(photo.group_id!);
      } else {
        handleOpenLightbox();
      }
    } else {
      if (photo.group_id && showGroupsCollapsed && !hasSearchQuery) {
        e.stopPropagation();
        e.preventDefault();
        handleGroupNavigate(photo.group_id!);
      } else {
        handleOpenLightbox();
      }
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
