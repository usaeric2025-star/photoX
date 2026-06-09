import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { PhotoGridSkeleton } from '../photo/PhotoGridSkeleton';

export function GroupDetailSkeleton() {
  const [columns, setColumns] = React.useState(3);

  React.useEffect(() => {
    const updateColumns = () => {
      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
      setColumns(isMobile ? 3 : (isTablet ? 4 : 5));
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  return (
    <>
      {/* Header Skeleton */}
      <div className="flex-shrink-0 sticky top-0 z-sticky px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-32 bg-slate-200" />
            <Skeleton className="h-3 w-24 bg-slate-100" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
          <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
        </div>
      </div>

      {/* Series Story Skeleton */}
      <div className="px-5 py-4 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-3 bg-slate-200 rounded-full animate-pulse" />
          <Skeleton className="h-3 w-20 bg-slate-100" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-slate-50" />
          <Skeleton className="h-4 w-5/6 bg-slate-50" />
        </div>
      </div>

      {/* Photo Grid Skeleton */}
      <div className="flex-1 overflow-hidden">
        <PhotoGridSkeleton columns={columns} count={12} />
      </div>
    </>
  );
};
