import React from 'react';
import { PhotoGridSkeleton } from './photo/PhotoGridSkeleton';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-brand-bg w-full min-h-screen">
      {/* Header Skeleton */}
      <div className="flex-shrink-0 sticky top-0 z-[100] h-[58px] px-4 sm:px-6 flex items-center justify-between border-b border-[#E2E8F0] bg-white">
        <div className="flex items-center gap-2 sm:gap-4 flex-1">
          <div className="w-20 h-8 rounded-xl bg-slate-100 animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
          <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
        </div>
      </div>
      
      {/* Search Header / Filters Skeleton */}
      <div className="h-16 border-b border-slate-100 bg-white" />

      {/* Grid Skeleton */}
      <div className="flex-1 overflow-hidden h-full p-4">
        <PhotoGridSkeleton columns={3} count={12} />
      </div>
    </div>
  );
};
