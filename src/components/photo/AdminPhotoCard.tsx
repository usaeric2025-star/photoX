import React, { memo } from 'react';
import { Category, Tag } from '#src/types/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { PhotoCardBase } from './PhotoCardBase.js';
import { PhotoStatusBadges, PhotoCardInfo, PhotoSelectionIndicator } from './PhotoCardParts.js';
import { PinButton } from './PinButton.js';
import { usePermission, usePerformance, useTranslation } from '#src/hooks/index.js';
import { useIsMultiSelect, useIsPhotoSelected } from '#src/hooks/index.js';
import { useGrid } from '#src/context/GridContext.js';
import { useUI } from '#lib/store/index.js';
import { usePhotoCard } from '#src/hooks/photo/usePhotoCard.js';
import { useGroupMutations } from '#src/hooks/group/index.js';
import { Icon } from '#src/components/ui/Icon.js';

interface SetCoverButtonProps {
  photoId: string;
  groupId: string;
  isCover: boolean;
  offsetRight?: boolean;
}

const SetCoverButton = memo(function SetCoverButton({
  photoId,
  groupId,
  isCover,
  offsetRight,
}: SetCoverButtonProps) {
  const { t } = useTranslation();
  const { setCover } = useGroupMutations();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCover.mutate({ groupId, photoId });
  };

  if (isCover) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={t('setAsCover')}
      className={`absolute top-2 p-1.5 sm:p-2 rounded-full border active:scale-95 transition-all duration-200 bg-slate-950/40 text-white border-white/10 md:hover:bg-slate-950/60 shadow-sm ${
        offsetRight ? 'right-11' : 'right-2'
      }`}
    >
      <Icon name="image" size={14} className="stroke-[2.5]" />
    </button>
  );
});

interface AdminPhotoCardProps {
  photo: PhotoListItem;
  onClick?: (e: React.MouseEvent) => void;
  hideDetails?: boolean;
  hideGroupBadge?: boolean;
  showGroupsCollapsed?: boolean;
  hasSearchQuery?: boolean;
  sharedCategories?: Category[];
  sharedTags?: Tag[];
  canPin?: boolean;
  canPinGlobal?: boolean;
  priority?: boolean;
  isGroupDetail?: boolean;
  lang?: string;
}

export const AdminPhotoCard = memo(function AdminPhotoCard({
  photo,
  onClick,
  hideDetails = false,
  hideGroupBadge = false,
  showGroupsCollapsed = true,
  hasSearchQuery = false,
  sharedCategories,
  sharedTags,
  canPin,
  canPinGlobal,
  priority = false,
  isGroupDetail = false,
  lang,
}: AdminPhotoCardProps) {
  const { columns } = useGrid();
  const isMultiSelect = useIsMultiSelect();
  const isPhotoSelected = useIsPhotoSelected(photo.id);
  const { can } = usePermission();
  const { appLang: hookLang } = useTranslation();
  const appLang = (lang as any) || hookLang;
  
  const { cardRef, handleClick, longPressHandlers } = usePhotoCard({
    photo,
    isManagement: true,
    isMultiSelect,
    showGroupsCollapsed,
    hasSearchQuery,
    onClick
  });

  const actualCanPin = canPin !== undefined ? canPin : (canPinGlobal !== undefined ? canPinGlobal : can('photo:toggle-pinned'));

  const isGroupCard = showGroupsCollapsed && photo.groupId && typeof photo.memberCount === 'number' && photo.memberCount > 1;
  const displayCategoryName = photo.categoryDescription?.[appLang] || photo.categoryName || undefined;

  return (
    <PhotoCardBase
      item={photo}
      isSelected={isPhotoSelected}
      isMultiSelect={isMultiSelect}
      imgVariant={columns <= 4 ? 'md' : 'sm'}
      priority={priority}
      onClick={handleClick}
      ref={cardRef}
      onMouseDown={longPressHandlers.onMouseDown}
      onMouseMove={longPressHandlers.onMouseMove}
      onMouseUp={longPressHandlers.onMouseUp}
      onMouseLeave={longPressHandlers.onMouseLeave}
      onTouchStart={longPressHandlers.onTouchStart}
      onTouchMove={longPressHandlers.onTouchMove}
      onTouchEnd={longPressHandlers.onTouchEnd}
      onTouchCancel={longPressHandlers.onTouchCancel}
    >
      {isMultiSelect && (
        <PhotoSelectionIndicator isSelected={isPhotoSelected} />
      )}
      <PhotoStatusBadges 
        photo={photo} 
        hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
        isGroupDetail={isGroupDetail}
      />
      {(actualCanPin && !isMultiSelect) && (
        <PinButton photoId={photo.id} isPinned={!!photo.isPinned} />
      )}
      {isGroupDetail && photo.groupId && !isMultiSelect && (
        <SetCoverButton 
          photoId={photo.id} 
          groupId={photo.groupId} 
          isCover={!!photo.isGroupCover} 
          offsetRight={actualCanPin}
        />
      )}
      <PhotoCardInfo 
        hideDetails={hideDetails}
        categoryName={displayCategoryName}
      />
    </PhotoCardBase>
  );
});
