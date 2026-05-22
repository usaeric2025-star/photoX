import React, { useRef, useMemo } from 'react';
import { Photo, ProductGroup } from '../../types';
import { Star, Sparkles, Check, Info, Palette, Layers, Quote } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { VirtuosoGrid } from 'react-virtuoso';
import { VIRTUOSO_CONFIG } from '@/config/virtuoso.config';

interface GroupGridViewProps {
  photos: Photo[];
  groupData?: ProductGroup | null;
  onPhotoClick: (photo: Photo) => void;
  onPhotoContextMenu?: (e: React.MouseEvent, photo: Photo) => void;
  isMultiSelectMode?: boolean;
  selectedPhotoIds?: string[];
  getPhotoProps?: (photo: Photo) => React.HTMLAttributes<HTMLDivElement>;
  highlightId?: string | null;
  onEndReached?: () => void;
}

const PhotoItem = React.memo(({ photo, isSelected, isMultiSelectMode, isHighlighted, extraProps, onPhotoClick, onPhotoContextMenu }: {
  photo: Photo;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  isHighlighted?: boolean;
  extraProps: React.HTMLAttributes<HTMLDivElement>;
  onPhotoClick: (photo: Photo) => void;
  onPhotoContextMenu?: (e: React.MouseEvent, photo: Photo) => void;
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = React.useRef<{x: number, y: number} | null>(null);

  const clearTimer = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  return (
    <div 
      {...extraProps}
      className={`bg-white rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border p-1.5 flex flex-col group transition-all duration-300 relative cursor-pointer h-full ${photo.is_group_cover ? 'ring-4 ring-brand-gold border-transparent' : isSelected ? 'ring-4 ring-blue-500' : 'border-slate-100'} ${isHighlighted ? 'ring-4 ring-blue-400 animate-pulse bg-blue-50' : ''} ${extraProps.className || ''}`}
      onClick={(e) => {
         if (extraProps.onClick) extraProps.onClick(e);
         onPhotoClick(photo);
      }}
      onContextMenu={(e) => {
         if (extraProps.onContextMenu) extraProps.onContextMenu(e);
         onPhotoContextMenu?.(e, photo);
      }}
    >
      {/* Image Container */}
      <div 
        className="aspect-square rounded-xl overflow-hidden relative bg-slate-50"
        onTouchStart={(e) => {
           touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
           longPressTimer.current = setTimeout(() => {
                 onPhotoContextMenu?.({ preventDefault: () => {} } as any, photo);
                 clearTimer();
           }, 400);
        }}
        onTouchMove={(e) => {
           if (touchStartPos.current) {
               const dx = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
               const dy = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
               if (dx > 10 || dy > 10) {
                   clearTimer();
               }
           }
        }}
        onTouchEnd={clearTimer}
      >
        {!isLoaded && (
          <div className="absolute inset-0 animate-pulse bg-slate-100 flex items-center justify-center">
            <Quote className="text-slate-200/50 w-8 h-8 rotate-180" />
            <div className="absolute inset-0 bg-brand-navy/5" />
          </div>
        )}
        <img 
          src={photo.thumb_url || photo.image_url || photo.uri} 
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          referrerPolicy="no-referrer"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
        />
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
           {photo.is_group_cover && !isMultiSelectMode && (
             <div className="bg-brand-gold text-white p-1 rounded-lg flex items-center justify-center shadow-lg">
               <Star size={12} fill="currentColor" />
             </div>
           )}
           {photo.is_analyzing && (
             <Skeleton className="bg-purple-600 text-white p-1 rounded-lg flex items-center justify-center shadow-lg">
               <Sparkles size={12} />
             </Skeleton>
           )}
        </div>

        {/* Quick Selection Toggle */}
        {isMultiSelectMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity z-20">
             <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-white/20 border-white'}`}>
                {isSelected && <Check size={16} className="text-white" />}
             </div>
          </div>
        )}
      </div>

      {/* Info Area */}
      <div className="mt-2.5 px-1 pb-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[11px] font-black text-slate-800 truncate tracking-tight">
            {photo.name || '未命名'}
          </h4>
          {photo.is_hidden && (
            <span className="shrink-0 bg-orange-100 text-orange-600 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">
              已隐藏
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[9px] font-bold text-slate-400 font-mono truncate min-w-0">
            {photo.model_number || photo.item_code || '-'}
          </p>
          {photo.dimensions?.[0] && (
            <span className="text-[8px] font-black text-slate-300 truncate shrink-0 max-w-[50%] text-right">
              {photo.dimensions[0]?.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export const GroupGridView: React.FC<GroupGridViewProps & { virtuosoRef?: React.Ref<any>, isLoading?: boolean }> = ({
  photos,
  groupData,
  onPhotoClick,
  onPhotoContextMenu,
  isMultiSelectMode = false,
  selectedPhotoIds = [],
  getPhotoProps,
  virtuosoRef,
  highlightId,
  onEndReached,
  isLoading = false
}) => {
  
  const header = useMemo(() => {
    if (!groupData || (!groupData.description && (!groupData.colors || groupData.colors.length === 0) && (!groupData.materials || groupData.materials.length === 0))) {
      return null;
    }
    return (
      <div className={`mb-8 p-6 rounded-[2rem] border-2 shadow-sm relative overflow-hidden group ${groupData.is_hidden ? 'bg-slate-50 border-slate-200' : 'bg-white border-indigo-50'}`}>
        <div className={`absolute top-0 right-0 p-8 opacity-5 ${groupData.is_hidden ? 'text-slate-400' : 'text-indigo-600'}`}>
          <Quote size={80} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8">
          <div className="flex-1 space-y-4">
             <div>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${groupData.is_hidden ? 'text-slate-400' : 'text-indigo-400'}`}>系列故事 / Series Story</h3>
                <p className="text-sm font-bold text-slate-600 leading-relaxed max-w-2xl">
                  {groupData.description || '暂无系列说明 / No description yet.'}
                </p>
             </div>
             
             <div className="flex flex-wrap gap-4 pt-2">
               {groupData.materials && groupData.materials.length > 0 && (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                    <Layers size={14} className={groupData.is_hidden ? 'text-slate-400' : 'text-indigo-400'} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      {groupData.materials.join(' • ')}
                    </span>
                 </div>
               )}
             </div>
          </div>

          {groupData.colors && groupData.colors.length > 0 && (
            <div className="md:w-48 space-y-3">
               <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${groupData.is_hidden ? 'text-slate-400' : 'text-indigo-400'}`}>系列配比 / DNA Colors</h3>
               <div className="flex flex-wrap gap-2">
                  {groupData.colors.map((c, i) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-lg border-2 border-white shadow-sm transition-transform hover:scale-125"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [groupData]);

  return (
    <div className={`flex-1 min-h-0 relative ${groupData?.is_hidden ? 'grayscale opacity-70' : ''}`}>
      <VirtuosoGrid
        ref={virtuosoRef}
        style={{ height: '100%', width: '100%' }}
        totalCount={isLoading ? 12 : photos.length}
        overscan={VIRTUOSO_CONFIG.overscan(4)}
        increaseViewportBy={VIRTUOSO_CONFIG.increaseViewportBy}
        useWindowScroll={false}
        endReached={onEndReached}
        components={{
          Header: () => <div className="p-3 sm:p-6 pb-0">{header}</div>,
          Footer: () => <div className="h-40" />
        }}
        listClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-6 p-3 sm:p-6"
        itemContent={(index) => {
          if (isLoading) {
            return <Skeleton className="aspect-square rounded-[1.25rem] bg-slate-100" />;
          }
          const photo = photos[index];
          if (!photo) return null;
          
          const isSelected = selectedPhotoIds.includes(photo.id);
          const isHighlighted = highlightId === photo.id;
          const extraProps = getPhotoProps ? getPhotoProps(photo) : {};
          
          return (
            <PhotoItem 
              key={photo.id}
              photo={photo}
              isSelected={isSelected}
              isMultiSelectMode={isMultiSelectMode}
              isHighlighted={isHighlighted}
              extraProps={extraProps}
              onPhotoClick={onPhotoClick}
              onPhotoContextMenu={onPhotoContextMenu}
            />
          );
        }}
      />
    </div>
  );
};
