import React, { useMemo } from 'react';
import { motion } from 'motion/react';
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
  
  const photoTags = useMemo(() => {
    if (!photo.tagIds || photo.tagIds.length === 0) return [];
    // Only show tags present in the tagMap
    return photo.tagIds
      .map(tid => tagMap[String(tid)])
      .filter((tagName): tagName is string => !!tagName && tagName.trim() !== '');
  }, [photo.tagIds, tagMap]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: (index % 15) * 0.03 }}
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
      className={`aspect-square bg-white rounded-2xl overflow-hidden cursor-pointer relative shadow-sm transition-all active:scale-[0.98] group ${isAdminMode && isMultiSelect && isSelected ? 'ring-4 ring-blue-500 ring-offset-2 scale-[0.95]' : ''}`}
    >
      <img 
        draggable={false}
        src={photo.thumb_url || photo.image_url || photo.uri || undefined} 
        alt={photo.name}
        loading="lazy" 
        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isAdminMode && isMultiSelect && isSelected ? 'opacity-50' : ''}`}
      />

      {isAdminMode && isMultiSelect && isSelected && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full shadow-lg z-10">
          <X size={12} />
        </div>
      )}
      {photo.groupId && (
         <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[7px] text-white font-bold flex items-center gap-1 border border-white/20 uppercase">
           <Layers size={9} />
         </div>
       )}
      
      <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/60 to-transparent">
         {!isUncategorized && displayCatName && (
          <p className="text-[10px] font-black tracking-tighter leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mb-1 uppercase truncate">
            {displayCatName}
          </p>
        )}
        
        {photoTags.length > 0 && (
          <div className="w-full flex flex-nowrap gap-1 items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {photoTags.map((tagName, idx) => (
              <span key={idx} className="bg-white/20 backdrop-blur-md text-white text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-extrabold whitespace-nowrap">
                {tagName}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});
