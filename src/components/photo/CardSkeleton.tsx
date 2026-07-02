import React from 'react';
import { cn } from '#lib/utils.js';

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full h-full bg-surface-mute animate-pulse relative overflow-hidden", className)}>
       <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-surface-soft border-t-primary rounded-full animate-spin"></div>
       </div>
    </div>
  );
}
