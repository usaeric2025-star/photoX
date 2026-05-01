import React, { useRef } from 'react';
import { Photo, ProductGroup } from '../../types';
import { Star, Sparkles, Check, Info, Palette, Layers, Quote } from 'lucide-react';

interface GroupGridViewProps {
  photos: Photo[];
  groupData?: ProductGroup | null;
  onPhotoClick: (photo: Photo) => void;
  onPhotoContextMenu?: (e: React.MouseEvent, photo: Photo) => void;
  isMultiSelectMode?: boolean;
  selectedPhotoIds?: string[];
  getPhotoProps?: (photo: Photo) => any; // Returns props to spread on the photo card wrapper (like drag events)
}

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
    <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-6 pb-40 scrollbar-hide">
      {/* Series Summary Card */}
      {groupData && (groupData.description || (groupData.colors && groupData.colors.length > 0) || (groupData.materials && groupData.materials.length > 0)) && (
        <div className="mb-8 p-6 bg-white rounded-[2rem] border-2 border-indigo-50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-600">
            <Quote size={80} />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
               <div>
                  <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">系列故事 / Series Story</h3>
                  <p className="text-sm font-bold text-slate-600 leading-relaxed max-w-2xl">
                    {groupData.description || '暫無系列說明 / No description yet.'}
                  </p>
               </div>
               
               <div className="flex flex-wrap gap-4 pt-2">
                 {groupData.materials && groupData.materials.length > 0 && (
                   <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                      <Layers size={14} className="text-indigo-400" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        {groupData.materials.join(' • ')}
                      </span>
                   </div>
                 )}
               </div>
            </div>

            {groupData.colors && groupData.colors.length > 0 && (
              <div className="md:w-48 space-y-3">
                 <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">系列配比 / DNA Colors</h3>
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
          const isSelected = selectedPhotoIds.includes(photo.id);
          const extraProps = getPhotoProps ? getPhotoProps(photo) : {};
          
          return (
            <div 
              key={photo.id}
              {...extraProps}
              className={`bg-white rounded-[1.25rem] overflow-hidden shadow-sm hover:shadow-md border p-1.5 flex flex-col group transition-all duration-300 relative cursor-pointer ${photo.isGroupCover ? 'ring-4 ring-[#D4A853] border-transparent' : isSelected ? 'ring-4 ring-blue-500' : 'border-slate-100'} ${extraProps?.className || ''}`}
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
                className="aspect-square rounded-xl overflow-hidden relative"
                onTouchStart={() => {
                   longPressTimers.current[photo.id] = setTimeout(() => {
                        onPhotoContextMenu?.({} as any, photo);
                   }, 350);
                }}
                onTouchMove={() => {
                   if (longPressTimers.current[photo.id]) clearTimeout(longPressTimers.current[photo.id]);
                }}
                onTouchEnd={() => {
                   if (longPressTimers.current[photo.id]) clearTimeout(longPressTimers.current[photo.id]);
                }}
              >
                <img 
                  src={photo.thumb_url || photo.image_url || photo.uri} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                />
                
                {/* Status Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                   {photo.isGroupCover && !isMultiSelectMode && (
                     <div className="bg-[#D4A853] text-white p-1 rounded-lg flex items-center justify-center shadow-lg">
                       <Star size={12} fill="currentColor" />
                     </div>
                   )}
                   {photo.isAnalyzing && (
                     <div className="bg-purple-600 text-white p-1 rounded-lg flex items-center justify-center shadow-lg animate-pulse">
                       <Sparkles size={12} />
                     </div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
