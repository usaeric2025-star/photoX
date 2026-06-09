import React from 'react';
import { Skeleton } from '../ui/Skeleton';

interface PhotoGridSkeletonProps {
  columns: number;
  count?: number;
}

export function PhotoGridSkeleton({ columns, count = 12 }: PhotoGridSkeletonProps) {
  return (
    <div 
      className="grid px-2 pt-2 pb-4 w-full"
      style={{ 
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` 
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-1.5 sm:p-2 w-full">
          <div className="aspect-square relative rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm animate-pulse">
            {/* Shimmer effect simulation */}
            <div className="absolute inset-0 bg-slate-100" />
            
            {/* Text details overlay simulating the actual PhotoCard */}
            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
              {/* Category label simulation */}
              <div className="h-3.5 w-1/3 bg-slate-200/80 rounded-full opacity-70 animate-pulse" />
              {/* Tags simulation */}
              <div className="flex gap-1.5">
                <div className="h-2 w-10 bg-slate-200/65 rounded-full opacity-50 animate-pulse" />
                <div className="h-2 w-8 bg-slate-200/65 rounded-full opacity-50 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

