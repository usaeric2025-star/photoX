import React from 'react';

interface PhotoGridSkeletonProps {
  columns: number;
  count?: number;
}

export const PhotoGridSkeleton = ({ columns, count = 6 }: PhotoGridSkeletonProps) => {
  return (
    <div className={`grid gap-2 p-2`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-1 h-full w-full">
            <div className="bg-white rounded-[1.25rem] border border-slate-100 p-1.5 flex flex-col h-full animate-pulse shadow-sm">
                <div className="aspect-square rounded-xl bg-slate-100/80 relative overflow-hidden" />
                <div className="mt-2.5 px-1 pb-1 space-y-1.5">
                    <div className="h-3 w-2/3 bg-slate-100 rounded-lg" />
                    <div className="h-2 w-1/2 bg-slate-50 rounded-lg" />
                </div>
            </div>
        </div>
      ))}
    </div>
  );
};
