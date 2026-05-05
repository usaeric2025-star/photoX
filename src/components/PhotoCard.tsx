import React, { useMemo } from 'react';
import { Photo, Category } from '../types';
import { X, Layers, Heart, EyeOff } from 'lucide-react';
import { getTranslatedCategoryName, getManufacturerName, isUncategorizedName } from '../lib/ui-helpers';

interface PhotoCardProps {
  photo: Photo;
  index: number;
  isAdminMode: boolean;
  isMultiSelect: boolean;
  isStaffMode: boolean;
  isSelected: boolean;
  showGroupsCollapsed: boolean;
  lang: string;
  t: any;
  categories: Category[];
  manufacturers: any[];
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
    return getManufacturerName(photo.manufacturerId || (photo as any).sub_category, manufacturers);
  }, [photo.manufacturerId, (photo as any).sub_category, manufacturers]);

  const displayCatName = useMemo(() => {
    return getTranslatedCategoryName(photo.categoryId || (photo as any).category_id, categories, lang, t);
  }, [photo.categoryId, (photo as any).category_id, categories, lang, t]);

  const isUncategorized = useMemo(() => isUncategorizedName(displayCatName, t), [displayCatName, t]);
  
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const photoTags = useMemo(() => {
    if (!photo.tagIds || photo.tagIds.length === 0) return [];
    // Only show tags present in the tagMap
    return photo.tagIds
      .map(tid => tagMap[String(tid)])
      .filter(Boolean)
      .map(toTitleCase);
  }, [photo.tagIds, tagMap]);

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
      className={`aspect-square bg-white rounded-xl overflow-hidden cursor-pointer relative shadow-sm transition-all active:scale-[0.95] group ${isAdminMode && isMultiSelect && isSelected ? 'ring-2 ring-blue-500 scale-[0.95]' : ''} ${photo.isHidden ? 'ring-2 ring-yellow-400/50' : ''}`}
    >
      <img 
        draggable={false}
        loading="lazy"
        src={photo.thumb_url || photo.image_url || photo.uri || undefined} 
        alt={photo.name}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isAdminMode && isMultiSelect && isSelected ? 'opacity-50' : 'opacity-100'} ${photo.isHidden ? 'opacity-70' : ''}`}
        onLoad={(e) => {
          (e.currentTarget as HTMLImageElement).style.opacity = '1';
        }}
        style={{ opacity: 0 }}
      />

      {/* Top Left Indicators (Group only) */}
      <div className="absolute top-1 left-1 z-10 flex gap-0.5">
        {photo.groupId && (
          <div className="bg-black/50 backdrop-blur-sm px-1 py-0.5 rounded text-[7px] text-white font-bold flex items-center gap-0.5 border border-white/10 uppercase">
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

      {/* Top Right Admin Actions */}
      {isAdminMode && isMultiSelect && isSelected && (
        <div className="absolute top-1 right-1 bg-blue-600 text-white p-0.5 rounded-full shadow-lg z-10">
          <X size={10} />
        </div>
      )}
      {isAdminMode && onTogglePinned && (
         <button 
           onClick={(e) => {
             e.stopPropagation();
             onTogglePinned(photo);
           }}
           className={`absolute top-1 ${isAdminMode && isMultiSelect && isSelected ? 'right-7' : 'right-2'} bg-black/50 backdrop-blur-sm p-1 rounded-full text-white ${photo.isPinned ? 'text-red-500' : ''} z-10`}
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
              <span key={idx} className="bg-black/30 backdrop-blur-sm text-white text-[9px] px-1.5 rounded font-medium whitespace-nowrap">
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
