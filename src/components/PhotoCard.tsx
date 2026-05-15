import React, { useMemo } from 'react';
import { Photo, Category, Manufacturer } from '../types';
import { X, Layers, Heart, EyeOff, Check, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { getTranslatedCategoryName, getManufacturerName, isUncategorizedName } from '../lib/ui-helpers';
import { safeArray } from '../utils/safeAccess';

interface PhotoCardProps {
  photo: Photo;
  index: number;
  isAdminMode: boolean;
  isMultiSelect: boolean;
  isStaffMode: boolean;
  isSelected: boolean;
  showGroupsCollapsed: boolean;
  lang: string;
  t: Record<string, any>;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  onToggleSelection?: (id: string) => void;
  onEditPhoto?: (id: string) => void;
  onGroupClick?: (groupId: string) => void;
  onLightboxOpen: (index: number) => void;
  onLongPressStart: (id: string) => void;
  onLongPressEnd: () => void;
  shareSinglePhoto: (photo: Photo) => void;
  onTogglePinned?: (photo: Photo) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = React.memo(({ 
  photo, index, isAdminMode, isMultiSelect, isStaffMode, isSelected, showGroupsCollapsed,
  lang, t, categories, manufacturers, tagMap, onToggleSelection, onEditPhoto, onGroupClick, 
  onLightboxOpen, onLongPressStart, onLongPressEnd, shareSinglePhoto, onTogglePinned
}) => {
  const mfrName = useMemo(() => {
    return getManufacturerName(photo.manufacturerId || photo.sub_category, manufacturers);
  }, [photo.manufacturerId, photo.sub_category, manufacturers]);

  const displayCatName = useMemo(() => {
    return getTranslatedCategoryName(photo.categoryId || photo.category_id, categories, lang, t);
  }, [photo.categoryId, photo.category_id, categories, lang, t]);

  const isUncategorized = useMemo(() => {
    const catId = photo.categoryId || photo.category_id;
    return isUncategorizedName(displayCatName, t, catId);
  }, [displayCatName, t, photo.categoryId, photo.category_id]);
  
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const photoTags = useMemo(() => {
    const rawTagIds = safeArray<string | number>(photo.tagIds);
    if (!rawTagIds || rawTagIds.length === 0) return [];
    // Only show tags present in the tagMap
    return rawTagIds
      .map(tid => tagMap[String(tid)])
      .filter(Boolean)
      .map(toTitleCase);
  }, [photo.tagIds, tagMap]);

  const thumbSrc = useMemo(() => {
    const url = photo.thumb_url || photo.image_url || photo.uri;
    if (!url) return undefined;
    
    // Do not append timestamp to data URIs (base64)
    if (url.startsWith('data:')) return url;
    
    // Add cache busting based on updatedAt
    const timestamp = photo.updatedAt ? new Date(photo.updatedAt).getTime() : 
                      (photo.createdAt ? new Date(photo.createdAt).getTime() : Date.now());
                      
    return `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;
  }, [photo.thumb_url, photo.image_url, photo.uri, photo.updatedAt, photo.createdAt]);

  const cardSelectedClasses = isAdminMode && isMultiSelect && isSelected 
    ? 'ring-[3px] ring-blue-500 scale-[0.98] shadow-lg z-10' 
    : 'hover:scale-[1.02] active:scale-[0.95]';

  const [isImageLoaded, setIsImageLoaded] = React.useState(false);

  return (
    <div 
      onContextMenu={(e) => {
        e.preventDefault();
        if (isAdminMode) return;
        shareSinglePhoto(photo);
        if ('vibrate' in navigator) navigator.vibrate(50);
      }}
      onMouseDown={() => isAdminMode && onLongPressStart(photo.id)}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onTouchStart={() => isAdminMode && onLongPressStart(photo.id)}
      onTouchEnd={onLongPressEnd}
      onTouchMove={onLongPressEnd}
      onTouchCancel={onLongPressEnd}
      onClick={() => {
        if (isAdminMode && isMultiSelect && onToggleSelection) {
          onToggleSelection(photo.id);
          return;
        }
        if (photo.groupId && showGroupsCollapsed) {
          onGroupClick?.(photo.groupId);
        } else {
          onLightboxOpen(index);
        }
      }}
      className={`aspect-square bg-slate-50 rounded-xl overflow-hidden cursor-pointer relative shadow-sm transition-all duration-300 group ${cardSelectedClasses} ${photo.isHidden ? 'ring-2 ring-yellow-400/50' : ''}`}
    >
      {!isImageLoaded && (
        <Skeleton className="absolute inset-0 bg-slate-100 flex items-center justify-center rounded-xl">
          <ImageIcon className="text-slate-300 w-8 h-8" />
        </Skeleton>
      )}

      <img 
        draggable={false}
        loading="lazy"
        referrerPolicy="no-referrer"
        src={thumbSrc} 
        alt={photo.name}
        className={`w-full h-full object-cover transition-all duration-700 ${isImageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'} ${isAdminMode && isMultiSelect && isSelected ? 'opacity-40 grayscale-[0.5]' : ''} ${photo.isHidden ? 'opacity-70' : ''}`}
        onLoad={() => {
          setIsImageLoaded(true);
        }}
      />

      {/* Selected Indicator (Blue Overlay + Icon) */}
      {isAdminMode && isMultiSelect && (
        <div className={`absolute inset-0 transition-all duration-300 flex items-center justify-center p-3 sm:p-4 ${isSelected ? 'bg-blue-500/10' : 'bg-transparent'}`}>
           <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-blue-600 border-white shadow-xl scale-110' : 'bg-white/40 border-white/60 shadow-sm opacity-0 group-hover:opacity-100'}`}>
              {isSelected && <Check size={16} className="text-white sm:size-20" />}
           </div>
        </div>
      )}

      {/* Top Left Indicators (Group only) */}
        <div className="absolute top-1 left-1 z-10 flex gap-0.5">
        {photo.groupId && (
          <div className="bg-black/50 px-1 py-0.5 rounded text-[7px] text-white font-bold flex items-center gap-0.5 border border-white/10 uppercase">
            <Layers size={8} />
            {photo.groupId.slice(-4)}
          </div>
        )}
      </div>

      {/* Hidden Status Indicator (Centered overlay) */}
      {photo.isHidden && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-yellow-400/90 text-black p-2 rounded-full shadow-lg">
            <EyeOff size={16} />
          </div>
        </div>
      )}

      {isAdminMode && onTogglePinned && (
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
    </div>
  );
});
