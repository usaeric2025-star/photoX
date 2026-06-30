import React, { Ref } from 'react';
import { cn } from '@/lib/utils';
import { PhotoListItem } from '@/types/api';
import { useIsManagement } from '@/hooks';

export interface PhotoCardBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  item: PhotoListItem;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  imgVariant?: 'sm' | 'md';
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  ref?: Ref<HTMLDivElement>;
}

import { Image } from '@/components/ui/Image';
import { getThumbnailUrl } from '@/services/mappers/utils';

/**
 * PhotoCardBase provides the foundational layout and visual state for a photo card,
 * strictly driven by the PhotoListItem contract.
 */
export const PhotoCardBase = ({
  item,
  isSelected,
  isMultiSelect,
  imgVariant = 'sm',
  className,
  onClick,
  children,
  ref,
  ...props
}: PhotoCardBaseProps) => {
  const isManagement = useIsManagement();
  const isHidden = !!item.isHidden && isManagement;

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    props.onMouseEnter?.(e);
    // Preload the lightbox preview image (800px)
    const hash = item.imageHash || (item as any).image_hash;
    const previewUrl = getThumbnailUrl(item.imageUrl, 800, undefined, hash);
    const img = new window.Image();
    img.src = previewUrl;
  };

  return (
    <div
      ref={ref}
      data-photo-id={item.id}
      data-selected={isSelected}
      data-multiselect={isMultiSelect}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        ...props.style
      }}
      className={cn(
        "aspect-square overflow-hidden cursor-pointer relative transition-all duration-500 group rounded-2xl bg-surface-base shadow-sm",
        "active:scale-[0.98] active:brightness-95",
        isHidden && "opacity-80 grayscale-[0.3] ring-2 ring-danger shadow-lg",
        isSelected && "ring-4 ring-primary bg-primary/10 shadow-lg scale-[0.98]",
        className
      )}
      {...props}
    >
      <div className={cn(
        "relative aspect-square w-full h-full overflow-hidden transition-all duration-700 ease-in-out bg-surface-mute",
        isSelected ? "scale-[0.92] rounded-xl" : "scale-100 rounded-2xl",
      )}>
        <Image
          src={getThumbnailUrl(item.imageUrl, imgVariant === 'md' ? 800 : 400, undefined, item.imageHash || (item as any).image_hash)}
          alt={typeof item.name === 'string' ? item.name : (item.name as any)?.zh || '照片'}
          className={cn(
            "w-full h-full object-cover transition-transform duration-700 ease-out",
            isHidden && "opacity-60"
          )}
        />
        
        {/* Selection overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/20 pointer-events-none rounded-xl" />
        )}
      </div>

      {/* Slots for badges, actions, information */}
      {children}
    </div>
  );
};
