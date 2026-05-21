import React, { useMemo, useCallback } from 'react';
import { Photo, Category, Manufacturer } from '../../types';
import { Layers, Heart, Check, Image as ImageIcon, EyeOff } from 'lucide-react';
import { getTranslatedCategoryName, getManufacturerName, isUncategorizedName, TranslationType, getCacheBustedImageUrl } from '../../lib/ui-helpers';
import { safeArray } from '../../utils/safeAccess';
import { thumbHashToDataURL } from '../../utils/thumbHash';
import { useMultiSelect } from '../../hooks/useMultiSelect';

const loadedImagesCache = new Set<string>();

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
  onLightboxOpen: (index: number, photos: Photo[]) => void;
  shareSinglePhoto: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  displayPhotos: Photo[];
}

const PhotoStatusBadges: React.FC<{ photo: Photo }> = ({ photo }) => {
  const isHidden = !!(photo.is_hidden || (photo as any).isHidden);
  return (
    <div className="absolute top-1 left-1 z-10 flex gap-0.5 flex-col pointer-events-none">
      {photo.groupId && (
        <div className="bg-black/50 px-1 py-0.5 rounded text-[7px] text-white font-bold flex items-center gap-0.5 border border-white/10 uppercase pointer-events-none">
          <Layers size={8} />
          {photo.groupId.slice(-4)}
        </div>
      )}
      {photo.isPinned && (
        <div className="bg-amber-500 text-white px-1 py-0.5 rounded text-[7px] font-bold flex items-center gap-0.5 border border-white/10 uppercase shadow-sm pointer-events-none">
          <span>置頂</span>
        </div>
      )}
      {isHidden && (
        <div className="bg-orange-500 text-white px-1 py-0.5 rounded text-[7px] font-bold flex items-center gap-0.5 border border-white/10 uppercase shadow-sm pointer-events-none">
          <EyeOff size={8} />
          <span>隐藏</span>
        </div>
      )}
    </div>
  );
};

const SelectionOverlay: React.FC<{ isSelected: boolean }> = ({ isSelected }) => (
  <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center p-3 sm:p-4 pointer-events-none ${isSelected ? 'bg-blue-500/10' : 'bg-transparent'}`}>
     <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex items-center justify-center pointer-events-none ${isSelected ? 'bg-blue-600 border-white shadow-xl scale-110' : 'bg-white/40 border-white/60 shadow-sm opacity-0 md:group-hover:opacity-100'}`}>
        {isSelected && <Check size={16} className="text-white sm:size-20" />}
     </div>
  </div>
);

const PhotoInfoFooter: React.FC<{ 
  displayCatName: string; 
  isUncategorized: boolean; 
  photoTags: string[] 
}> = ({ displayCatName, isUncategorized, photoTags }) => (
  <div className="absolute bottom-0 left-0 w-full p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
     {!isUncategorized && displayCatName && (
      <p className="text-[11px] font-bold tracking-tight text-white drop-shadow-lg mb-0.5 truncate">
        {displayCatName}
      </p>
    )}
    {photoTags.length > 0 && (
      <div className="w-full flex flex-nowrap gap-0.5 items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {photoTags.slice(0, 3).map((tagName, idx) => (
          <span key={idx} className="bg-black/30 text-white text-[9px] px-1.5 rounded font-medium whitespace-nowrap">
            {tagName}
          </span>
        ))}
        {photoTags.length > 3 && <span className="text-[9px] text-white/70 px-1">...</span>}
      </div>
    )}
  </div>
);

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const AdminPhotoCard: React.FC<AdminPhotoCardProps> = React.memo(({ 
  photo, index, showGroupsCollapsed,
  lang, t, categories, manufacturers, tagMap, onEditPhoto, onGroupClick, 
  onLightboxOpen, shareSinglePhoto, onTogglePinned, onToggleHidden,
  displayPhotos
}) => {
  const { isMultiSelect, selectedIds, enable, toggle } = useMultiSelect();
  const isSelected = selectedIds.includes(photo.id);

  const displayPhotosRef = React.useRef(displayPhotos);
  React.useEffect(() => {
    displayPhotosRef.current = displayPhotos;
  }, [displayPhotos]);

  const handleOpenLightbox = useCallback(() => {
    const currentPhotos = displayPhotosRef.current;
    const realIndex = currentPhotos.findIndex((p) => p?.id === photo.id);
    if (realIndex !== -1) {
      onLightboxOpen(realIndex, currentPhotos);
    } else {
      onLightboxOpen(index, currentPhotos);
    }
  }, [photo.id, index, onLightboxOpen]);
    
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isMultiSelect && !e.shiftKey) {
      toggle(photo.id);
    } else if (photo.groupId && onGroupClick) {
      onGroupClick(photo.groupId, photo.id);
    } else {
      handleOpenLightbox();
    }
  }, [isMultiSelect, toggle, photo.id, photo.groupId, onGroupClick, handleOpenLightbox]);

  const handleLongPress = useCallback(() => {
    if (!isMultiSelect) {
      enable(photo.id);
    } else {
      toggle(photo.id);
    }
  }, [isMultiSelect, enable, toggle, photo.id]);

  const displayCatName = useMemo(() => 
    getTranslatedCategoryName(photo.categoryId || photo.category_id, categories, lang, t),
    [photo.categoryId, photo.category_id, categories, lang, t]
  );

  const isUncategorized = useMemo(() => {
    const catId = photo.categoryId || photo.category_id;
    return isUncategorizedName(displayCatName, t, catId);
  }, [displayCatName, t, photo.categoryId, photo.category_id]);
  
  const photoTags = useMemo(() => {
    const rawTagIds = safeArray<string | number>(photo.tagIds);
    if (!rawTagIds || rawTagIds.length === 0) return [];
    return rawTagIds
      .map(tid => tagMap[String(tid)])
      .filter(Boolean)
      .map(toTitleCase);
  }, [photo.tagIds, tagMap]);

  const thumbSrc = useMemo(() => 
    getCacheBustedImageUrl(photo, 'thumb'),
    [photo.thumb_url, photo.image_url, photo.uri, photo.updatedAt, photo.createdAt]
  );

  const isHidden = useMemo(() => !!(photo.is_hidden || (photo as any).isHidden), [photo.is_hidden, (photo as any).isHidden]);

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
      return; // Ignore simulated mouse events on touch screens
    }

    isLongPressedRef.current = false;

    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }

    pressTimerRef.current = setTimeout(() => {
      handleLongPress();
      isLongPressedRef.current = true;
      if ('vibrate' in navigator) navigator.vibrate(50);
    }, 500); // stable 500ms duration
  }, [handleLongPress]);

  const cancelPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const [initiallyLoaded] = React.useState(() => loadedImagesCache.has(photo.id));
  const [isImageLoaded, setIsImageLoaded] = React.useState(initiallyLoaded);
  const [isImageError, setIsImageError] = React.useState(false);

  const placeholderDataUrl = useMemo(() => thumbHashToDataURL(photo.thumb_hash), [photo.thumb_hash]);

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

    // If it was a long press, block the regular click action (lightbox/group view open)
    if (isLongPressedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressedRef.current = false;
      return;
    }

    handleClick(e);
  }, [handleClick]);

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
      className={`aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer relative shadow-sm transition-all duration-300 group ${cardSelectedClasses} ${isHidden ? 'ring-2 ring-yellow-400/50' : ''}`}
    >
      {!isImageLoaded && !isImageError && !placeholderDataUrl && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
          <ImageIcon className="text-slate-300 w-8 h-8 opacity-20" />
        </div>
      )}

      {isImageError && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <ImageIcon className="text-slate-300 w-8 h-8 opacity-50" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{t.imageLoadFailed || 'Load Failed'}</span>
        </div>
      )}

      {!isImageError && !isImageLoaded && (
        <img 
          draggable={false}
          src={placeholderDataUrl || photo.thumb_url || ''} 
          alt=""
          loading={shouldEagerLoad ? "eager" : "lazy"}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-filter duration-300 ${placeholderDataUrl ? '' : 'blur-md'}`}
        />
      )}

      <img 
        draggable={false}
        loading={shouldEagerLoad ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        src={thumbSrc} 
        alt={photo.name}
        className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${initiallyLoaded ? '' : isImageLoaded ? 'opacity-100' : 'opacity-0'} ${isMultiSelect && isSelected ? 'opacity-40 grayscale-[0.5]' : ''} ${isHidden ? 'opacity-70' : ''} ${isImageError ? 'hidden' : ''}`}
        onLoad={() => {
          loadedImagesCache.add(photo.id);
          setIsImageLoaded(true);
        }}
        onError={() => {
          setIsImageLoaded(true);
          setIsImageError(true);
        }}
      />

      {isMultiSelect && <SelectionOverlay isSelected={isSelected} />}
      {isHidden && !isMultiSelect && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none">
          <EyeOff size={24} className="text-white/60 drop-shadow" />
        </div>
      )}
      <PhotoStatusBadges photo={photo} />

      {onTogglePinned && (
         <button 
           onClick={handleTogglePinnedClick}
           className={`absolute top-1 right-2 bg-black/50 p-1 rounded-full text-white ${photo.isPinned ? 'text-red-500' : ''} z-10`}
         >
           <Heart size={12} className={photo.isPinned ? 'fill-current' : ''} />
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
