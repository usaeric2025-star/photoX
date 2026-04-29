import React from 'react';
import { Photo } from '../../types';
import { Star, Sparkles, Check } from 'lucide-react';

interface GroupGridViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  onPhotoContextMenu?: (e: React.MouseEvent, photo: Photo) => void;
  isMultiSelectMode?: boolean;
  selectedPhotoIds?: string[];
  getPhotoProps?: (photo: Photo) => any; // Returns props to spread on the photo card wrapper (like drag events)
}

export const GroupGridView: React.FC<GroupGridViewProps> = ({
  photos,
  onPhotoClick,
  onPhotoContextMenu,
  isMultiSelectMode = false,
  selectedPhotoIds = [],
  getPhotoProps
}) => {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-6 pb-40">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-4">
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
              <div className="aspect-square rounded-xl overflow-hidden relative">
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
