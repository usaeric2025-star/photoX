import React from 'react';
import { cn } from '@/lib/utils';

interface InfoPanelSkeletonProps {
  className?: string;
}

export function InfoPanelSkeleton({ className }: InfoPanelSkeletonProps) {
  return (
    <div className={cn("flex flex-col h-full bg-white/95 backdrop-blur-md border-l border-slate-200 overflow-y-auto no-scrollbar", className)}>
      {/* Header Skeleton */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 z-10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-slate-100 rounded-md animate-pulse" />
          <div className="w-16 h-4 bg-slate-100 rounded-md animate-pulse" />
        </div>
        <div className="flex gap-1">
          <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
          <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </div>
      {/* Content Skeleton */}
      <div className="p-6 flex flex-col gap-8 pb-32">
        <section className="space-y-3">
          <div className="h-2 w-20 bg-slate-50 rounded-full animate-pulse" />
          <div className="h-8 w-full bg-slate-100 rounded-xl animate-pulse" />
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-slate-50 rounded-lg animate-pulse" />
            <div className="h-6 w-16 bg-slate-50 rounded-lg animate-pulse" />
          </div>
        </section>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-slate-50/50 rounded-xl border border-slate-100 animate-pulse" />
          <div className="h-16 bg-slate-50/50 rounded-xl border border-slate-100 animate-pulse" />
        </div>

        <div className="space-y-4">
           <div className="h-2 w-12 bg-slate-50 rounded-full animate-pulse" />
           <div className="h-24 w-full bg-slate-50/50 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
