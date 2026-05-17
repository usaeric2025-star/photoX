import React from 'react';

export const Skeleton: React.FC<{ className?: string, children?: React.ReactNode }> = ({ className, children }) => (
  <div className={`animate-pulse bg-brand-navy/10 rounded-md ${className}`}>
    {children}
  </div>
);

export const PhotoCardSkeleton: React.FC = () => (
  <div className="aspect-[3/4] w-full animate-pulse bg-brand-navy/10 rounded-lg" />
);
