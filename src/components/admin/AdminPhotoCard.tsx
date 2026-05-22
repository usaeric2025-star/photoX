import React, { useMemo, useCallback } from 'react';
import { Photo, Category, Manufacturer } from '../../types';
import { Layers, Heart, Check, EyeOff } from 'lucide-react';
import { getTranslatedCategoryName, isUncategorizedName, TranslationType, getCacheBustedImageUrl } from '../../lib/ui-helpers';
import { safeArray } from '../../utils/safeAccess';
import { useGalleryStore } from '../../store';
import { PhotoImageContainer } from '../photo/PhotoImageContainer';

interface AdminPhotoCardProps {
  photo: Photo;
  index: number;
  showGroupsCollapsed: boolean;
  lang: string;
  t: TranslationType;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  onEditPhoto?: (id: string) => void;
  onGroupClick?: (groupId: string, photoId?: string) => void;
  onLightboxOpen: (photo: Photo) => void;
  shareSinglePhoto: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
}

const PhotoStatusBadges: React.FC<{ photo: Photo }> = React.memo(({ photo }) => {
  return (
    <div className="absolute top-1 left-1 z-10 flex gap-0.5 flex-col pointer-events-none">
      {photo.group_id && photo.member_count !== undefined && photo.member_count > 1 && (
        <div className="bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-lg text-[9px] text-white font-bold flex items-center gap-1 border border-white/20 shadow-sm pointer-events-none">
          <Layers size={10} strokeWidth={2.5} />
          {photo.member_count}
        </div>
      )}
      {photo.is_pinned && (
        <div className="bg-amber-500 text-white px-1 py-0.5 rounded text-[7px] font-bold flex items-center gap-0.5 border border-white/10 shadow-sm pointer-events-none">
          <Heart size={8} className="fill-current" />
        </div>
      )}
    </div>
  );
});
PhotoStatusBadges.displayName = 'PhotoStatusBadges';

const SelectionOverlay: React.FC<{ isSelected: boolean }> = React.memo(({ isSelected }) => (
  <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center p-3 sm:p-4 pointer-events-none z-10 ${isSelected ? 'bg-blue-500/10' : 'bg-transparent'}`}>
     <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex items-center justify-center pointer-events-none ${isSelected ? 'bg-blue-600 border-white shadow-xl scale-110' : 'bg-white/40 border-white/60 shadow-sm opacity-0 md:group-hover:opacity-100'}`}>
        {isSelected && <Check size={16} className="text-white" />}
     </div>
  </div>
));
SelectionOverlay.displayName = 'SelectionOverlay';

const PhotoInfoFooter: React.FC<{ 
  displayCatName: string; 
  isUncategorized: boolean; 
  photoTags: string[] 
}> = React.memo(({ displayCatName, isUncategorized, photoTags }) => (
  <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none h-[40%] flex flex-col justify-end items-start gap-1">
     {!isUncategorized && displayCatName && (
      <p className="text-[13px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] leading-none truncate flex-shrink-0 w-full mb-0.5 tracking-tight px-0.5">
        {displayCatName}
      </p>
    )}
    {photoTags.length > 0 && (
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

export const AdminPhotoCard: React.FC<AdminPhotoCardProps> = React.memo(({ 
  photo, index, showGroupsCollapsed,
  lang, t, categories, manufacturers, tagMap, onGroupClick, 
  onLightboxOpen, shareSinglePhoto, onTogglePinned, onToggleHidden
}) => {
  const isMultiSelect = useGalleryStore((state) => state.isMultiSelect);
  const isSelected = useGalleryStore((state) => (state.selectedIds ?? []).includes(photo.id));
  const setIsMultiSelect = useGalleryStore((state) => state.setIsMultiSelect);
  const setSelectedIds = useGalleryStore((state) => state.setSelectedIds);
  const setEditingPhotoId = useGalleryStore((state) => state.setEditingPhotoId);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPhotoId(photo.id);
  };

  const enable = useCallback(() => {
    setIsMultiSelect(true);
    setSelectedIds([photo.id]);
  }, [setIsMultiSelect, setSelectedIds, photo.id]);

  const toggle = useCallback(() => {
    const current = (useGalleryStore.getState().selectedIds) ?? [];
    const next = current.includes(photo.id) 
      ? current.filter((i: string) => i !== photo.id) 
      : [...current, photo.id];
    setSelectedIds(next);
  }, [setSelectedIds, photo.id]);

  const handleOpenLightbox = useCallback(() => {
    onLightboxOpen(photo);
  }, [photo, onLightboxOpen]);
    
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isMultiSelect && !e.shiftKey) {
      toggle();
    } else if (showGroupsCollapsed && photo.group_id && onGroupClick) {
      onGroupClick(photo.group_id, photo.id);
    } else {
      handleOpenLightbox();
    }
  }, [isMultiSelect, toggle, photo.id, photo.group_id, onGroupClick, handleOpenLightbox, showGroupsCollapsed]);

  const handleLongPress = useCallback(() => {
    if (!isMultiSelect) {
      enable();
    } else {
      toggle();
    }
  }, [isMultiSelect, enable, toggle]);

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
    [photo.thumb_url, photo.image_url, photo.uri, photo.updated_at, photo.created_at]
  );

  const is_hidden = useMemo(() => !!photo.is_hidden, [photo.is_hidden]);

  const cardSelectedClasses = isMultiSelect && isSelected 
    ? 'ring-[3px] ring-blue-500 scale-[0.98] shadow-lg z-10' 
    : 'md:hover:scale-[1.02] active:scale-[0.95]';

  const pressTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = React.useRef(false);
  const isTouchRef = React.useRef(false);

  const startPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
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
  }, [handleLongPress]);

  const cancelPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const shouldEagerLoad = index < 10;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleLongPress();
    if ('vibrate' in navigator) navigator.vibrate(50);
  }, [handleLongPress]);

  const handleTogglePinnedClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePinned) {
      onTogglePinned(photo);
    }
  }, [onTogglePinned, photo]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
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

    handleClick(e);
  }, [handleClick]);

  const imgClassName = useMemo(() => {
    return `${isMultiSelect && isSelected ? 'opacity-40 grayscale-[0.5]' : ''} ${is_hidden ? 'opacity-70' : ''}`;
  }, [isMultiSelect, isSelected, is_hidden]);

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
      className={`aspect-square bg-slate-50 rounded-lg overflow-hidden cursor-pointer relative shadow-sm transition-all duration-300 md:hover:shadow-md group ${cardSelectedClasses} ${is_hidden ? 'ring-[3px] ring-orange-500 shadow-md' : ''}`}
    >
      <PhotoImageContainer
        photoId={photo.id}
        src={thumbSrc}
        thumbHash={photo.thumb_hash}
        alt={photo.name || 'Photo'}
        loading={shouldEagerLoad ? 'eager' : 'lazy'}
        imgClassName={imgClassName}
      />

      {isMultiSelect && <SelectionOverlay isSelected={isSelected} />}
      {is_hidden && !isMultiSelect && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-10">
          <EyeOff size={24} className="text-white/60 drop-shadow" />
        </div>
      )}
      
      <PhotoStatusBadges photo={photo} />

      {onTogglePinned && (
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
      />
    </div>
  );
});
