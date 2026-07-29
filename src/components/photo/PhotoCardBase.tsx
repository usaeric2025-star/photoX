import React, { Ref, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { cn } from '#lib/utils.js';
import { PhotoListItem } from '#src/types/api.js';
import { useIsManagement, usePermission } from '#src/hooks/index.js';
import { Image } from '#src/components/ui/Image.js';
import { getPhotoThumb } from '#src/lib/image/thumbnailConfig.js';
import { getLocalizedDisplay } from '#src/utils/display.js';
import { useDescLang, tasksAtom } from '#lib/store/index.js';
import { LocalErrorBoundary } from '#src/components/ui/feedback/LocalErrorBoundary.js';

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
  const descLang = useDescLang();
  const tasksMap = useAtomValue(tasksAtom);

  const isAnalyzing = useMemo(() => {
    if ((item as any).isAnalyzing) return true;
    if (!tasksMap || tasksMap.size === 0) return false;
    for (const task of tasksMap.values()) {
      if (task.type === 'ai-analyze' && (task.state?.status === 'processing' || task.state?.status === 'queued')) {
        const photoIds = (task.meta?.photoIds as string[]) || [];
        if (photoIds.length === 0 || photoIds.includes(item.id)) return true;
      }
    }
    return false;
  }, [(item as any).isAnalyzing, item.id, tasksMap]);

  return (
    <LocalErrorBoundary name="PhotoCard">
      <div
        ref={ref}
        data-photo-id={item.id}
        data-selected={isSelected}
        data-multiselect={isMultiSelect}
        onClick={onClick}
        onContextMenu={(e) => {
          // Prevent default context menu so mobile long press works seamlessly
          e.preventDefault();
        }}
        style={{
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'manipulation',
          ...props.style
        }}
        className={cn(
          "aspect-square overflow-hidden cursor-pointer relative group rounded-xl bg-slate-50 border border-slate-100",
          "transition-all duration-300 hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5",
          "active:scale-[0.98]",
          isHidden && "opacity-80 grayscale-[0.3] ring-1 ring-danger",
          isAnalyzing && "opacity-80 grayscale-[0.6] ring-2 ring-purple-500/60 shadow-md animate-pulse",
          isSelected && "ring-2 ring-primary bg-primary/10 shadow-lg",
          className
        )}
        {...props}
      >
        <div className={cn(
          "relative aspect-square w-full h-full overflow-hidden transition-all duration-700 ease-in-out bg-slate-200 flex items-center justify-center",
          isSelected ? "scale-[0.92] rounded-lg" : "scale-100",
        )}>
          <Image
            src={getPhotoThumb(
              item.imageUrl, 
              imgVariant === 'md' ? 'MD' : 'SM', 
              item.imageHash || (item as Record<string, unknown>).image_hash as string | undefined
            )}
            lqipSrc={(item as Record<string, unknown>).lqip as string | undefined}
            alt={getLocalizedDisplay(item.name, descLang)}
            priority={priority}
            className={cn(
              "w-full h-full object-cover object-center transition-transform duration-700 ease-out",
              isHidden && "opacity-60",
              isAnalyzing && "grayscale opacity-75"
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
    </LocalErrorBoundary>
  );
};
