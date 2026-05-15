import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/20", className)}
      {...props}
    />
  );
}

export function PhotoCardSkeleton() {
  return (
    <div className="aspect-square bg-white shadow-sm rounded-2xl overflow-hidden relative border border-slate-100">
      <Skeleton className="w-full h-full bg-slate-100" />
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2 bg-white/80 backdrop-blur-sm">
        <Skeleton className="h-4 w-3/4 bg-slate-200" />
        <Skeleton className="h-3 w-1/2 bg-slate-100" />
      </div>
    </div>
  );
}

export function GroupCardSkeleton() {
  return (
    <div className="aspect-square bg-white shadow-md rounded-[2.5rem] overflow-hidden relative border-4 border-white">
      <Skeleton className="w-full h-full bg-slate-100" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
        <Skeleton className="h-6 w-2/3 bg-white/20 mb-2" />
        <Skeleton className="h-4 w-1/2 bg-white/10" />
      </div>
    </div>
  );
}

export function TagSkeleton() {
  return (
    <Skeleton className="h-8 w-20 rounded-full bg-slate-100" />
  );
}

export function PhotoGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <PhotoCardSkeleton key={i} />
      ))}
    </div>
  );
}
