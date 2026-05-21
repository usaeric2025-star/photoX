import React, { useMemo, useCallback } from 'react';
import { Photo, Category, Manufacturer } from '../../types';
import { Layers, Image as ImageIcon } from 'lucide-react';
import { getTranslatedCategoryName, getManufacturerName, isUncategorizedName, TranslationType, getCacheBustedImageUrl } from '../../lib/ui-helpers';
import { safeArray } from '../../utils/safeAccess';
import { thumbHashToDataURL } from '../../utils/thumbHash';

const loadedImagesCache = new Set<string>();

interface PublicPhotoCardProps {
  photo: Photo;
  index: number;
  showGroupsCollapsed: boolean;
  lang: string;
  t: TranslationType;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  onGroupClick?: (groupId: string, photoId?: string) => void;
  onLightboxOpen: (photo: Photo) => void;
  shareSinglePhoto: (photo: Photo) => void;
}

const PhotoStatusBadges: React.FC<{ photo: Photo }> = ({ photo }) => (
  <div className="absolute top-1 left-1 z-10 flex gap-0.5 flex-col pointer-events-none">
    {photo.group_id && (
      <div className="bg-black/50 px-1 py-0.5 rounded text-[7px] text-white font-bold flex items-center gap-0.5 border border-white/10 uppercase pointer-events-none">
        <Layers size={8} />
        {photo.group_id.slice(-4)}
      </div>
    )}
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

export const PublicPhotoCard: React.FC<PublicPhotoCardProps> = React.memo(({ 
  photo, index, showGroupsCollapsed,
  lang, t, categories, manufacturers, tagMap, onGroupClick, 
  onLightboxOpen, shareSinglePhoto
}) => {
  const handleOpenLightbox = useCallback(() => {
    onLightboxOpen(photo);
  }, [photo, onLightboxOpen]);
    
  const handleClick = useCallback(() => {
    if (photo.group_id && onGroupClick) {
      onGroupClick(photo.group_id, photo.id);
    } else {
      handleOpenLightbox();
    }
  }, [photo.id, photo.group_id, onGroupClick, handleOpenLightbox]);

  const displayCatName = useMemo(() => 
    getTranslatedCategoryName(photo.category_id, categories, lang, t),
    [photo.category_id, categories, lang, t]
  );

  const isUncategorized = useMemo(() => {
    const catId = photo.category_id;
    return isUncategorizedName(displayCatName, t, catId);
  }, [displayCatName, t, photo.category_id]);
  
  const photoTags = useMemo(() => {
    const rawTagIds = safeArray<string | number>(photo.tag_ids);
    if (!rawTagIds || rawTagIds.length === 0) return [];
    return rawTagIds
      .map(tid => tagMap[String(tid)])
      .filter(Boolean)
      .map(toTitleCase);
  }, [photo.tag_ids, tagMap]);

  const thumbSrc = useMemo(() => 
    getCacheBustedImageUrl(photo, 'thumb'),
    [photo.thumb_url, photo.image_url, photo.uri, photo.updated_at, photo.created_at]
  );

  const [initiallyLoaded] = React.useState(() => loadedImagesCache.has(photo.id));
  const [isImageLoaded, setIsImageLoaded] = React.useState(initiallyLoaded);
  const [isImageError, setIsImageError] = React.useState(false);

  const placeholderDataUrl = useMemo(() => thumbHashToDataURL(photo.thumb_hash), [photo.thumb_hash]);

  const shouldEagerLoad = index < 10;

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    shareSinglePhoto(photo);
    if ('vibrate' in navigator) navigator.vibrate(50);
  }, [photo, shareSinglePhoto]);

  return (
    <div 
      onContextMenu={handleShare}
      onClick={handleClick}
      className="aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer relative shadow-sm transition-all duration-300 md:hover:scale-[1.02] active:scale-[0.95]"
    >
      {!isImageLoaded && !isImageError && !placeholderDataUrl && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
          <ImageIcon className="text-slate-300 w-8 h-8 opacity-20" />
        </div>
      )}

      {isImageError && (
        <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <ImageIcon className="text-slate-300 w-8 h-8 opacity-50" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{t.imageLoadFailed || 'Load Failed'}</span>
        </div>
      )}

      {!isImageError && !isImageLoaded && (
        <img 
          draggable={false}
          src={placeholderDataUrl || photo.thumb_url || ''} 
          alt=""
          loading={shouldEagerLoad ? "eager" : "lazy"}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-filter duration-300 ${placeholderDataUrl ? '' : 'blur-md'}`}
        />
      )}

      <img 
        draggable={false}
        loading={shouldEagerLoad ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        src={thumbSrc} 
        alt={photo.name}
        className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${initiallyLoaded ? '' : isImageLoaded ? 'opacity-100' : 'opacity-0'} ${isImageError ? 'hidden' : ''}`}
        onLoad={() => {
          loadedImagesCache.add(photo.id);
          setIsImageLoaded(true);
        }}
        onError={() => {
          setIsImageLoaded(true);
          setIsImageError(true);
        }}
      />

      <PhotoStatusBadges photo={photo} />

      <PhotoInfoFooter 
        displayCatName={displayCatName} 
        isUncategorized={isUncategorized} 
        photoTags={photoTags} 
      />
    </div>
  );
});
