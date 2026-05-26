import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Photo, Category, Manufacturer } from '../../types';
import { GalleryVariant } from '@/types/variant';
import { Layers, Heart, Check, EyeOff } from 'lucide-react';
import { getTranslatedCategoryName, isUncategorizedName, TranslationType, getCacheBustedImageUrl } from '../../lib/ui-helpers';
import { safeArray } from '../../utils/safeAccess';
import { ResponsivePhoto } from '../shared/ResponsivePhoto';
import { useCategoriesQuery, useManufacturersQuery, usePermission, useTagsQuery } from '../../hooks';
import { useStore, useShallow } from '../../store';
import { usePhotoActions } from '@/contexts/PhotoActionsContext';
import { translations } from '../../lib/translations';
import { useInteractionBridge } from '../virtualizer/useInteractionBridge';
import { interactionBus } from '@/lib/interactionBus';

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

const PhotoStatusBadges: React.FC<{ photo: Photo; variant: GalleryVariant; photoCount: number }> = React.memo(({ photo, variant, photoCount }) => {
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  return (
    <div className="absolute top-1 left-1 z-10 flex gap-0.5 flex-col pointer-events-none">
      {photo.group_id && photoCount > 1 && (
        <div className={
          isManagement
            ? "bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-lg text-[9px] text-white font-bold flex items-center gap-1 border border-white/20 shadow-sm pointer-events-none"
            : "bg-black/40 backdrop-blur-[4px] px-2 py-0.5 rounded-md text-[9px] text-white font-bold flex items-center gap-1 border border-white/10 pointer-events-none"
        }>
          <Layers size={isManagement ? 10 : 9} strokeWidth={2.5} />
          {photoCount}
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
    <div className="h-[38px] w-full flex flex-col justify-end items-start gap-0.5" style={{ alignContent: 'end' }}>
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
  </div>
));
PhotoInfoFooter.displayName = 'PhotoInfoFooter';

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
export const PhotoCard: React.FC<PhotoCardProps> = React.memo(({ 
  variant, photo, index, showGroupsCollapsed,
  onGroupClick, 
  onLightboxOpen, 
  className = '', onClick,
  hideDetails = false
}) => {
  const { setters } = useInteractionBridge();
  const cardRef = useRef<HTMLDivElement>(null);
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';

  // Initial values for the first render to avoid flicker
  const initialIsSelected = interactionBus.current.selectedIds.has(photo.id);
  const initialIsMultiSelect = interactionBus.current.isMultiSelect;

  // Subscription for zero-re-render UI updates
  useEffect(() => {
    if (!cardRef.current) return;

    const unsubscribe = interactionBus.subscribe((state) => {
      if (!cardRef.current) return;
      const isSelected = state.selectedIds.has(photo.id);
      
      // Update DOM directly to avoid React re-render overhead in the grid
      if (cardRef.current.dataset.selected !== String(isSelected)) {
        cardRef.current.dataset.selected = String(isSelected);
      }
      if (cardRef.current.dataset.multiselect !== String(state.isMultiSelect)) {
        cardRef.current.dataset.multiselect = String(state.isMultiSelect);
      }
    });

    return () => { unsubscribe(); };
  }, [photo.id]);

  // Ensure consistent count access
  const photoCount = photo.member_count ?? 1;

  const { onTogglePinned } = usePhotoActions();

  const { appLang } = useStore(useShallow(s => ({ appLang: s.appLang })));
  const t = translations[appLang] || translations.zh;

  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();
  
  const tagMap = useMemo(() => 
    tags.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {} as Record<string, string>),
    [tags]
  );
  const { can } = usePermission();

  const handleOpenLightbox = useCallback(() => {
    onLightboxOpen(photo);
  }, [photo, onLightboxOpen]);
    
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      return;
    }

    const { isMultiSelect } = interactionBus.current;

    if (isManagement) {
      if (isMultiSelect && !e.shiftKey) {
        setters.toggleSelected(photo.id);
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
  }, [isManagement, setters, photo.id, showGroupsCollapsed, photo.group_id, onGroupClick, handleOpenLightbox, onClick]);

  const handleLongPress = useCallback(() => {
    if (!isManagement || !can('photo:edit')) return;
    const { isMultiSelect } = interactionBus.current;
    if (!isMultiSelect) {
      setters.setIsMultiSelect(true);
      setters.setSelectedIds(new Set([photo.id]));
    } else {
      setters.toggleSelected(photo.id);
    }
  }, [isManagement, can, setters, photo.id]);

  const displayCatName = useMemo(() => 
    getTranslatedCategoryName(photo.category_id, categories, appLang, t),
    [photo.category_id, categories, appLang, t]
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

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = useRef(false);
  const isTouchRef = useRef(false);

  const startPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
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
    if (!isManagement) return;
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, [variant]);

  const shouldEagerLoad = index < 10;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
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
  }, [isManagement, handleClick]);

  return (
    <div 
      ref={cardRef}
      data-photo-id={photo.id}
      data-selected={initialIsSelected}
      data-multiselect={initialIsMultiSelect}
      onContextMenu={handleContextMenu}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onTouchCancel={cancelPress}
      onClick={handleCardClick}
      className={`
        aspect-square overflow-hidden cursor-pointer relative shadow-sm transition-all duration-300 md:hover:shadow-md group bg-slate-50 rounded-lg 
        data-[selected=true]:ring-[3px] data-[selected=true]:ring-blue-500 data-[selected=true]:scale-[0.98] data-[selected=true]:shadow-lg data-[selected=true]:z-10
        ${isManagement ? 'md:hover:scale-[1.02] active:scale-[0.95]' : 'active:scale-[0.95]'}
        ${isManagement && is_hidden ? 'ring-[3px] ring-yellow-200 shadow-md' : ''}
        ${className}
      `}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '300px' }}
    >
      <div className="w-full h-full pointer-events-none group-data-[selected=true]:opacity-40 group-data-[selected=true]:grayscale-[0.5]">
        <ResponsivePhoto
          photo={photo}
          variant="sm"
          aspectRatio={1}
          imgClassName={`w-full h-full object-cover aspect-square ${is_hidden ? 'opacity-70' : ''}`}
        />
      </div>

      {isManagement && (
        <div className="hidden group-data-[multiselect=true]:flex absolute top-0 left-0 w-full h-full transition-all duration-300 items-center justify-center p-3 sm:p-4 pointer-events-none z-10 group-data-[selected=true]:bg-blue-500/10">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex items-center justify-center pointer-events-none bg-white/40 border-white/60 shadow-sm opacity-0 md:group-hover:opacity-100 group-data-[selected=true]:bg-blue-600 group-data-[selected=true]:border-white group-data-[selected=true]:shadow-xl group-data-[selected=true]:scale-110 group-data-[selected=true]:opacity-100">
            <div className="hidden group-data-[selected=true]:block">
              <Check size={16} className="text-white" />
            </div>
          </div>
        </div>
      )}

      {isManagement && is_hidden && (
        <div className="group-data-[multiselect=true]:hidden absolute inset-0 bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-10">
          <EyeOff size={24} className="text-white/60 drop-shadow" />
        </div>
      )}
      
      <PhotoStatusBadges photo={photo} variant={variant} photoCount={photoCount} />

      {isManagement && can('photo:toggle-pinned') && onTogglePinned && (
         <button 
           onClick={handleTogglePinnedClick}
           className="absolute top-1 right-2 bg-black/50 p-1 rounded-full text-white group-data-[pinned=true]:text-red-500 z-20 hover:scale-115 active:scale-95 transition-transform"
           data-pinned={photo.is_pinned}
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
