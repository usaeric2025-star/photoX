import React, { useMemo } from 'react';
import { Photo, Category } from '../types';
import { X, Layers } from 'lucide-react';

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
  tagMap: Record<string, string>;
  onToggleSelection?: (id: string) => void;
  onEditPhoto?: (id: string) => void;
  onGroupClick?: (groupId: string) => void;
  onLightboxOpen: (index: number) => void;
  onLongPressStart: (id: string) => void;
  onLongPressEnd: () => void;
  shareSinglePhoto: (photo: Photo) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = React.memo(({ 
  photo, index, isAdminMode, isMultiSelect, isStaffMode, isSelected, showGroupsCollapsed,
  lang, t, categories, tagMap, onToggleSelection, onEditPhoto, onGroupClick, 
  onLightboxOpen, onLongPressStart, onLongPressEnd, shareSinglePhoto
}) => {
  const catName = useMemo(() => {
    // 1. Favor pre-joined cloud values for accuracy
    if (lang === 'zh' && photo.categoryZh) return photo.categoryZh;
    if (lang === 'en' && photo.categoryEn) return photo.categoryEn;
    if (lang === 'ms' && photo.categoryMs) return photo.categoryMs;
    if (photo.categoryName) return photo.categoryName;

    const catId = photo.categoryId;
    if (!catId) return '';
    
    // 2. Exact ID lookup fallback (for local unsynced data)
    const activeCat = categories ? categories.find(c => String(c.id) === String(catId)) : null;

    if (activeCat) {
      if (lang === 'zh') return activeCat.zh || activeCat.name;
      if (lang === 'en') return activeCat.en || activeCat.name;
      if (lang === 'ms') return activeCat.ms || activeCat.name || activeCat.en;
      return activeCat.name;
    }
    
    return '';
  }, [photo.categoryId, photo.categoryZh, photo.categoryEn, photo.categoryMs, photo.categoryName, categories, lang]);
  
  const displayCatName = useMemo(() => {
    const uncatValues = ['未分类', '未分類', 'uncategorized', 'others', 'tiada kategori'];
    if (!catName || uncatValues.includes(catName.toLowerCase())) {
      return t.uncategorized;
    }
    return catName;
  }, [catName, t.uncategorized]);

  const isUncategorized = displayCatName === t.uncategorized;
  
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
      onMouseDown={() => onLongPressStart(photo.id)}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onTouchStart={() => onLongPressStart(photo.id)}
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
      className={`aspect-square bg-white rounded-lg overflow-hidden cursor-pointer relative shadow-sm transition-all active:scale-[0.95] group ${isAdminMode && isMultiSelect && isSelected ? 'ring-2 ring-blue-500 scale-[0.95]' : ''}`}
    >
      <img 
        draggable={false}
        src={photo.thumb_url || photo.image_url || photo.uri || undefined} 
        alt={photo.name}
        className={`w-full h-full object-cover ${isAdminMode && isMultiSelect && isSelected ? 'opacity-50' : ''}`}
      />

      {isAdminMode && isMultiSelect && isSelected && (
        <div className="absolute top-1 right-1 bg-blue-600 text-white p-0.5 rounded-full shadow-lg z-10">
          <X size={10} />
        </div>
      )}
      {photo.groupId && (
         <div className="absolute top-1 left-1 bg-black/50 backdrop-blur-sm px-1 py-0.5 rounded text-[7px] text-white font-bold flex items-center gap-0.5 border border-white/10 uppercase">
           <Layers size={8} />
           {photo.groupId.slice(-4)}
         </div>
       )}
      
      <div className="absolute bottom-0 left-0 w-full p-1.5 bg-gradient-to-t from-black/70 to-transparent">
         {!isUncategorized && displayCatName && (
          <p className="text-[11px] font-bold tracking-tight leading-none text-white drop-shadow-md mb-0.5 uppercase truncate">
            {displayCatName}
          </p>
        )}
        
        {photoTags.length > 0 && (
          <div className="w-full flex flex-nowrap gap-0.5 items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {photoTags.map((tagName, idx) => (
              <span key={idx} className="bg-white/30 backdrop-blur-sm text-white/90 text-[8px] px-1 py-0 rounded-sm uppercase tracking-tighter font-medium whitespace-nowrap">
                {tagName}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
