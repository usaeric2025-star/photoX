import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React, { useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLongPress } from '@/hooks/core/useLongPress';
import { supabase } from '@/lib/supabase';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { useSearch } from '@tanstack/react-router';

import { useTranslation, useIsManagement, usePermission, useCategories } from '@/hooks';
import { PinButton } from './PinButton';
import { PhotoCardInfo } from './PhotoCardInfo';
import { Photo, Category, Tag } from '../../types';
import { Layers, Heart, Check, EyeOff } from 'lucide-react';
import { getCacheBustedImageUrl, getPhotoDisplayName } from '@/services/photo/utils';
import { getSafeText } from '@/services/ai/safeText';
import { ResponsivePhoto } from '../shared/ResponsivePhoto';

import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { getDisplayGroupCode } from '@/services/photo/utils';

import { cn } from '@/lib/utils';
import { translations } from '@/locales';
import { useUIStore, useColumns } from '@/store/useUIStore';
import { PhotoStatusBadges } from './PhotoStatusBadges';
import { usePhotoCardInteraction } from '@/hooks/photo/usePhotoCardInteraction';
import { PhotoSelectionIndicator } from './PhotoSelectionIndicator';

export interface PhotoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  photo: Photo;
  index: number;
  hideDetails?: boolean;
  imgVariant?: 'sm' | 'md';
  hideGroupBadge?: boolean;
  showCoverBadge?: boolean;
  displayCatName?: string;
  photoTags?: string[];
  showGroupsCollapsed?: boolean;
  hasSearchQuery?: boolean;
  /** Optimization: Shared categories for virtual list */
  sharedCategories?: Category[];
  /** Optimization: Shared tags for virtual list */
  sharedTags?: Tag[];
  /** Permission restriction for pin click */
  canPin?: boolean;
  /** External selection management */
  selected?: boolean;
}

/**
 * @remarks
 * 虛擬滾動容器內嚴禁 auto-animate ref，僅允許 CSS 過渡.
 */
export const PhotoCard = ({ 
  photo, index,
  className = '', onClick,
  hideDetails = false,
  imgVariant,
  hideGroupBadge = false,
  displayCatName: propDisplayCatName,
  photoTags: propPhotoTags,
  showGroupsCollapsed = true,
  hasSearchQuery = false,
  showCoverBadge,
  sharedCategories,
  sharedTags,
  canPin,
  selected,
  ...props
}: PhotoCardProps) => {
  const internalIsSelected = useUIStore((s) => s.selectedIds.includes(photo.id));
  const isSelected = selected !== undefined ? selected : internalIsSelected;
  const isMultiSelect = useUIStore((s) => s.isMultiSelect);
  const [columns] = useColumns();
  
  const isManagement = useIsManagement();
  const { lang, uiTranslations: t } = useTranslation();
  
  const { cardRef, handleClick, handleMouseEnter } = usePhotoCardInteraction({
    photo,
    isManagement,
    isMultiSelect,
    showGroupsCollapsed,
    hasSearchQuery
  });

  const categories = sharedCategories || [];
  const categoryId = photo.category_id ? String(photo.category_id) : '';
  const displayCatName = propDisplayCatName ?? getTranslatedCategoryName(categoryId, categories, lang, t);
                 
  const tagsList = sharedTags || [];
  const photoTags = (() => {
    if (propPhotoTags) return propPhotoTags;
    return (photo.tags || [])                
      .map(t => {
        const foundTag = tagsList.find(st => String(st.id) === String(t.id));
        const nameObj = foundTag ? foundTag.name : t.name;
        const text = getSafeText(nameObj, lang);
        if (text && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(text)) return null;
        return text;
      })                
      .filter(Boolean) as string[];                
  })();

  const { can: permissionCan } = usePermission();
  const actualCanPin = canPin !== undefined ? canPin : permissionCan('photo:toggle-pinned');

  const resolvedImgVariant = imgVariant || (columns <= 3 ? 'md' : 'sm');
  const is_hidden = !!photo.is_hidden;
  const isCover = photo.is_group_cover || (photo.group_id && photo.group?.cover_photo_id === photo.id);

  const internalHandleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(e);
      return;
    }
    handleClick(e);
  };

  return (
    <div 
      ref={cardRef}
      data-photo-id={photo.id}
      data-selected={isSelected}
      data-multiselect={isMultiSelect}
      style={{
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: "manipulation",
        ...props.style
      }}
      onClick={internalHandleClick}
      onMouseEnter={handleMouseEnter}
      className={cn(
        "aspect-square overflow-hidden cursor-pointer relative transition-all duration-300 group bg-white rounded-2xl shadow-sm ring-1 ring-slate-100",
        "before:absolute before:inset-0 before:pointer-events-none before:transition-all before:duration-300",
        "md:hover:shadow-xl md:hover:scale-[1.01] active:scale-[0.98]",
        "data-[selected=true]:ring-4 data-[selected=true]:ring-blue-500 data-[selected=true]:scale-[0.96] data-[selected=true]:shadow-lg",
        is_hidden && "ring-2 ring-slate-400 shadow-slate-300/50 shadow-sm grayscale-[0.3]",
        isCover && showCoverBadge && "ring-2 ring-amber-400 shadow-amber-100/50 shadow-sm",
        className
      )}
      {...props}
    >
      <div 
        className={cn(
          "relative aspect-square w-full h-full pointer-events-none transition-all duration-500",
          "group-data-[selected=true]:opacity-60 group-data-[selected=true]:scale-90 group-data-[selected=true]:rounded-xl overflow-hidden"
        )}
      >
        <ResponsivePhoto
          photo={photo}
          variant={resolvedImgVariant}
          aspectRatio={1}
          imgClassName={cn(
            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
            is_hidden && "opacity-60"
          )}
        />
      </div>

      {isManagement && isMultiSelect && (
        <PhotoSelectionIndicator isSelected={isSelected} />
      )}

      <PhotoStatusBadges 
        photo={photo} 
        isPinned={!!photo.is_pinned} 
        hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
        showCoverBadge={showCoverBadge}
      />

      {isManagement && actualCanPin && (
         <PinButton photoId={photo.id} isPinned={!!photo.is_pinned} />
      )}

      <PhotoCardInfo 
        hideDetails={hideDetails}
        displayCatName={displayCatName}
        photoTags={photoTags}
      />
    </div>
  );
};


