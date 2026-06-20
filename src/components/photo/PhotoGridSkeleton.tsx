import React from 'react';

interface PhotoGridSkeletonProps {
  columns: number;
  count?: number;
}

export const PhotoGridSkeleton = ({ columns, count = 12 }: PhotoGridSkeletonProps) => {
  return (
    <div className="h-full w-full overflow-hidden no-scrollbar bg-surface-soft">
      <div 
        className={`grid gap-0.5 sm:gap-1 px-2 pt-2 pb-20`} 
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: Math.max(count, 12) }).map((_, i) => (
          <div key={i} className="p-0.5 sm:p-1 h-full w-full">
              <div className="bg-surface-card rounded-[1.25rem] border border-border-soft p-1.5 flex flex-col h-full shadow-sm">
                  <div className="aspect-square rounded-xl bg-surface-soft relative overflow-hidden animate-shimmer" />
                  <div className="mt-2.5 px-1 pb-1 space-y-1.5">
                      <div className="h-3 w-2/3 bg-surface-soft rounded-lg animate-shimmer" />
                      <div className="h-2 w-1/2 bg-surface-mute rounded-lg animate-shimmer" />
                  </div>
              </div>
          </div>
        ))}
      </div>
    </div>
  );
};
