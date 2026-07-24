import { patch } from '#lib/store/index.js';
import React, { useRef } from 'react';
import { useLongPress } from '#src/hooks/core/index.js';
import { PhotoListItem } from '#shared/apiContractSchema.js';
import { useFilters } from '#src/hooks/ui/useUI.js';
import { useAppLocation } from '#src/hooks/core/index.js';
import { useIsMultiSelect, useSelectionActions, useIsExitingSelection } from '#src/hooks/index.js';
import { usePermission } from '#src/hooks/index.js';
import { logger } from '#lib/logger.js';

interface UsePhotoCardInteractionProps {
  photo: PhotoListItem;
  isManagement: boolean;
  isMultiSelect: boolean;
  showGroupsCollapsed: boolean;
  hasSearchQuery: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * usePhotoCard
 * 
 * 處理照片卡片的交互邏輯（點擊、長按、多選、進入群組、進入燈箱）。
 */
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
  const { can } = usePermission();
  const canBatchEdit = can('photo:batch-edit');
  
  const { toggleSelect } = useSelectionActions();
  
  const [location, setLocation] = useAppLocation();

  const handleOpenLightbox = () => {
    logger.debug('[usePhotoCard] handleOpenLightbox for photo:', photo.id);
    setLocation(`/photo/${photo.id}`);
  };
    
  const handleGroupNavigate = (gid: string) => {
    if (isManagement) {
      setLocation(`/admin/group/${gid}`);
    } else {
      setLocation(`/group/${gid}`);
    }
  };

  const isExiting = useIsExitingSelection();

  const handleCardClick = (e: React.MouseEvent) => {
    logger.debug('[usePhotoCard] CLICKED photo:', photo.id, { isManagement, isMultiSelect, hasSearchQuery });
    
    if (isExiting) {
      logger.debug('[usePhotoCard] BLOCKED click during exiting selection lock');
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (longPressTriggered.current) {
      logger.debug('[usePhotoCard] BLOCKED click by long press');
      longPressTriggered.current = false;
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

    const isAlreadyOnGroupPage = location.includes('/group/');
    const shouldGoToGroup = photo.groupId && showGroupsCollapsed && !isAlreadyOnGroupPage && !hasSearchQuery;
    
    if (shouldGoToGroup) {
      logger.debug('[usePhotoCard] NAVIGATING to group:', photo.groupId);
      e.stopPropagation();
      e.preventDefault();
      handleGroupNavigate(photo.groupId!);
      return;
    }

    if (onClick) {
      onClick(e);
    } else {
      logger.debug('[usePhotoCard] OPENING Lightbox');
      handleOpenLightbox();
    }
  };

  const longPress = useLongPress<HTMLDivElement>({
    delay: 450,
    onLongPress: () => {
      longPressTriggered.current = true;

      if (canBatchEdit) {
        toggleSelect(photo.id);
        if ('vibrate' in navigator) navigator.vibrate(50);
      } else {
        patch({ showWhatsAppChoice: true, pendingPhotoId: photo.id });
      }
    }
  });

  return {
    cardRef: longPress.ref,
    handleCardClick,
    handleOpenLightbox,
    longPressHandlers: longPress
  };
}
