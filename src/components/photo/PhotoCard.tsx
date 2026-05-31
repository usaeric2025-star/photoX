import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Photo } from '../../types';
import { GalleryVariant } from '@/types/variant';
import { Layers, Heart, Check, EyeOff } from 'lucide-react';
import { getCacheBustedImageUrl } from '../../lib/ui-helpers';
import { ResponsivePhoto } from '../shared/ResponsivePhoto';
import { usePermission } from '../../hooks';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { useTogglePin } from '@/hooks/core/mutations/useTogglePin';
import { useInteractionBridge } from '../virtualizer/useInteractionBridge';
import { interactionBus } from '@/lib/interactionBus';
import { cn } from '@/lib/utils';
import { translations } from '@/lib/translations';
import { useGalleryStore } from '@/store/galleryStore';

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

const PhotoStatusBadges: React.FC<{ photo: Photo; variant: GalleryVariant; showGroupsCollapsed: boolean }> = React.memo(({ photo, variant, showGroupsCollapsed }) => {
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  
  // Display group info if photo belongs to a group
  const shouldShowGroup = showGroupsCollapsed && photo.group_id;

  const groupCode = photo.group_id ? photo.group_id.slice(-4).toUpperCase() : '';
  const memberCount = photo.group?.member_count ?? 1;

  return (
    <div className="absolute top-1.5 left-1.5 z-10 flex gap-1 flex-col pointer-events-none">
      {shouldShowGroup && (
        <div className="backdrop-blur-md px-1.5 py-0.5 rounded-md text-[10px] text-white font-bold flex items-center gap-1 border border-white/20 shadow-sm bg-blue-600/80">
          <Layers size={10} strokeWidth={2.5} />
          <span>{memberCount}</span>
        </div>
      )}
      {isManagement && photo.is_pinned && (
        <div className="bg-amber-500 text-white px-1 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5 border border-white/10 shadow-sm">
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
  photoTags: string[];
  hideTags?: boolean;
}> = React.memo(({ displayCatName, photoTags, hideTags }) => {
  if (hideTags) return null;
  
  const tagsText = (photoTags && photoTags.length > 0) ? photoTags.join(', ') : '';

  return (
    <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-none p-2 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex flex-col gap-0.5">
            {displayCatName && (
                <span className="text-[10px] text-white/90 font-medium truncate">
                {displayCatName}
                </span>
            )}
            {tagsText && (
                <span className="text-[9px] text-white/70 truncate">
                {tagsText}
                </span>
            )}
        </div>
    </div>
  );
});
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
export const PhotoCard = React.memo(({ 
  variant, photo, index, showGroupsCollapsed,
  onGroupClick, 
  onLightboxOpen, 
  className = '', onClick,
  hideDetails = false
}: PhotoCardProps) => {
  const { setters } = useInteractionBridge();
  const cardRef = useRef<HTMLDivElement>(null);
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  
  const lang = useGalleryStore(s => s.appLang);
  const t = useMemo(() => translations[lang as keyof typeof translations] || translations.en, [lang]);
  
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

  // Ensure consistent group count access
  const photoMemberCount = photo.group?.member_count ?? 1;

  const displayCatName = photo.categoryName || '';
  const photoTags = photo.tagNames || [];

  const adminActions = useAdminActions();
  const togglePinMutation = useTogglePin(photo, adminActions.updatePhoto);

  const { can } = usePermission();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: photo.id,
  });

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
        e.stopPropagation();
        onGroupClick(photo.group_id, photo.id);
      } else {
        handleOpenLightbox();
      }
    } else {
      if (showGroupsCollapsed && photo.group_id && onGroupClick) {
        e.stopPropagation();
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
  }, [isManagement, can]);

  const cancelPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isManagement) return;
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, [isManagement]);

  const shouldEagerLoad = index < 10;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isManagement) {
      handleLongPress();
    } else {
    }
    if ('vibrate' in navigator) navigator.vibrate(50);
  }, [isManagement, handleLongPress]);

  const handleTogglePinnedClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Pin button clicked for photo:', photo.id);
    togglePinMutation.mutate();
  }, [togglePinMutation, photo.id]);

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
      ref={(node) => {
        cardRef.current = node;
        setNodeRef(node);
      }}
      data-photo-id={photo.id}
      data-selected={initialIsSelected}
      data-multiselect={initialIsMultiSelect}
      {...listeners}
      {...attributes}
      style={{
        ... { contentVisibility: 'auto', containIntrinsicSize: '300px' },
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      onContextMenu={handleContextMenu}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onTouchCancel={cancelPress}
      onClick={handleCardClick}
      className={cn(
        "aspect-square overflow-hidden cursor-pointer relative shadow-sm transition-all duration-300 md:hover:shadow-md group bg-slate-50 rounded-lg",
        "data-[selected=true]:ring-[3px] data-[selected=true]:ring-blue-500 data-[selected=true]:scale-[0.98] data-[selected=true]:shadow-lg data-[selected=true]:z-10",
        isManagement ? "md:hover:scale-[1.02] active:scale-[0.95]" : "active:scale-[0.95]",
        isManagement && is_hidden && "ring-[3px] ring-yellow-200 shadow-md",
        className
      )}
    >
      <div className="relative aspect-square w-full h-full pointer-events-none group-data-[selected=true]:opacity-40 group-data-[selected=true]:grayscale-[0.5]" style={{ contentVisibility: 'auto', containIntrinsicSize: '300px' }}>
        <ResponsivePhoto
          photo={photo}
          variant="sm"
          aspectRatio={1}
          imgClassName={`w-full h-full object-cover ${is_hidden ? 'opacity-70' : ''}`}
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
      
      <PhotoStatusBadges photo={photo} variant={variant} showGroupsCollapsed={showGroupsCollapsed} />

      {isManagement && can('photo:toggle-pinned') && (
         <button 
           onClick={handleTogglePinnedClick}
           className="absolute top-1 right-2 bg-black/50 p-1 rounded-full text-white group-data-[pinned=true]:text-red-500 z-20 hover:scale-115 active:scale-95 transition-transform"
           data-pinned={photo.is_pinned ? 'true' : 'false'}
         >
           <Heart size={12} className={photo.is_pinned ? 'fill-current' : ''} />
         </button>
      )}

      <PhotoInfoFooter 
        displayCatName={displayCatName} 
        photoTags={photoTags}
        hideTags={hideDetails}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.photo.id === nextProps.photo.id &&
    prevProps.photo.thumb_hash === nextProps.photo.thumb_hash &&
    prevProps.photo.is_hidden === nextProps.photo.is_hidden &&
    prevProps.photo.is_pinned === nextProps.photo.is_pinned &&
    prevProps.photo.categoryName === nextProps.photo.categoryName &&
    (prevProps.photo.tagNames?.join(',') === nextProps.photo.tagNames?.join(',')) &&
    prevProps.photo.group?.member_count === nextProps.photo.group?.member_count &&
    prevProps.variant === nextProps.variant &&
    prevProps.hideDetails === nextProps.hideDetails &&
    prevProps.showGroupsCollapsed === nextProps.showGroupsCollapsed
  );
});

PhotoCard.displayName = 'PhotoCard';
