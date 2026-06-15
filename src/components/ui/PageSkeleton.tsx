import React from 'react';
import { PhotoGridSkeleton } from '../photo/PhotoGridSkeleton';
import { useColumns } from '@/hooks';

export function PageSkeleton() {
  const { columns } = useColumns();

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full min-h-screen">
      {/* Header Area styled exactly as PublicHeader/AdminHeader */}
      <div className="flex-shrink-0 bg-white h-14 sm:h-16 w-full px-2.5 sm:px-4 flex items-center justify-between border-b border-slate-200 shadow-sm">
        <div className="w-24 h-8 animate-pulse bg-slate-100 rounded-xl" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse bg-slate-100 rounded-xl" />
          <div className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse bg-slate-100 rounded-xl" />
        </div>
      </div>
      
      {/* Filter Area styled as PublicFilters */}
      <div className="px-3 sm:px-4 py-2 bg-white border-b border-slate-200/50 flex items-center justify-between gap-4">
        <div className="h-9 sm:h-10 w-full max-w-xs sm:max-w-md animate-pulse bg-slate-100 rounded-full" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 animate-pulse bg-slate-100 rounded-full hidden sm:block" />
          <div className="h-9 w-9 animate-pulse bg-slate-100 rounded-full" />
        </div>
      </div>

      {/* Grid area matching VirtualPhotoGrid exact wrapper with zero extra outer padding */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full w-full overflow-y-auto">
          <PhotoGridSkeleton columns={columns} count={12} />
        </div>
      </div>
    </div>
  );
}
