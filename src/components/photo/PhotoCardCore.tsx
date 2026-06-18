import React, { Ref } from 'react';
import { cn } from '@/lib/utils';
import { Photo } from '@/types';
import { ResponsivePhoto } from '../shared/ResponsivePhoto';

export interface PhotoCardCoreProps extends React.HTMLAttributes<HTMLDivElement> {
  photo: Photo;
  isSelected?: boolean;
  isMultiSelect?: boolean;
  imgVariant?: 'sm' | 'md';
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: () => void;
  children?: React.ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export const PhotoCardCore = ({
  photo,
  isSelected,
  isMultiSelect,
  imgVariant,
  className,
  onClick,
  onMouseEnter,
  children,
  ref,
  ...props
}: PhotoCardCoreProps) => {
  const is_hidden = !!photo.is_hidden;
  const isCover = photo.is_group_cover || (photo.group_id && photo.group?.cover_photo_id === photo.id);

  return (
    <div
      ref={ref}
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
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "aspect-square overflow-hidden cursor-pointer relative transition-all duration-300 group rounded-xl",
        "before:absolute before:inset-0 before:pointer-events-none before:transition-all before:duration-300",
        "md:hover:scale-[1.02] active:scale-[0.98]",
        "data-[selected=true]:ring-4 data-[selected=true]:ring-blue-500 data-[selected=true]:scale-[0.96]",
        // Only hidden photos get a border/ring as requested
        is_hidden ? "ring-2 ring-rose-500/50 shadow-lg grayscale-[0.3] opacity-80" : "bg-white",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "relative aspect-square w-full h-full transition-all duration-500",
          "group-data-[selected=true]:scale-90 group-data-[selected=true]:rounded-lg overflow-hidden"
        )}
      >
        <ResponsivePhoto
          photo={photo}
          variant={imgVariant || 'sm'}
          aspectRatio={1}
          imgClassName={cn(
            "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110",
            is_hidden && "opacity-60"
          )}
        />
      </div>

      {children}
    </div>
  );
};
