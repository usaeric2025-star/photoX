import React, { useRef, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLongPress } from '@/hooks/useLongPress';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/errorTracker';
import { photoKeys } from '@/lib/queryKeys';
import { getTranslatedCategoryName } from '@/lib/ui-helpers';
import { useSearch, useNavigate } from '@tanstack/react-router';

function PinButton({ photoId, isPinned }: { photoId: string; isPinned: boolean }) {
  const queryClient = useQueryClient();
  const [optimisticPinned, setOptimisticPinned] = useState(isPinned);

  useEffect(() => {
    setOptimisticPinned(isPinned);
  }, [isPinned]);

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, currentPinned }: { id: string; currentPinned: boolean }) => {
      const { error } = await supabase.from('furniture_items').update({ is_pinned: !currentPinned }).eq('id', id);
      if (error) throw error;
      return !currentPinned;
    },
    onMutate: async ({ currentPinned }) => {
      setOptimisticPinned(!currentPinned);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
    onError: (err, { currentPinned }) => {
      setOptimisticPinned(currentPinned); // Rollback
      reportError(err as Error, `TogglePin photoId=${photoId}`);
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePinMutation.mutate({ id: photoId, currentPinned: isPinned });
  };

  const isPending = togglePinMutation.isPending;

  return (
    <button 
      onClick={handleClick}
      disabled={isPending}
      className="absolute top-1 right-2 bg-black/50 p-1 rounded-full text-white data-[pinned=true]:text-red-500 z-20 hover:scale-115 active:scale-95 transition-transform disabled:opacity-50"
      data-pinned={optimisticPinned ? 'true' : 'false'}
    >
      <Heart size={12} className={optimisticPinned ? 'fill-current' : ''} />
      {togglePinMutation.isError && <span className="absolute right-0 top-full mt-1 text-[8px] bg-red-500 text-white px-1 py-0.5 rounded shadow-sm whitespace-nowrap">{(togglePinMutation.error as Error).message}</span>}
    </button>
  );
}
import { Photo, Category, Tag } from '../../types';
import { GalleryVariant } from '@/types/variant';
import { Layers, Heart, Check, EyeOff } from 'lucide-react';
import { getCacheBustedImageUrl, getPhotoDisplayName } from '../../lib/ui-helpers';
import { ResponsivePhoto } from '../shared/ResponsivePhoto';
import { usePermission, useCategories, useTags, useErrorHandler } from '../../hooks';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { getDisplayGroupCode } from '@/services/utils';

import { toast } from '@/lib/ui/toast';
import { cn } from '@/lib/utils';
import { translations } from '@/lib/translations';
import { useUIStore, useColumns } from '@/store/useUIStore';
import { PhotoStatusBadges } from './PhotoStatusBadges';

export interface PhotoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: GalleryVariant;
  photo: Photo;
  index: number;
  hideDetails?: boolean;
  imgVariant?: 'sm' | 'md';
  hideGroupBadge?: boolean;
  showCoverBadge?: boolean;
}

function SelectionOverlay({ isSelected }: { isSelected: boolean }) {
  return (
    <div className={cn(
      "absolute top-0 left-0 w-full h-full transition-all duration-500 flex items-center justify-center p-3 sm:p-4 pointer-events-none z-10",
      isSelected ? "bg-blue-500/5 backdrop-blur-[1px]" : "bg-transparent"
    )}>
       <div className={cn(
         "w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-300 flex items-center justify-center pointer-events-none shadow-sm",
         isSelected 
           ? "bg-blue-600 border-white shadow-blue-500/50 scale-110 opacity-100" 
           : "bg-white/40 border-white/60 opacity-0 md:group-hover:opacity-100"
       )}>
          {isSelected && <Check size={18} className="text-white animate-in zoom-in-50 duration-300" />}
       </div>
    </div>
  );
}

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * @remarks
 * 虛擬滾動容器內嚴禁 auto-animate ref，僅允許 CSS 過渡.
 * Any animation requiring React state or refs that triggers setStates inside
 * the virtualizer loop will cause infinite update depth loop.
 */
export const PhotoCard = ({ 
  variant, photo, index,
  className = '', onClick,
  hideDetails = false,
  imgVariant,
  hideGroupBadge = false,
  ...props
}: PhotoCardProps) => {
  const isSelected = useUIStore((s) => s.selectedIds.includes(photo.id));
  const isMultiSelect = useUIStore((s) => s.isMultiSelect);
  const toggleSelected = useUIStore((s) => s.toggleSelected);
  const update = useUIStore((s) => s.update);
  const [columns] = useColumns();
  const navigate = useNavigate();
  
  const showGroupsCollapsed = useSearch({ from: '__root__', select: (s: any) => s.showGroupsCollapsed !== 'false' });
  const hasSearchQuery = useSearch({ from: '__root__', select: (s: any) => !!s.q?.trim() });

  const resolvedImgVariant = imgVariant || (columns <= 3 ? 'md' : 'sm');
  
  const { handleError } = useErrorHandler();
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTriggered = useRef(false);
  const resetTimerRef = useRef<number | null>(null);
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  
  const lang = useUIStore(s => s.appLang);
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  const { data: fetchedCategories = [] } = useCategories({ enabled: !hideDetails });
  const { data: fetchedTags = [] } = useTags({ enabled: !hideDetails });

  const categories = fetchedCategories;
  const tags = fetchedTags;

  const categoryId = photo.category_id ? String(photo.category_id) : '';
  
  const displayCatName = getTranslatedCategoryName(categoryId, categories, lang, t);                
                
  const photoTags = (() => {                
    const tagIdsList = Array.isArray(photo.tag_ids) ? photo.tag_ids : [];                
    return tagIdsList                
      .map(id => tags.find(t => String(t.id) === String(id))?.name ?? '')                
      .filter(Boolean);                
  })();

  const displayName = getPhotoDisplayName(photo, categories, lang, t);

  const { can } = usePermission();
  const location = window.location;
  const isAdmin = location.pathname.startsWith('/admin');

  const handleOpenLightbox = () => {
    navigate({ to: '.', search: (prev: any) => ({ ...prev, photoId: photo.id } as any) });
  };
    
  const handleGroupNavigate = (gid: string) => {
    const targetPath = isAdmin ? `/admin/group/${gid}` : `/group/${gid}`;
    navigate({ to: targetPath });
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (longPressTriggered.current) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    if (onClick) {
      onClick(e);
      return;
    }

    if (isManagement) {
      if (isMultiSelect) {
        e.stopPropagation();
        e.preventDefault();
        toggleSelected(photo.id);
      } else if (photo.group_id && showGroupsCollapsed && !hasSearchQuery) {
        // [RULE-LOCK] Group card in list -> Group detail page
        e.stopPropagation();
        e.preventDefault();
        handleGroupNavigate(photo.group_id!);
      } else {
        // [RULE-LOCK] Regular photo or in group page -> Lightbox
        handleOpenLightbox();
      }
    } else {
      if (photo.group_id && showGroupsCollapsed && !hasSearchQuery) {
        e.stopPropagation();
        e.preventDefault();
        handleGroupNavigate(photo.group_id!);
      } else {
        handleOpenLightbox();
      }
    }
  };

  useLongPress(cardRef, {
    delay: 600,
    onLongPress: () => {
      longPressTriggered.current = true;
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => {
        longPressTriggered.current = false;
      }, 300);
      if (isManagement) {
        if (!isMultiSelect) {
          update({ isMultiSelect: true, selectedIds: [photo.id] } as any);
        } else {
          toggleSelected(photo.id);
        }
        if ('vibrate' in navigator) navigator.vibrate(50);
      } else {
        (window as any)._pendingPhoto = photo;
        update({ showWhatsAppChoice: true });
      }
    }
  });

  const thumbSrc = getCacheBustedImageUrl(photo, 'thumb');

  const is_hidden = !!photo.is_hidden;

  const isCover = photo.is_group_cover || (photo.group_id && photo.group?.cover_photo_id === photo.id);

  return (
    <div 
      ref={cardRef}
      data-photo-id={photo.id}
      data-selected={isSelected}
      data-multiselect={isMultiSelect}
      style={{
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: "manipulation",
        ...props.style
      }}
      onClick={handleClick}
      className={cn(
        "aspect-square overflow-hidden cursor-pointer relative transition-all duration-300 group bg-white rounded-2xl shadow-sm ring-1 ring-slate-100",
        "before:absolute before:inset-0 before:z-30 before:pointer-events-none before:transition-all before:duration-300",
        "md:hover:shadow-xl md:hover:scale-[1.01] active:scale-[0.98]",
        "data-[selected=true]:ring-4 data-[selected=true]:ring-blue-500 data-[selected=true]:scale-[0.96] data-[selected=true]:z-10 data-[selected=true]:shadow-lg",
        is_hidden && "ring-2 ring-slate-400 shadow-slate-300/50 shadow-sm grayscale-[0.3]",
        isCover && props.showCoverBadge && "ring-2 ring-amber-400 shadow-amber-100/50 shadow-sm",
        className
      )}
      {...props}
    >
      <div 
        className={cn(
          "relative aspect-square w-full h-full pointer-events-none transition-all duration-500",
          "group-data-[selected=true]:opacity-60 group-data-[selected=true]:scale-90 group-data-[selected=true]:rounded-xl overflow-hidden"
        )}
      >
        <ResponsivePhoto
          photo={photo}
          variant={resolvedImgVariant}
          aspectRatio={1}
          imgClassName={cn(
            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
            is_hidden && "opacity-60"
          )}
        />
      </div>

      {isManagement && isMultiSelect && (
        <div className="absolute inset-0 w-full h-full transition-all duration-300 flex items-center justify-center p-3 sm:p-4 pointer-events-none z-10 bg-blue-500/10">
          <div className={cn(
            "w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 transition-all flex items-center justify-center pointer-events-none shadow-sm",
            isSelected 
              ? "bg-blue-600 border-white shadow-xl scale-110 opacity-100" 
              : "bg-white/40 border-white/60 opacity-60 md:group-hover:opacity-100"
          )}>
            {isSelected && (
              <Check size={16} className="text-white" />
            )}
          </div>
        </div>
      )}

      {isManagement && is_hidden && !isMultiSelect && (
        <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-10">
          <EyeOff size={24} className="text-white/60 drop-shadow" />
        </div>
      )}
      
      <PhotoStatusBadges 
        photo={photo} 
        variant={variant} 
        isPinned={!!photo.is_pinned} 
        hideGroupBadge={hideGroupBadge || !showGroupsCollapsed} 
        showCoverBadge={props.showCoverBadge}
      />

      {isManagement && can('photo:toggle-pinned') && (
         <PinButton photoId={photo.id} isPinned={!!photo.is_pinned} />
      )}

      {/* Info Overlay Panel */}
      {!hideDetails && (
        <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-auto p-1.5 pt-6 flex flex-col gap-1.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
          {/* Main Category Badge */}
          {displayCatName && (
            <div className="px-0.5">
              <span className="text-[9px] bg-white text-black px-2 py-0.5 rounded-full font-black tracking-tighter uppercase shadow-lg inline-block">
                {displayCatName}
              </span>
              
              {isManagement && photo.is_hidden && (
                <span className="ml-1.5 text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-black tracking-tighter uppercase shadow-sm border border-red-500/50 inline-block">
                  HIDDEN
                </span>
              )}
            </div>
          )}

          {/* Tags Row - Forced Single Line with Scroll */}
          {!hideDetails && photoTags && photoTags.length > 0 && (
            <div className="flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth pb-0.5 px-0.5">
              {photoTags.map(tag => (
                <span 
                  key={tag} 
                  className="shrink-0 text-[8px] bg-black/50 backdrop-blur-md text-slate-200 px-1.5 py-0.5 rounded-full font-bold tracking-tighter uppercase border border-white/10 whitespace-nowrap"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
