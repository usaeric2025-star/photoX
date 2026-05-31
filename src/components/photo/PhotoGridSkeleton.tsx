import React from 'react';
import { Skeleton } from '../ui/Skeleton';

interface PhotoGridSkeletonProps {
  columns: number;
  count?: number;
}

export function PhotoGridSkeleton({ columns, count = 12 }: PhotoGridSkeletonProps) {
  return (
    <div 
      className="grid gap-2 sm:gap-4 p-2 sm:p-4"
      style={{ 
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` 
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-[3/4] relative rounded-xl overflow-hidden bg-white/50 border border-slate-100/50">
          <Skeleton className="absolute inset-0 w-full h-full" />
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
            <Skeleton className="h-4 w-3/4 opacity-50" />
            <Skeleton className="h-3 w-1/2 opacity-30" />
          </div>
        </div>
      ))}
    </div>
  );
};
