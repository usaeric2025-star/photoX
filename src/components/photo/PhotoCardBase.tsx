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
  const isManagement = useIsManagement();
  const isHidden = !!item.isHidden && isManagement;

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
        "aspect-square overflow-hidden cursor-pointer relative transition-all duration-300 group rounded-2xl bg-surface-base shadow-md",
        "active:scale-[0.98]",
        "data-[selected=true]:ring-4 data-[selected=true]:ring-primary data-[selected=true]:scale-[0.96]",
        isHidden && "opacity-80 grayscale-[0.3] ring-2 ring-danger shadow-lg",
        className
      )}
      {...props}
    >
      <div className="relative aspect-square w-full h-full overflow-hidden transition-all duration-500 group-data-[selected=true]:scale-95 group-data-[selected=true]:rounded-xl bg-surface-mute animate-shimmer">
        <img 
          src={(imgVariant === 'md' ? item.imageUrl : (item.thumbnailUrl || item.imageUrl)) || undefined}
          alt={item.name}
          loading="lazy"
          className={cn(
            "w-full h-full object-cover transition-all duration-700 ease-apple group-hover:scale-110 opacity-0",
            isHidden && "opacity-60"
          )}
          onLoad={(e) => {
            (e.target as HTMLImageElement).classList.remove('opacity-0');
            (e.target as HTMLImageElement).classList.add('opacity-100');
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/fallback-image.jpg') {
              target.src = '/fallback-image.jpg';
              target.classList.remove('opacity-0');
              target.classList.add('opacity-100');
            }
          }}
        />
        {/* Apple Style Shine Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-tr from-white/0 via-white/30 to-white/0" />
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
