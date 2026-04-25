import React from 'react';
import { Layers, Check, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { Photo } from '../types';

import { translations, LanguageCode } from '../lib/translations';

export interface PhotoCardProps {
  photo: Photo;
  isMultiSelect: boolean;
  isSelected: boolean;
  isGroupMaster: boolean;
  groupCount: number;
  categoryName: string | undefined;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const PhotoCard = React.memo(({ 
  photo, 
  isMultiSelect, 
  isSelected, 
  isGroupMaster, 
  groupCount, 
  categoryName, 
  onClick, 
  onContextMenu 
}: PhotoCardProps) => {
  const lang = (localStorage.getItem('appLang') as LanguageCode) || 'en';
  const t = translations[lang] || translations['en'];

  const longPressTimer = React.useRef<any>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      onContextMenu(e as any);
      if ('vibrate' in navigator) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const isIncomplete = !photo.name || !photo.categoryId || !photo.subcategoryId || !photo.tagIds || (photo.tagIds || []).length < 2;

  return (
    <motion.div 
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`relative aspect-square rounded-2xl overflow-hidden group shadow-sm active:scale-95 transition-all ring-offset-2 will-change-transform ${isSelected ? 'ring-2 ring-[#D4A853]' : 'bg-white'}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      <img 
        src={photo.uri} 
        loading="lazy"
        className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-110 opacity-70' : 'group-hover:scale-105'}`}
        alt="Product"
      />
      
      {photo.groupId && (
        <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-xl text-[8px] text-white font-black tracking-widest flex items-center gap-1 border border-white/20 uppercase">
          <Layers size={10} />
          {photo.groupId}
        </div>
      )}

      {isGroupMaster && groupCount > 1 && (
        <div className="absolute top-3 right-3 bg-[#D4A853] px-2 py-1 rounded-xl text-[10px] text-white font-black shadow-lg ring-1 ring-white/30">
          {groupCount}
        </div>
      )}

      {isIncomplete && !photo.isAnalyzing && (
        <div className="absolute top-3 right-3 bg-red-500/90 text-white p-1 rounded-full shadow-lg z-10 animate-pulse">
          <AlertCircle size={14} />
        </div>
      )}

      {isMultiSelect && !isGroupMaster && (
        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all ${isSelected ? 'bg-[#1D3557] text-white' : 'bg-white/40 backdrop-blur-sm border border-white/50'}`}>
          {isSelected && <Check size={14} strokeWidth={4} />}
        </div>
      )}
      
      {photo.isAnalyzing && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 bg-[#FDFAF6]/60 backdrop-blur-sm flex flex-col justify-center items-center cursor-default"
        >
          <div className="w-6 h-6 border-2 border-[#1D3557]/20 border-t-[#1D3557] rounded-full animate-spin mb-1"></div>
          <span className="text-[9px] text-[#1D3557] font-black tracking-widest uppercase opacity-40">{t.aiAnalyzing}</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 translate-y-1 group-hover:translate-y-0 transition-transform">
        <p className="text-[9px] text-white/90 font-bold tracking-wider truncate uppercase mb-0.5">
          {categoryName}
        </p>
      </div>
    </motion.div>
  );
});
