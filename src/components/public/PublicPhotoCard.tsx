import React, { useMemo, useCallback } from 'react';
import { Photo, Category, Manufacturer } from '../../types';
import { Layers } from 'lucide-react';
import { getTranslatedCategoryName, isUncategorizedName, TranslationType, getCacheBustedImageUrl } from '../../lib/ui-helpers';
import { safeArray } from '../../utils/safeAccess';
import { PhotoImageContainer } from '../photo/PhotoImageContainer';

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
  <div className="absolute top-2 left-2 z-10 flex gap-0.5 flex-col pointer-events-none">
    {photo.group_id && photo.member_count !== undefined && photo.member_count > 1 && (
      <div className="bg-black/40 backdrop-blur-[4px] px-2 py-0.5 rounded-md text-[9px] text-white font-bold flex items-center gap-1 border border-white/10 pointer-events-none">
        <Layers size={9} strokeWidth={2.5} />
        {photo.member_count}
      </div>
    )}
  </div>
);

const PhotoInfoFooter: React.FC<{ 
  displayCatName: string; 
  isUncategorized: boolean; 
  photoTags: string[] 
}> = ({ displayCatName, isUncategorized, photoTags }) => (
  <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none h-[40%] flex flex-col justify-end items-start gap-1">
     {!isUncategorized && displayCatName && (
      <p className="text-[13px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] leading-none truncate flex-shrink-0 w-full mb-0.5 tracking-tight px-0.5">
        {displayCatName}
      </p>
    )}
    {photoTags.length > 0 && (
      <div className="flex flex-nowrap gap-1 w-full overflow-x-auto pointer-events-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-0.5 pb-0.5 mt-auto">
        {photoTags.map((tag, i) => (
          <span 
            key={i} 
            className="shrink-0 text-[7.5px] text-white/95 font-bold px-1 py-[2px] bg-white/20 backdrop-blur-md rounded-[3px] border border-white/20 leading-none shadow-sm uppercase tracking-wide"
          >
            {tag}
          </span>
        ))}
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
    if (showGroupsCollapsed && photo.group_id && onGroupClick) {
      onGroupClick(photo.group_id, photo.id);
    } else {
      handleOpenLightbox();
    }
  }, [photo.id, photo.group_id, onGroupClick, handleOpenLightbox, showGroupsCollapsed]);

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
      <PhotoImageContainer
        photoId={photo.id}
        src={thumbSrc}
        thumbHash={photo.thumb_hash}
        alt={photo.name || 'Photo'}
        loading={shouldEagerLoad ? 'eager' : 'lazy'}
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
