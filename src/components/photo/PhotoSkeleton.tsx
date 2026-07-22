import React from 'react';
import { cn } from '#lib/utils.js';
import { useGrid } from '#src/context/GridContext.js';

interface PhotoSkeletonProps {
  className?: string;
  isGroup?: boolean;
}

export const PhotoSkeleton = ({ className, isGroup }: PhotoSkeletonProps) => {
  return (
    <div className={cn("w-full group/skel", className)}>
      <div className="relative aspect-square w-full">
        {isGroup && (
          <>
            {/* Stack effect mimic for group - Placed BEFORE main content to be BEHIND it without z-index */}
            <div className="absolute -top-[8px] -right-[8px] w-full h-full bg-slate-100/30 rounded-[4px] animate-pulse border border-slate-100/10" />
            <div className="absolute -top-[4px] -right-[4px] w-full h-full bg-slate-200/40 rounded-[4px] animate-pulse border border-slate-200/20" />
          </>
        )}
        <div className={cn(
          "aspect-square w-full rounded-[4px] bg-slate-200 animate-pulse relative overflow-hidden",
          "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent"
        )}>
          {/* Mimic a badge location */}
          <div className="absolute bottom-2 left-2 w-10 h-3.5 bg-slate-300/40 rounded-full" />
          
          {/* Mimic top actions */}
          <div className="absolute top-2 right-2 flex gap-1.5">
            <div className="w-5 h-5 bg-slate-300/40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Info area placeholder */}
      <div className="mt-2 space-y-1.5 px-0.5">
        <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse" />
        <div className="h-2.5 w-1/2 bg-slate-100 rounded animate-pulse" />
      </div>
    </div>
  );
};

export const PhotoGridSkeleton = ({ count = 12, isAggregated = false }: { count?: number; isAggregated?: boolean }) => {
  const { columns } = useGrid();
  
  return (
    <div className="grid gap-3 w-full" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <PhotoSkeleton 
          key={`skeleton-${i}`} 
          isGroup={isAggregated && i % 4 === 0} 
        />
      ))}
    </div>
  );
};
