import React from 'react';
import { PhotoGridSkeleton } from './photo/PhotoGridSkeleton';

export function PageSkeleton() {
  return (
    <div className="flex flex-col h-full bg-brand-bg w-full min-h-screen">
      {/* Header Area */}
      <div className="flex-shrink-0 bg-white h-16 w-full px-4 sm:px-6 flex items-center justify-between border-b border-[#E2E8F0] shadow-sm">
        <div className="w-24 h-8 animate-pulse bg-gray-200 rounded-xl" />
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 animate-pulse bg-gray-200 rounded-xl" />
          <div className="w-10 h-10 animate-pulse bg-gray-200 rounded-xl" />
        </div>
      </div>
      
      {/* Filter Area */}
      <div className="px-4 py-3 bg-white border-b border-[#ECECEC] flex items-center gap-4">
        <div className="h-10 w-full max-w-md animate-pulse bg-gray-200 rounded-full" />
        <div className="h-10 w-24 animate-pulse bg-gray-200 rounded-full hidden sm:block" />
      </div>

      {/* Grid area / Waterfall */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse bg-gray-200 rounded-xl flex flex-col justify-end p-3">
              <div className="h-4 bg-gray-300 rounded w-3/4 mb-2 animate-pulse" />
              <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
