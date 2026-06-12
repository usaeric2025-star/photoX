import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import React, { useRef, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLongPress } from '@/hooks/core/useLongPress';
import { supabase } from '@/lib/supabase';
import { photoKeys } from '@/lib/queryKeys';
import { getTranslatedCategoryName } from '@/lib/ui-helpers';
import { useSearch } from '@tanstack/react-router';

import { useTranslation, useIsManagement, usePermission, useCategories } from '@/hooks';
import { PinButton } from './PinButton';
import { PhotoCardInfo } from './PhotoCardInfo';
import { Photo, Category, Tag } from '../../types';
import { Layers, Heart, Check, EyeOff } from 'lucide-react';
import { getCacheBustedImageUrl, getPhotoDisplayName } from '../../lib/ui-helpers';
import { getSafeText } from '@/lib/ai/safeText';
import { ResponsivePhoto } from '../shared/ResponsivePhoto';

import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { getDisplayGroupCode } from '@/services/photo/utils';

import { cn } from '@/lib/utils';
import { translations } from '@/lib/translations';
import { useUIStore, useColumns } from '@/store/useUIStore';
import { PhotoStatusBadges } from './PhotoStatusBadges';

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

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * @remarks
 * 虛擬滾動容器內嚴禁 auto-animate ref，僅允許 CSS 過渡.
 * Any animation requiring React state or refs that triggers setStates inside
 * the virtualizer loop will cause infinite update depth loop.
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
  const toggleSelected = useUIStore((s) => s.toggleSelected);
  const update = useUIStore((s) => s.update);
  const [columns] = useColumns();
  const navigate = useRouterSafe().navigate;
  
  const resolvedImgVariant = imgVariant || (columns <= 3 ? 'md' : 'sm');
  
  
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTriggered = useRef(false);
  const resetTimerRef = useRef<number | null>(null);
  const isManagement = useIsManagement();
  const { lang, uiTranslations: t } = useTranslation();
  
  // Use shared categories from parent to avoid per-card hook overhead
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
        if (text && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(text)) {
           return null;
        }
        return text;
      })                
      .filter(Boolean) as string[];                
  })();

  const displayName = getPhotoDisplayName(photo, categories, lang, t as any);

  // Optimization: Bypass invoking usePermission local hooks for every item when pre-passed
  const { can: permissionCan } = usePermission();
  const actualCanPin = canPin !== undefined ? canPin : permissionCan('photo:toggle-pinned');

  const handleOpenLightbox = () => {
    navigate({ to: '.', search: (prev: any) => ({ ...prev, photoId: photo.id } as any) });
  };
    
  const handleGroupNavigate = (gid: string) => {
    const targetPath = isManagement ? `/admin/group/${gid}` : `/group/${gid}`;
    navigate({ to: targetPath, search: (prev: any) => prev });
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (longPressTriggered.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (onClick) {
      onClick(e);
      return;
    }

    if (isManagement) {
      if (isMultiSelect) {
        e.stopPropagation();
        e.preventDefault();
        toggleSelected(photo.id);
      } else if (photo.group_id && showGroupsCollapsed && !hasSearchQuery) {
        // [RULE-LOCK] Group card in list -> Group detail page
        e.stopPropagation();
        e.preventDefault();
        handleGroupNavigate(photo.group_id!);
      } else {
        // [RULE-LOCK] Regular photo or in group page -> Lightbox
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

  const thumbSrc = getCacheBustedImageUrl(photo, 'thumb');

  const is_hidden = !!photo.is_hidden;

  const isCover = photo.is_group_cover || (photo.group_id && photo.group?.cover_photo_id === photo.id);

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
      onClick={handleClick}
      className={cn(
        "aspect-square overflow-hidden cursor-pointer relative transition-all duration-300 group bg-white rounded-2xl shadow-sm ring-1 ring-slate-100",
        "before:absolute before:inset-0 before:z-30 before:pointer-events-none before:transition-all before:duration-300",
        "md:hover:shadow-xl md:hover:scale-[1.01] active:scale-[0.98]",
        "data-[selected=true]:ring-4 data-[selected=true]:ring-blue-500 data-[selected=true]:scale-[0.96] data-[selected=true]:z-10 data-[selected=true]:shadow-lg",
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
        <div className="absolute inset-0 w-full h-full transition-all duration-300 flex items-center justify-center p-3 sm:p-4 pointer-events-none z-10 bg-blue-500/10">
          <div className={cn(
            "w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex items-center justify-center pointer-events-none shadow-sm",
            isSelected 
              ? "bg-blue-600 border-white shadow-xl scale-110 opacity-100" 
              : "bg-white/40 border-white/60 opacity-60 md:group-hover:opacity-100"
          )}>
            {isSelected && (
              <Check size={16} className="text-white" />
            )}
          </div>
        </div>
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

      {/* Info Overlay Panel */}
      <PhotoCardInfo 
        hideDetails={hideDetails}
        displayCatName={displayCatName}
        photoTags={photoTags}
      />
    </div>
  );
};


