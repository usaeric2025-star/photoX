import React, { Ref } from 'react';
import { cn } from '#lib/utils.js';
import { PhotoListItem } from '#src/types/api.js';
import { useIsManagement } from '#src/hooks/index.js';
import { Image } from '#src/components/ui/Image.js';
import { getPhotoThumb } from '#src/lib/image/thumbnailConfig.js';

export interface PhotoCardBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  item: PhotoListItem;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  imgVariant?: 'sm' | 'md';
  priority?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  ref?: Ref<HTMLDivElement>;
}

const getDisplayString = (val: any) => {
  if (!val) return '照片';
  if (typeof val === 'string') {
    try {
      if (val.startsWith('{') && val.endsWith('}')) {
        const parsed = JSON.parse(val);
        return parsed.zh || parsed.en || parsed.ms || val;
      }
    } catch(e) {}
    return val;
  }
  if (typeof val === 'object') {
    return val.zh || val.en || val.ms || '照片';
  }
  return String(val);
};

/**
 * PhotoCardBase provides the foundational layout and visual state for a photo card,
 * strictly driven by the PhotoListItem contract.
 */
export const PhotoCardBase = ({
  item,
  isSelected,
  isMultiSelect,
  imgVariant = 'sm',
  priority = false,
  className,
  onClick,
  children,
  ref,
  ...props
}: PhotoCardBaseProps) => {
  const isManagement = useIsManagement();
  const isHidden = !!item.isHidden && isManagement;

  return (
    <div
      ref={ref}
      data-photo-id={item.id}
      data-selected={isSelected}
      data-multiselect={isMultiSelect}
      onClick={onClick}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        ...props.style
      }}
      className={cn(
        "aspect-square overflow-hidden cursor-pointer relative group rounded-[4px] bg-surface-base",
        "transition-[filter,background-color,ring] duration-500",
        "active:brightness-95",
        isHidden && "opacity-80 grayscale-[0.3] ring-1 ring-danger inset-ring-1 inset-ring-danger",
        isSelected && "ring-2 ring-primary bg-primary/10 z-10",
        className
      )}
      {...props}
    >
      <div className={cn(
        "relative aspect-square w-full h-full overflow-hidden transition-all duration-700 ease-in-out bg-surface-mute flex items-center justify-center",
        isSelected ? "scale-[0.92] rounded-md" : "scale-100 rounded-[2px]",
      )}>
        <Image
          src={getPhotoThumb(
            item.imageUrl, 
            imgVariant === 'md' ? 'MD' : 'SM', 
            item.imageHash || (item as any).image_hash
          )}
          alt={getDisplayString(item.name)}
          priority={priority}
          className={cn(
            "w-full h-full object-cover object-center transition-transform duration-700 ease-out",
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
