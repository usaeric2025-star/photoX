import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Photo, Category, Manufacturer } from '../../types';
import { GalleryVariant } from '@/types/variant';
import { Layers, Heart, Check, EyeOff } from 'lucide-react';
import { getTranslatedCategoryName, isUncategorizedName, TranslationType, getCacheBustedImageUrl } from '../../lib/ui-helpers';
import { safeArray } from '../../utils/safeAccess';
import { useGalleryStore, useShallow } from '../../store';
import { ResponsivePhoto } from '../shared/ResponsivePhoto';
import { usePhotoActions } from '@/contexts/PhotoActionsContext';
import { useCategoriesQuery, useManufacturersQuery, usePermission, useTagsQuery } from '../../hooks';
import { translations } from '../../lib/translations';

export interface PhotoCardProps {
  variant: GalleryVariant;
  photo: Photo;
  index: number;
  showGroupsCollapsed: boolean;
  onGroupClick?: (groupId: string, photoId?: string) => void;
  onLightboxOpen: (photo: Photo) => void;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  hideDetails?: boolean;
}

const PhotoStatusBadges: React.FC<{ photo: Photo; variant: GalleryVariant }> = React.memo(({ photo, variant }) => {
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  return (
    <div className="absolute top-1 left-1 z-10 flex gap-0.5 flex-col pointer-events-none">
      {photo.group_id && photo.member_count !== undefined && photo.member_count > 1 && (
        <div className={
          isManagement
            ? "bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-lg text-[9px] text-white font-bold flex items-center gap-1 border border-white/20 shadow-sm pointer-events-none"
            : "bg-black/40 backdrop-blur-[4px] px-2 py-0.5 rounded-md text-[9px] text-white font-bold flex items-center gap-1 border border-white/10 pointer-events-none"
        }>
          <Layers size={isManagement ? 10 : 9} strokeWidth={2.5} />
          {photo.member_count}
        </div>
      )}
      {isManagement && photo.is_pinned && (
        <div className="bg-amber-500 text-white px-1 py-0.5 rounded text-[7px] font-bold flex items-center gap-0.5 border border-white/10 shadow-sm pointer-events-none">
          <Heart size={8} className="fill-current" />
        </div>
      )}
    </div>
  );
});
PhotoStatusBadges.displayName = 'PhotoStatusBadges';

const SelectionOverlay: React.FC<{ isSelected: boolean }> = React.memo(({ isSelected }) => (
  <div className={`absolute top-0 left-0 w-full h-full transition-all duration-300 flex items-center justify-center p-3 sm:p-4 pointer-events-none z-10 ${isSelected ? 'bg-blue-500/10' : 'bg-transparent'}`}>
     <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex items-center justify-center pointer-events-none ${isSelected ? 'bg-blue-600 border-white shadow-xl scale-110' : 'bg-white/40 border-white/60 shadow-sm opacity-0 md:group-hover:opacity-100'}`}>
        {isSelected && <Check size={16} className="text-white" />}
     </div>
  </div>
));
SelectionOverlay.displayName = 'SelectionOverlay';

const PhotoInfoFooter: React.FC<{ 
  displayCatName: string; 
  isUncategorized: boolean; 
  photoTags: string[];
  hideTags?: boolean;
}> = React.memo(({ displayCatName, isUncategorized, photoTags, hideTags }) => (
  <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none h-[40%] flex flex-col justify-end items-start gap-1">
     {!isUncategorized && displayCatName && (
      <p className="text-[13px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] leading-none truncate flex-shrink-0 w-full mb-0.5 tracking-tight px-0.5">
        {displayCatName}
      </p>
    )}
    {!hideTags && photoTags.length > 0 && (
      <div className="flex flex-nowrap gap-1 w-full overflow-x-auto pointer-events-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-0.5 pb-0.5 mt-auto">
        {photoTags.map((tag, i) => (
          <span 
            key={i} 
            className="shrink-0 text-[7.5px] text-white/95 font-bold px-1 py-[2px] bg-white/20 backdrop-blur-md rounded-[3px] border border-white/20 leading-none shadow-sm uppercase tracking-wide"
          >
            {tag}
          </span>
         ))}
       </div>
    )}
  </div>
));
PhotoInfoFooter.displayName = 'PhotoInfoFooter';

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const PhotoCard: React.FC<PhotoCardProps> = React.memo(({ 
  variant, photo, index, showGroupsCollapsed,
  onGroupClick, 
  onLightboxOpen, 
  className = '', onClick,
  hideDetails = false
}) => {
  const isSelected = useGalleryStore(s => (s.selectedIds ?? []).includes(photo.id));

  const { 
    isMultiSelect, setIsMultiSelect, setSelectedIds,
    appLang: lang
  } = useGalleryStore(useShallow(s => ({
    isMultiSelect: s.isMultiSelect,
    setIsMultiSelect: s.setIsMultiSelect,
    setSelectedIds: s.setSelectedIds,
    appLang: s.appLang
  })));

  const { onTogglePinned, onToggleHidden } = usePhotoActions();

  const t = translations[lang as keyof typeof translations] || translations.zh;

  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();
  
  const tagMap = useMemo(() => 
    tags.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {} as Record<string, string>),
    [tags]
  );
  const { can } = usePermission();

  const enable = useCallback(() => {
    setIsMultiSelect(true);
    setSelectedIds([photo.id]);
  }, [setIsMultiSelect, setSelectedIds, photo.id]);

  const toggle = useCallback(() => {
    const store = useGalleryStore.getState();
    const current = store.selectedIds ?? [];
    const isCurrentlySelected = current.includes(photo.id);
    
    // If showGroupsCollapsed is true and we're dealing with a group, we should select by group members if we have the list
    let idsToToggle = [photo.id];
    // Removed automatic group member selection because store.photos is no longer available in Zustand
    // Future implementation: Provide current visible photo list via Context to PhotoCard
    
    let next: string[];
    if (isCurrentlySelected) {
      // Remove all ids in the group
      next = current.filter((id: string) => !idsToToggle.includes(id));
    } else {
      // Add all ids in the group, ensuring uniqueness
      next = Array.from(new Set([...current, ...idsToToggle]));
    }
    
    setSelectedIds(next);
  }, [setSelectedIds, photo.id, photo.group_id, showGroupsCollapsed]);

  const handleOpenLightbox = useCallback(() => {
    onLightboxOpen(photo);
  }, [photo, onLightboxOpen]);
    
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      return;
    }

    const isManagement = variant === 'full-management' || variant === 'staff-workspace';
    if (isManagement) {
      if (isMultiSelect && !e.shiftKey) {
        toggle();
      } else if (showGroupsCollapsed && photo.group_id && onGroupClick) {
        onGroupClick(photo.group_id, photo.id);
      } else {
        handleOpenLightbox();
      }
    } else {
      if (showGroupsCollapsed && photo.group_id && onGroupClick) {
        onGroupClick(photo.group_id, photo.id);
      } else {
        handleOpenLightbox();
      }
    }
  }, [variant, isMultiSelect, toggle, photo.id, photo.group_id, onGroupClick, handleOpenLightbox, showGroupsCollapsed, onClick]);

  const handleLongPress = useCallback(() => {
    const isManagement = variant === 'full-management' || variant === 'staff-workspace';
    if (!isManagement || !can('photo:edit')) return;
    if (!isMultiSelect) {
      enable();
    } else {
      toggle();
    }
  }, [variant, isMultiSelect, enable, toggle, can]);

  const displayCatName = useMemo(() => 
    getTranslatedCategoryName(photo.category_id, categories, lang, t),
    [photo.category_id, categories, lang, t]
  );

  const isUncategorized = useMemo(() => {
    const catId = photo.category_id;
    return isUncategorizedName(displayCatName, t, catId);
  }, [displayCatName, t, photo.category_id]);
  
  const photoTags = useMemo(() => {
    const rawTagIds = safeArray<string | number>(photo.tag_ids);
    if (!rawTagIds || rawTagIds.length === 0) return [];
    return rawTagIds
      .map(tid => tagMap[String(tid)])
      .filter(Boolean)
      .map(toTitleCase);
  }, [photo.tag_ids, tagMap]);

  const thumbSrc = useMemo(() => 
    getCacheBustedImageUrl(photo, 'thumb'),
    [photo.thumbnail_sm_url, photo.image_url, photo.uri, photo.updated_at, photo.created_at]
  );

  const is_hidden = useMemo(() => !!photo.is_hidden, [photo.is_hidden]);
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';

  const cardSelectedClasses = isManagement
    ? (isMultiSelect && isSelected 
        ? 'ring-[3px] ring-blue-500 scale-[0.98] shadow-lg z-10' 
        : 'md:hover:scale-[1.02] active:scale-[0.95]')
    : 'active:scale-[0.95]'; // Public card: No zoom on hover as specified by the instructions

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = useRef(false);
  const isTouchRef = useRef(false);

  const startPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const isManagement = variant === 'full-management' || variant === 'staff-workspace';
    if (!isManagement || !can('photo:edit')) return;
    if (e.type === 'touchstart') {
      isTouchRef.current = true;
    } else if (isTouchRef.current && e.type === 'mousedown') {
      return; 
    }

    isLongPressedRef.current = false;

    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }

    pressTimerRef.current = setTimeout(() => {
      handleLongPress();
      isLongPressedRef.current = true;
      if ('vibrate' in navigator) navigator.vibrate(50);
    }, 500); 
  }, [variant, handleLongPress]);

  const cancelPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const isManagement = variant === 'full-management' || variant === 'staff-workspace';
    if (!isManagement) return;
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, [variant]);

  const shouldEagerLoad = index < 10;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const isManagement = variant === 'full-management' || variant === 'staff-workspace';
    if (isManagement) {
      handleLongPress();
    } else {
      // share logic moved inside or use feedback hook
    }
    if ('vibrate' in navigator) navigator.vibrate(50);
  }, [variant, handleLongPress, photo.id]);

  const handleTogglePinnedClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePinned) {
      onTogglePinned(photo);
    }
  }, [onTogglePinned, photo]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    const isManagement = variant === 'full-management' || variant === 'staff-workspace';
    if (isManagement) {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }

      if (isLongPressedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        isLongPressedRef.current = false;
        return;
      }
    }

    handleClick(e);
  }, [variant, handleClick]);

  const imgClassName = useMemo(() => {
    const isManagement = variant === 'full-management' || variant === 'staff-workspace';
    if (isManagement) {
      return `${isMultiSelect && isSelected ? 'opacity-40 grayscale-[0.5]' : ''} ${is_hidden ? 'opacity-70' : ''}`;
    }
    return '';
  }, [variant, isMultiSelect, isSelected, is_hidden]);

  const containerClasses = useMemo(() => {
    const isManagement = variant === 'full-management' || variant === 'staff-workspace';
    const base = "aspect-square overflow-hidden cursor-pointer relative shadow-sm transition-all duration-300 md:hover:shadow-md group";
    const bg = isManagement ? 'bg-slate-50 rounded-lg' : 'bg-slate-100 rounded-xl';
    const border = isManagement && is_hidden ? 'ring-[3px] ring-yellow-200 shadow-md' : '';
    return `${base} ${bg} ${cardSelectedClasses} ${border} ${className}`;
  }, [variant, is_hidden, cardSelectedClasses, className]);

  return (
    <div 
      onContextMenu={handleContextMenu}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onTouchCancel={cancelPress}
      onClick={handleCardClick}
      className={containerClasses}
    >
      <ResponsivePhoto
        photo={photo}
        variant="sm"
        aspectRatio={1}
        imgClassName={imgClassName}
      />

      {isManagement && isMultiSelect && <SelectionOverlay isSelected={isSelected} />}
      {isManagement && is_hidden && !isMultiSelect && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-10">
          <EyeOff size={24} className="text-white/60 drop-shadow" />
        </div>
      )}
      
      <PhotoStatusBadges photo={photo} variant={variant} />

      {isManagement && can('photo:toggle-pinned') && onTogglePinned && (
         <button 
           onClick={handleTogglePinnedClick}
           className={`absolute top-1 right-2 bg-black/50 p-1 rounded-full text-white ${photo.is_pinned ? 'text-red-500' : ''} z-20 hover:scale-115 active:scale-95 transition-transform`}
         >
           <Heart size={12} className={photo.is_pinned ? 'fill-current' : ''} />
         </button>
      )}

      <PhotoInfoFooter 
        displayCatName={displayCatName} 
        isUncategorized={isUncategorized} 
        photoTags={photoTags}
        hideTags={hideDetails}
      />
    </div>
  );
});

PhotoCard.displayName = 'PhotoCard';
