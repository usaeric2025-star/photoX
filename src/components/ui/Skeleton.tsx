import React from 'react';

export const Skeleton: React.FC<{ className?: string, children?: React.ReactNode }> = ({ className, children }) => (
  <div className={`animate-pulse bg-brand-navy/10 rounded-md ${className}`}>
    {children}
  </div>
);

export const PhotoCardSkeleton: React.FC = () => (
  <div className="aspect-square w-full animate-pulse bg-brand-navy/5 rounded-xl overflow-hidden relative border border-white/5">
    {/* Image Placeholder */}
    <div className="absolute inset-0 bg-brand-navy/10 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-white/5" />
    </div>
    {/* Text Placeholders */}
    <div className="absolute bottom-0 left-0 w-full p-2 space-y-2 bg-gradient-to-t from-black/20 to-transparent">
      <div className="h-3 w-3/4 bg-white/10 rounded" />
      <div className="flex gap-1">
        <div className="h-2 w-10 bg-white/5 rounded" />
        <div className="h-2 w-10 bg-white/5 rounded" />
      </div>
    </div>
  </div>
);
