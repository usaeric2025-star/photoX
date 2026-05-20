import React, { useMemo, useCallback } from 'react';
import { Photo, Category, Manufacturer } from '../types';
import { X, Layers, Heart, EyeOff, Eye, Check, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { getTranslatedCategoryName, getManufacturerName, isUncategorizedName, TranslationType, getCacheBustedImageUrl } from '../lib/ui-helpers';
import { safeArray } from '../utils/safeAccess';
import { usePermission } from '../hooks/usePermission';
import { thumbHashToDataURL } from '../utils/thumbHash';

const loadedImagesCache = new Set<string>();

interface PhotoCardProps {
  photo: Photo;
  index: number;
  isMultiSelect: boolean;
  isStaffMode: boolean;
  isSelected: boolean;
  showGroupsCollapsed: boolean;
  lang: string;
  t: TranslationType;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  onToggleSelection?: (id: string) => void;
  onEditPhoto?: (id: string) => void;
  onGroupClick?: (groupId: string, photoId?: string) => void;
  onLightboxOpen: (index: number, photos: Photo[]) => void;
  onLongPressStart: (id: string) => void;
  onLongPressEnd: () => void;
  shareSinglePhoto: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
  onToggleHidden?: (photo: Photo) => void;
  displayPhotos: Photo[]; // Add displayPhotos to props
}

const PhotoStatusBadges: React.FC<{ photo: Photo }> = ({ photo }) => (
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
  </div>
);

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

export const PhotoCard: React.FC<PhotoCardProps> = React.memo(({ 
  photo, index, isMultiSelect, isStaffMode, isSelected, showGroupsCollapsed,
  lang, t, categories, manufacturers, tagMap, onToggleSelection, onEditPhoto, onGroupClick, 
  onLightboxOpen, onLongPressStart, onLongPressEnd, shareSinglePhoto, onTogglePinned, onToggleHidden,
  displayPhotos
}) => {
  const { isAdmin } = usePermission();
  const isAdminMode = isAdmin;
  
  const handleOpenLightbox = useCallback(() => {
    const realIndex = displayPhotos.findIndex((p) => p?.id === photo.id);
    if (realIndex !== -1) {
      onLightboxOpen(realIndex, displayPhotos);
    } else {
      onLightboxOpen(index, displayPhotos);
    }
  }, [photo.id, index, displayPhotos, onLightboxOpen]);
    
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isMultiSelect && onToggleSelection && !e.shiftKey) {
      onToggleSelection(photo.id);
    } else if (photo.groupId && onGroupClick) {
      onGroupClick(photo.groupId, photo.id);
    } else {
      handleOpenLightbox();
    }
  }, [isMultiSelect, onToggleSelection, photo.id, photo.groupId, onGroupClick, handleOpenLightbox]);

  const mfrName = useMemo(() => 
    getManufacturerName(photo?.manufacturerId || photo?.sub_category, manufacturers),
    [photo?.manufacturerId, photo?.sub_category, manufacturers]
  );

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

  const cardSelectedClasses = isAdmin && isMultiSelect && isSelected 
    ? 'ring-[3px] ring-blue-500 scale-[0.98] shadow-lg z-10' 
    : 'md:hover:scale-[1.02] active:scale-[0.95]';

  const [initiallyLoaded] = React.useState(() => loadedImagesCache.has(photo.id));
  const [isImageLoaded, setIsImageLoaded] = React.useState(initiallyLoaded);
  const [isImageError, setIsImageError] = React.useState(false);

  const placeholderDataUrl = useMemo(() => thumbHashToDataURL(photo.thumb_hash), [photo.thumb_hash]);

  return (
    <div 
      onContextMenu={(e) => {
        e.preventDefault();
        if (isAdmin) return;
        shareSinglePhoto(photo);
        if ('vibrate' in navigator) navigator.vibrate(50);
      }}
      onMouseDown={() => isAdmin && onLongPressStart(photo.id)}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onTouchStart={() => isAdmin && onLongPressStart(photo.id)}
      onTouchEnd={onLongPressEnd}
      onTouchMove={onLongPressEnd}
      onTouchCancel={onLongPressEnd}
      onClick={handleClick}
      className={`aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer relative shadow-sm transition-all duration-300 group ${cardSelectedClasses} ${photo.is_hidden ? 'ring-2 ring-yellow-400/50' : ''}`}
    >
      {!isImageLoaded && !isImageError && !placeholderDataUrl && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
          <ImageIcon className="text-slate-300 w-8 h-8 opacity-20" />
        </div>
      )}

      {isImageError && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <ImageIcon className="text-slate-300 w-8 h-8 opacity-50" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{t.imageLoadFailed}</span>
        </div>
      )}

      {/* ThumbHash/Placeholder logic */}
      {!isImageError && !isImageLoaded && (
        <img 
          draggable={false}
          src={placeholderDataUrl || photo.thumb_url || ''} 
          alt=""
          loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-filter duration-300 ${placeholderDataUrl ? '' : 'blur-md'}`}
        />
      )}

      <img 
        draggable={false}
        loading="lazy"
        referrerPolicy="no-referrer"
        src={thumbSrc} 
        alt={photo.name}
        className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${initiallyLoaded ? '' : isImageLoaded ? 'opacity-100' : 'opacity-0'} ${isAdmin && isMultiSelect && isSelected ? 'opacity-40 grayscale-[0.5]' : ''} ${photo.is_hidden ? 'opacity-70' : ''} ${isImageError ? 'hidden' : ''}`}
        onLoad={() => {
          loadedImagesCache.add(photo.id);
          setIsImageLoaded(true);
        }}
        onError={() => {
          setIsImageLoaded(true);
          setIsImageError(true);
        }}
      />

      {isAdmin && isMultiSelect && <SelectionOverlay isSelected={isSelected} />}
      <PhotoStatusBadges photo={photo} />

      {isAdmin && onTogglePinned && (
         <button 
           onClick={(e) => {
             e.stopPropagation();
             onTogglePinned(photo);
           }}
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
