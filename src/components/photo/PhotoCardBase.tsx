import React, { Ref } from 'react';
import { cn } from '@/lib/utils';
import { PhotoListItem } from '@/types/api';

export interface PhotoCardBaseProps extends React.HTMLAttributes<HTMLDivElement> {
  item: PhotoListItem;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  imgVariant?: 'sm' | 'md';
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: () => void;
  children?: React.ReactNode;
  ref?: Ref<HTMLDivElement>;
}

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
  onMouseEnter,
  children,
  ref,
  ...props
}: PhotoCardBaseProps) => {
  const isHidden = !!item.isHidden;

  return (
    <div
      ref={ref}
      data-photo-id={item.id}
      data-selected={isSelected}
      data-multiselect={isMultiSelect}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        ...props.style
      }}
      className={cn(
        "aspect-square overflow-hidden cursor-pointer relative transition-all duration-300 group rounded-xl bg-white shadow-sm",
        "active:scale-[0.98] md:hover:scale-[1.02]",
        "data-[selected=true]:ring-4 data-[selected=true]:ring-blue-500 data-[selected=true]:scale-[0.96]",
        isHidden && "opacity-80 grayscale-[0.3] ring-2 ring-rose-500/50 shadow-lg",
        className
      )}
      {...props}
    >
      <div className="relative aspect-square w-full h-full overflow-hidden transition-all duration-500 group-data-[selected=true]:scale-90 group-data-[selected=true]:rounded-lg">
        <img 
          src={imgVariant === 'md' ? item.imageUrl : (item.thumbnailUrl || item.imageUrl)}
          alt={item.name}
          loading="lazy"
          className={cn(
            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
            isHidden && "opacity-60"
          )}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/fallback-image.jpg') {
              target.src = '/fallback-image.jpg';
            }
          }}
        />
      </div>

      {/* Slots for badges, actions, information */}
      {children}
      
      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
      )}
    </div>
  );
};
