import React, { useRef } from 'react';
import { Photo, ProductGroup } from '../../types';
import { Star, Sparkles, Check, Info, Palette, Layers, Quote } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

interface GroupGridViewProps {
  photos: Photo[];
  groupData?: ProductGroup | null;
  onPhotoClick: (photo: Photo) => void;
  onPhotoContextMenu?: (e: React.MouseEvent, photo: Photo) => void;
  isMultiSelectMode?: boolean;
  selectedPhotoIds?: string[];
  getPhotoProps?: (photo: Photo) => Record<string, any>; // Returns props to spread on the photo card wrapper (like drag events)
}

const PhotoItem = React.memo(({ photo, isSelected, isMultiSelectMode, extraProps, onPhotoClick, onPhotoContextMenu, longPressTimers }: {
  photo: Photo;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  extraProps: any;
  onPhotoClick: (photo: Photo) => void;
  onPhotoContextMenu?: (e: any, photo: Photo) => void;
  longPressTimers: React.MutableRefObject<Record<string, NodeJS.Timeout>>;
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  
  return (
    <div 
      {...extraProps}
      className={`bg-white rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border p-1.5 flex flex-col group transition-all duration-300 relative cursor-pointer ${photo.isGroupCover ? 'ring-4 ring-brand-gold border-transparent' : isSelected ? 'ring-4 ring-blue-500' : 'border-slate-100'} ${extraProps?.className || ''}`}
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
        onTouchStart={() => {
           longPressTimers.current[photo.id] = setTimeout(() => {
                onPhotoContextMenu?.({ preventDefault: () => {} } as any, photo);
           }, 350);
        }}
        onTouchMove={() => {
           if (longPressTimers.current[photo.id]) clearTimeout(longPressTimers.current[photo.id]);
        }}
        onTouchEnd={() => {
           if (longPressTimers.current[photo.id]) clearTimeout(longPressTimers.current[photo.id]);
        }}
      >
        {!isLoaded && (
          <Skeleton className="absolute inset-0 bg-slate-100 flex items-center justify-center">
            <Quote className="text-slate-200/50 w-8 h-8 rotate-180" />
          </Skeleton>
        )}
        <img 
          src={photo.thumb_url || photo.image_url || photo.uri} 
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
        />
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
           {photo.isGroupCover && !isMultiSelectMode && (
             <div className="bg-brand-gold text-white p-1 rounded-lg flex items-center justify-center shadow-lg">
               <Star size={12} fill="currentColor" />
             </div>
           )}
           {photo.isAnalyzing && (
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
          {photo.isHidden && (
            <span className="shrink-0 bg-orange-100 text-orange-600 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter">
              已隐藏
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold text-slate-400 font-mono">
            {photo.model_number || photo.item_code || '-'}
          </p>
          {photo.dimensions?.[0] && (
            <span className="text-[8px] font-black text-slate-300">
              {photo.dimensions[0].label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export const GroupGridView: React.FC<GroupGridViewProps> = ({
  photos,
  groupData,
  onPhotoClick,
  onPhotoContextMenu,
  isMultiSelectMode = false,
  selectedPhotoIds = [],
  getPhotoProps
}) => {
  const longPressTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  return (
    <div className={`flex-1 overflow-y-auto min-h-0 p-3 sm:p-6 pb-40 scrollbar-hide ${groupData?.isHidden ? 'grayscale opacity-70' : ''}`}>
      {/* Series Summary Card */}
      {groupData && (groupData.description || (groupData.colors && groupData.colors.length > 0) || (groupData.materials && groupData.materials.length > 0)) && (
        <div className={`mb-8 p-6 rounded-[2rem] border-2 shadow-sm relative overflow-hidden group ${groupData.isHidden ? 'bg-slate-50 border-slate-200' : 'bg-white border-indigo-50'}`}>
          <div className={`absolute top-0 right-0 p-8 opacity-5 ${groupData.isHidden ? 'text-slate-400' : 'text-indigo-600'}`}>
            <Quote size={80} />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
               <div>
                  <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${groupData.isHidden ? 'text-slate-400' : 'text-indigo-400'}`}>系列故事 / Series Story</h3>
                  <p className="text-sm font-bold text-slate-600 leading-relaxed max-w-2xl">
                    {groupData.description || '暂无系列说明 / No description yet.'}
                  </p>
               </div>
               
               <div className="flex flex-wrap gap-4 pt-2">
                 {groupData.materials && groupData.materials.length > 0 && (
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                      <Layers size={14} className={groupData.isHidden ? 'text-slate-400' : 'text-indigo-400'} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        {groupData.materials.join(' • ')}
                      </span>
                   </div>
                 )}
               </div>
            </div>

            {groupData.colors && groupData.colors.length > 0 && (
              <div className="md:w-48 space-y-3">
                 <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${groupData.isHidden ? 'text-slate-400' : 'text-indigo-400'}`}>系列配比 / DNA Colors</h3>
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
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-6">
        {photos.map((photo) => {
          if (!photo) return null; // Defensive check for null entries
          
          const isSelected = selectedPhotoIds.includes(photo.id);
          const extraProps = getPhotoProps ? getPhotoProps(photo) : {};
          
          return (
            <PhotoItem 
              key={photo.id}
              photo={photo}
              isSelected={isSelected}
              isMultiSelectMode={isMultiSelectMode}
              extraProps={extraProps}
              onPhotoClick={onPhotoClick}
              onPhotoContextMenu={onPhotoContextMenu}
              longPressTimers={longPressTimers}
            />
          );
        })}
      </div>
    </div>
  );
};
