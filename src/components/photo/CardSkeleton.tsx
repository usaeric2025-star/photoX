import React from 'react';

export function CardSkeleton() {
  return (
    <div className="aspect-square w-full bg-surface-soft rounded-[4px] overflow-hidden relative border border-border-soft animate-pulse">
      <div className="absolute bottom-0 left-0 w-full p-3 space-y-2 bg-gradient-to-t from-black/10 to-transparent">
        <div className="h-4 w-3/4 bg-white/10 rounded-full" />
        <div className="flex gap-2">
          <div className="h-2 w-12 bg-white/5 rounded-full" />
          <div className="h-2 w-12 bg-white/5 rounded-full" />
        </div>
      </div>
    </div>
  );
}
